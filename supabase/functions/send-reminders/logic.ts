// Lógica de envío de recordatorios, sin dependencias de Deno ni de Supabase para poder probarla.
// index.ts le inyecta la base de datos (Store) y el emisor de notificaciones (Send).

export interface Reminder {
  id: string;
  user_id: string;
  key: string;
  fire_at: string;
  title: string;
  body: string;
  url: string;
}
export interface Sub {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface Store {
  /** Marca como enviados (de forma atómica) los avisos vencidos y los devuelve. */
  claimDue(nowIso: string, limit: number): Promise<Reminder[]>;
  subsFor(userIds: string[]): Promise<Sub[]>;
  /** Devuelve a pendiente (para reintentar) los avisos que no se pudieron entregar. */
  release(ids: string[]): Promise<void>;
  deleteSub(endpoint: string): Promise<void>;
  purgeSent(beforeIso: string): Promise<void>;
}

/** Debe lanzar un error con `statusCode` si el servicio de push rechaza el envío. */
export type Send = (sub: Sub, payload: string) => Promise<unknown>;

export interface Stats {
  claimed: number;
  sent: number;
  skippedStale: number; // vencieron hace demasiado: ya no sirven
  noSubscriptions: number;
  released: number; // fallo temporal: se reintenta en la siguiente ejecución
  goneSubscriptions: number; // el dispositivo ya no existe (404/410): se borra
}

const HOUR = 3_600_000;

export async function processDue(
  store: Store,
  send: Send,
  now = new Date(),
  { staleMs = 12 * HOUR, limit = 200, keepSentDays = 7 } = {},
): Promise<Stats> {
  const stats: Stats = { claimed: 0, sent: 0, skippedStale: 0, noSubscriptions: 0, released: 0, goneSubscriptions: 0 };

  // Se "reclaman" primero: así dos ejecuciones que se empalmen no envían el mismo aviso dos veces
  const due = await store.claimDue(now.toISOString(), limit);
  stats.claimed = due.length;

  const fresh: Reminder[] = [];
  for (const r of due) {
    if (now.getTime() - new Date(r.fire_at).getTime() > staleMs) stats.skippedStale++;
    else fresh.push(r);
  }

  const subs = fresh.length ? await store.subsFor([...new Set(fresh.map((r) => r.user_id))]) : [];
  const byUser = new Map<string, Sub[]>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  const gone = new Set<string>();
  const release: string[] = [];

  for (const r of fresh) {
    const list = (byUser.get(r.user_id) ?? []).filter((s) => !gone.has(s.endpoint));
    if (!list.length) {
      stats.noSubscriptions++;
      continue;
    }
    const payload = JSON.stringify({ title: r.title, body: r.body, url: r.url, tag: r.key });
    const results = await Promise.allSettled(list.map((s) => send(s, payload)));

    let ok = 0;
    let transient = 0;
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') ok++;
      else {
        const code = (res.reason as { statusCode?: number } | undefined)?.statusCode;
        if (code === 404 || code === 410) {
          gone.add(list[i].endpoint);
          stats.goneSubscriptions++;
        } else transient++;
      }
    });

    if (ok > 0) stats.sent++;
    else if (transient > 0) {
      release.push(r.id);
      stats.released++;
    } else stats.noSubscriptions++; // todos los dispositivos ya no existen
  }

  await Promise.all([...gone].map((e) => store.deleteSub(e)));
  if (release.length) await store.release(release);
  await store.purgeSent(new Date(now.getTime() - keepSentDays * 24 * HOUR).toISOString());
  return stats;
}

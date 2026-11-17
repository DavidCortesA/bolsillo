// Notificaciones push: suscripción del dispositivo y avisos programados en Supabase.
//
// Flujo: el cliente calcula qué avisos tocan (reminders.ts) y los guarda en la tabla `reminders`;
// una función de Supabase, llamada cada pocos minutos por pg_cron, envía los que ya vencieron
// (supabase/functions/send-reminders). Así la lógica de fechas vive en un solo lugar.
import { eventsIn } from '@/lib/store';
import { addDays, todayS, ymd } from '@/lib/dates';
import { CATS } from '@/lib/cats';
import { getSupabase } from '@/lib/supabase';
import { DEFAULT_PUSH_PREFS, buildReminders, type PushPrefs } from '@/lib/reminders';

const PREFS_KEY = 'bolsillo.push';
const ON_KEY = 'bolsillo.push.on';
const HORIZON = 45;

export const vapidKey: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const readPushPrefs = (): PushPrefs => {
  try {
    return { ...DEFAULT_PUSH_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return DEFAULT_PUSH_PREFS;
  }
};
export const writePushPrefs = (p: PushPrefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
};

/** ¿El usuario activó las notificaciones en este dispositivo? */
export const isPushOn = () => {
  try {
    return localStorage.getItem(ON_KEY) === '1';
  } catch {
    return false;
  }
};
const setPushOn = (on: boolean) => {
  try {
    if (on) localStorage.setItem(ON_KEY, '1');
    else localStorage.removeItem(ON_KEY);
  } catch {}
};

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
export const notificationPermission = () => (typeof Notification === 'undefined' ? 'denied' : Notification.permission);

function urlBase64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function session() {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session ? { sb, uid: data.session.user.id } : null;
}

/** Vuelve a calcular los avisos de los próximos días y deja en la nube justo esos (sube los nuevos, quita los que ya no aplican). */
export async function refreshReminders(sb?: any, uid?: string) {
  if (!sb || !uid) {
    const s = await session();
    if (!s) return;
    ({ sb, uid } = s);
  }
  const events = eventsIn(todayS(), ymd(addDays(new Date(), HORIZON + 1))).map((e: any) => ({
    key: e.key, kind: e.kind, name: e.name, amount: e.amount, date: e.date, paid: !!e.paid, auto: !!e.auto,
    payout: !!e.payout, n: e.n, total: e.total, catLabel: (CATS[e.cat] || CATS.otro).label,
  }));
  const rows = buildReminders(events, readPushPrefs(), new Date(), HORIZON);

  if (rows.length) {
    const { error } = await sb.from('reminders').upsert(rows.map((r) => ({ ...r, user_id: uid })), { onConflict: 'user_id,key' });
    if (error) throw error;
  }

  // Avisos pendientes que ya no corresponden (se pagó, se borró, cambió la fecha o la hora)
  const { data: pending, error: e2 } = await sb.from('reminders').select('key').eq('user_id', uid).is('sent_at', null);
  if (e2) throw e2;
  const keep = new Set(rows.map((r) => r.key));
  const stale = (pending || []).map((r: any) => r.key).filter((k: string) => !keep.has(k));
  for (let i = 0; i < stale.length; i += 100) {
    const { error: e3 } = await sb.from('reminders').delete().eq('user_id', uid).is('sent_at', null).in('key', stale.slice(i, i + 100));
    if (e3) throw e3;
  }
}

export type EnableResult = { ok: true } | { ok: false; reason: 'unsupported' | 'no-key' | 'no-session' | 'denied' | 'error'; message?: string };

export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  if (!vapidKey) return { ok: false, reason: 'no-key' };
  const s = await session();
  if (!s) return { ok: false, reason: 'no-session' };
  try {
    if ((await Notification.requestPermission()) !== 'granted') return { ok: false, reason: 'denied' };
    const reg = await navigator.serviceWorker.ready;
    const key = urlBase64ToUint8Array(vapidKey);
    let sub = await reg.pushManager.getSubscription();
    try {
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    } catch {
      // Suscripción vieja con otra clave: se descarta y se crea de nuevo
      await sub?.unsubscribe();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    }
    const j = sub.toJSON();
    const { error } = await s.sb.from('push_subscriptions').upsert(
      { user_id: s.uid, endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, user_agent: navigator.userAgent.slice(0, 200) },
      { onConflict: 'endpoint' },
    );
    if (error) throw error;
    setPushOn(true);
    await refreshReminders(s.sb, s.uid);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: 'error', message: e?.message || String(e) };
  }
}

export async function disablePush() {
  setPushOn(false);
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    const s = await session();
    if (s) {
      if (sub) await s.sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await s.sb.from('reminders').delete().eq('user_id', s.uid).is('sent_at', null);
    }
    await sub?.unsubscribe();
  } catch (e) {
    console.warn('No se pudo desactivar del todo', e);
  }
}

/** ¿Este dispositivo sigue suscrito de verdad (el navegador pudo haber revocado el permiso)? */
export async function hasLiveSubscription() {
  if (!pushSupported() || notificationPermission() !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

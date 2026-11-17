// Calcula qué notificaciones push deben salir y cuándo. Puro: sin red ni almacenamiento.
import { money } from './fmt.js';

export interface PushPrefs {
  leads: number[]; // días de anticipación (0 = el mismo día)
  hour: string; // 'HH:MM' en la hora local del dispositivo
  incomes: boolean; // avisar también de ingresos
}
export const DEFAULT_PUSH_PREFS: PushPrefs = { leads: [1, 0], hour: '09:00', incomes: false };

export interface ReminderEvent {
  key: string;
  kind: 'pago' | 'ingreso';
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD (ya recorrida a día hábil si aplica)
  paid?: boolean;
  auto?: boolean; // cargo automático: "se cobra" en vez de "vence"
  payout?: boolean;
  catLabel?: string;
  n?: number;
  total?: number | null;
}

export interface ReminderRow {
  key: string; // único por usuario: evento + anticipación
  fire_at: string; // ISO UTC
  title: string;
  body: string;
  url: string;
}

const when = (lead: number) => (lead === 0 ? 'Hoy' : lead === 1 ? 'Mañana' : `En ${lead} días`);

export function buildReminders(events: ReminderEvent[], prefs: PushPrefs, now = new Date(), horizonDays = 45): ReminderRow[] {
  const leads = [...new Set(prefs.leads)].filter((l) => Number.isInteger(l) && l >= 0 && l <= 14).sort((a, b) => a - b);
  const [hh, mm] = (prefs.hour || '09:00').split(':').map(Number);
  const limit = new Date(now.getTime() + horizonDays * 864e5);
  const rows: ReminderRow[] = [];

  for (const e of events) {
    if (e.kind === 'pago' ? e.paid : !prefs.incomes) continue; // lo ya pagado no avisa; ingresos solo si se pidió
    const ing = e.kind === 'ingreso';
    const cuota = e.total ? ` (${e.n} de ${e.total})` : '';
    const [y, m, d] = e.date.split('-').map(Number);
    for (const lead of leads) {
      const fire = new Date(y, m - 1, d - lead, hh, mm);
      if (fire <= now || fire > limit) continue; // ya pasó, o está muy lejos todavía
      const title = ing
        ? e.payout ? `${when(lead)}: ${e.name}` : `${when(lead)} llega: ${e.name}`
        : `${when(lead)} ${e.auto ? 'se cobra' : 'vence'}: ${e.name}`;
      rows.push({
        key: `${e.key}|d${lead}`,
        fire_at: fire.toISOString(),
        title,
        body: [`${money(e.amount)}${cuota}`, e.catLabel].filter(Boolean).join(' · '),
        url: '#/calendario',
      });
    }
  }
  return rows.sort((a, b) => a.fire_at.localeCompare(b.fire_at));
}

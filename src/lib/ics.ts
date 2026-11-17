// Genera un archivo de calendario (.ics, RFC 5545) con los pagos como eventos y avisos (VALARM).
// Sin dependencias del resto de la app para poder probarlo aparte.
import { shiftNote } from './holidays.js';
import { money } from './fmt.js';

export interface IcsEvent {
  key: string; // único por ocurrencia: sirve de UID para que reimportar no duplique
  kind: 'pago' | 'ingreso';
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD (ya recorrida a día hábil si aplica)
  nominal?: string;
  n?: number;
  total?: number | null;
  catLabel: string;
  payout?: boolean;
}

export interface IcsOptions {
  hour: string; // 'HH:MM'
  leads: number[]; // días de anticipación de los avisos (0 = el mismo día)
  minutes?: number; // duración del evento
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Escapa texto según RFC 5545. */
const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Dobla líneas a 75 octetos (UTF-8), con continuación iniciada por un espacio. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

/** Hora local "flotante" (sin zona): el calendario la interpreta en la zona del dispositivo. */
function local(date: string, hour: string, plusMin = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = hour.split(':').map(Number);
  const t = new Date(y, m - 1, d, hh, mm + plusMin);
  return `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
}

const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const leadText = (lead: number, ing: boolean) =>
  ing
    ? lead === 0 ? 'Hoy' : lead === 1 ? 'Mañana' : `En ${lead} días`
    : lead === 0 ? 'Hoy vence' : lead === 1 ? 'Mañana vence' : `En ${lead} días vence`;

export function buildIcs(events: IcsEvent[], opts: IcsOptions, now = new Date()): string {
  const minutes = opts.minutes ?? 30;
  const leads = [...new Set(opts.leads)].sort((a, b) => a - b);
  const L: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bolsillo//Recordatorios de pago//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Bolsillo',
    'X-WR-TIMEZONE:America/Mexico_City',
  ];

  for (const e of events) {
    const ing = e.kind === 'ingreso';
    const title = ing ? (e.payout ? e.name : `Cobro: ${e.name}`) : `Pagar: ${e.name}`;
    const cuota = e.total ? ` (${e.n}/${e.total})` : '';
    const desc = [
      `${ing ? 'Ingreso' : 'Pago'}: ${money(e.amount)}${cuota}`,
      e.catLabel,
      shiftNote(e.nominal, e.date),
      ing ? null : 'Márcalo como pagado en Bolsillo.',
    ].filter(Boolean).join('\n');

    L.push(
      'BEGIN:VEVENT',
      `UID:${e.key.replace(/[^A-Za-z0-9|-]/g, '')}@bolsillo`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${local(e.date, opts.hour)}`,
      `DTEND:${local(e.date, opts.hour, minutes)}`,
      `SUMMARY:${esc(`${title} · ${money(e.amount)}${cuota}`)}`,
      `DESCRIPTION:${esc(desc)}`,
      `CATEGORIES:${esc(e.catLabel)}`,
      'TRANSP:TRANSPARENT', // no bloquea tu agenda
    );
    for (const lead of leads) {
      L.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(`${leadText(lead, ing)}: ${e.name} · ${money(e.amount)}`)}`,
        lead === 0 ? 'TRIGGER:PT0S' : `TRIGGER:-P${lead}D`,
        'END:VALARM',
      );
    }
    L.push('END:VEVENT');
  }

  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

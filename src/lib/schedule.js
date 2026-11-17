// Genera las fechas de pago de una deuda o ingreso según su frecuencia.
import { ymd, parseD, addDays, dim, mk } from './dates.js';
import { prevBusinessDay } from './holidays.js';

export const FREQ = {
  unico: 'Una sola vez',
  mensual: 'Mensual',
  quincenal: 'Quincenal',
  cada14: 'Cada 14 días',
  anual: 'Anual',
};

// 31 = fin de mes (se ajusta al último día real de cada mes)
export const QDAYS = { '15-fin': [15, 31], '1-16': [1, 16], '5-20': [5, 20], '10-25': [10, 25] };
export const QLABEL = { '15-fin': '15 y fin de mes', '1-16': '1 y 16', '5-20': '5 y 20', '10-25': '10 y 25' };

export const isFinite_ = (it) => it.count > 0 || !!it.end_date || it.freq === 'unico';

/**
 * ¿Se recorre al día hábil anterior si cae en fin de semana o festivo?
 * Si no se ha elegido, aplica a lo quincenal (la quincena se paga el día hábil anterior).
 */
export const shiftOf = (it) => it.shift_biz ?? it.freq === 'quincenal';

/**
 * Ocurrencias desde start_date hasta `toS` (inclusive): { date, nominal }.
 * `nominal` es la fecha teórica (p. ej. domingo 15); `date` es cuando realmente cae
 * (viernes 13 si se recorre). Respeta `count` (nº de pagos) y `end_date`.
 */
export function genOccurrences(it, toS) {
  const start = parseD(it.start_date);
  const limit = parseD(toS);
  const endD = it.end_date ? parseD(it.end_date) : null;
  const max = it.count > 0 ? it.count : Infinity;
  const shift = shiftOf(it);
  const out = [];
  let guard = 0;

  // true = seguir; false = detener
  const step = (d) => {
    if (d < start) return true;
    const nominal = ymd(d);
    const date = shift ? prevBusinessDay(nominal) : nominal;
    const ad = parseD(date);
    if (ad > limit || (endD && ad > endD) || out.length >= max) return false;
    out.push({ date, nominal });
    return true;
  };

  const y0 = start.getFullYear();
  const m0 = start.getMonth();

  switch (it.freq) {
    case 'unico':
      step(start);
      break;
    case 'cada14':
      for (let d = start; guard++ < 5000; d = addDays(d, 14)) if (!step(d)) break;
      break;
    case 'mensual': {
      const day = start.getDate();
      for (let k = 0; guard++ < 3000; k++) {
        const y = y0 + Math.floor((m0 + k) / 12);
        const m = (m0 + k) % 12;
        if (!step(mk(y, m, Math.min(day, dim(y, m))))) break;
      }
      break;
    }
    case 'quincenal': {
      const days = QDAYS[it.qdays] || QDAYS['15-fin'];
      outer: for (let k = 0; guard++ < 3000; k++) {
        const y = y0 + Math.floor((m0 + k) / 12);
        const m = (m0 + k) % 12;
        for (const dd of days) if (!step(mk(y, m, Math.min(dd, dim(y, m))))) break outer;
      }
      break;
    }
    case 'anual':
      for (let k = 0; guard++ < 300; k++) {
        const y = y0 + k;
        if (!step(mk(y, m0, Math.min(start.getDate(), dim(y, m0))))) break;
      }
      break;
  }
  return out;
}

/** Solo las fechas reales de pago (ya recorridas si aplica). */
export function genDates(it, toS) {
  return genOccurrences(it, toS).map((o) => o.date);
}

export function freqText(it) {
  switch (it.freq) {
    case 'quincenal': return `Quincenal · ${QLABEL[it.qdays] || QLABEL['15-fin']}`;
    case 'mensual': return `Mensual · día ${parseD(it.start_date).getDate()}`;
    case 'cada14': return 'Cada 14 días';
    case 'anual': return 'Anual';
    default: return 'Una sola vez';
  }
}

/** Factor para estimar cuánto es al mes */
export const MONTHLY_FACTOR = { unico: 0, mensual: 1, quincenal: 2, cada14: 26 / 12, anual: 1 / 12 };

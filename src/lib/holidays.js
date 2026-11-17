// Días inhábiles de México (calendario bancario) y recorrido al día hábil anterior.
import { ymd, mk, parseD, addDays, DIAS } from './dates.js';

const cache = new Map();

/** Día del mes del n-ésimo `weekday` (0 = domingo) de un mes (m: 0-11). */
function nthWeekday(y, m, weekday, n) {
  const first = mk(y, m, 1).getDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return mk(y, month - 1, day);
}

/** Mapa fecha → nombre del día festivo para un año. */
export function holidaysOf(y) {
  if (cache.has(y)) return cache.get(y);
  const h = new Map();
  const add = (d, name) => h.set(ymd(d), name);
  add(mk(y, 0, 1), 'Año Nuevo');
  add(mk(y, 1, nthWeekday(y, 1, 1, 1)), 'Día de la Constitución');
  add(mk(y, 2, nthWeekday(y, 2, 1, 3)), 'Natalicio de Benito Juárez');
  const pascua = easter(y);
  add(addDays(pascua, -3), 'Jueves Santo');
  add(addDays(pascua, -2), 'Viernes Santo');
  add(mk(y, 4, 1), 'Día del Trabajo');
  add(mk(y, 8, 16), 'Día de la Independencia');
  if (y >= 2024 && (y - 2024) % 6 === 0) add(mk(y, 9, 1), 'Transmisión del Poder Ejecutivo');
  add(mk(y, 10, 2), 'Día de Muertos');
  add(mk(y, 10, nthWeekday(y, 10, 1, 3)), 'Día de la Revolución');
  add(mk(y, 11, 12), 'Día de la Virgen de Guadalupe');
  add(mk(y, 11, 25), 'Navidad');
  cache.set(y, h);
  return h;
}

/** null si es día hábil; si no, el motivo: 'sábado', 'domingo' o el nombre del festivo. */
export function nonBusinessReason(s) {
  const d = parseD(s);
  const dow = d.getDay();
  if (dow === 0) return 'domingo';
  if (dow === 6) return 'sábado';
  return holidaysOf(d.getFullYear()).get(s) || null;
}

export const isBusinessDay = (s) => nonBusinessReason(s) === null;

/** Día hábil anterior (o el mismo día si ya es hábil). Fin de semana → viernes. */
export function prevBusinessDay(s) {
  let d = parseD(s);
  for (let i = 0; i < 14 && !isBusinessDay(ymd(d)); i++) d = addDays(d, -1);
  return ymd(d);
}

/** "Cae en domingo 15 nov → se recorre al vie 13 nov" (null si no se recorrió). */
export function shiftNote(nominal, date) {
  if (!nominal || nominal === date) return null;
  const r = nonBusinessReason(nominal);
  const dd = parseD(date);
  const dia = DIAS[dd.getDay()].slice(0, 3);
  const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const n = parseD(nominal);
  const why = r === 'sábado' || r === 'domingo' ? `en ${r}` : `en festivo (${r})`;
  return `Cae ${why} ${n.getDate()} ${mes[n.getMonth()]} → se recorre al ${dia} ${dd.getDate()} ${mes[dd.getMonth()]}`;
}

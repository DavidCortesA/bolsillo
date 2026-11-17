// Fechas locales como 'YYYY-MM-DD' (sin zonas horarias; se fija el mediodía para evitar saltos de DST).

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseD = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const mk = (y, m, d) => new Date(y, m, d, 12);
export const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
export const dim = (y, m) => new Date(y, m + 1, 0).getDate(); // días del mes (m: 0-11)
export const todayS = () => ymd(new Date());
export const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtShort = (s) => {
  const d = parseD(s);
  return `${d.getDate()} ${MESES_C[d.getMonth()]}`;
};
export const fmtFull = (s) => {
  const d = parseD(s);
  return `${DIAS_C[d.getDay()]} ${d.getDate()} ${MESES_C[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtLong = (s) => {
  const d = parseD(s);
  return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

/** "hoy", "mañana", "en 5 días", "hace 2 días" */
export function relDay(s) {
  const n = diffDays(todayS(), s);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  return n > 0 ? `en ${n} días` : `hace ${-n} días`;
}

// ---- Periodos (quincena / mes / año) --------------------------------------
export function periodInfo(mode, anchor) {
  const y = anchor.getFullYear(), m = anchor.getMonth(), d = anchor.getDate(), last = dim(y, m);
  if (mode === 'quincena') {
    return d <= 15
      ? { from: ymd(mk(y, m, 1)), to: ymd(mk(y, m, 15)), label: `1.ª quincena · ${MESES_C[m]} ${y}` }
      : { from: ymd(mk(y, m, 16)), to: ymd(mk(y, m, last)), label: `2.ª quincena · ${MESES_C[m]} ${y}` };
  }
  if (mode === 'mes') return { from: ymd(mk(y, m, 1)), to: ymd(mk(y, m, last)), label: `${cap(MESES[m])} ${y}` };
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
}

export function shiftAnchor(mode, a, dir) {
  const y = a.getFullYear(), m = a.getMonth(), d = a.getDate();
  if (mode === 'anio') return mk(y + dir, 0, 1);
  if (mode === 'mes') return mk(y, m + dir, 1);
  if (d <= 15) return dir > 0 ? mk(y, m, 16) : mk(y, m - 1, 16);
  return dir > 0 ? mk(y, m + 1, 1) : mk(y, m, 1);
}

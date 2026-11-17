// Estado de la app. Local primero (localStorage) y sincronizado con Supabase en segundo plano.
import { genDates, genOccurrences, isFinite_ } from './schedule.js';
import { ymd, addDays, todayS, mk } from './dates.js';
import { uid } from './fmt.js';

const KEY = 'bolsillo.v1';
const empty = () => ({ debts: [], incomes: [], marks: {}, balance: null, sample: false, meta: {} });
const nowIso = () => new Date().toISOString();

export let S = empty();

const listeners = new Set();
let version = 0;
let syncHook = () => {};
export const setSyncHook = (fn) => (syncHook = fn);
/** Para useSyncExternalStore: cambia en cada commit. */
export const getVersion = () => version;
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      S = { ...empty(), ...JSON.parse(raw) };
      return true;
    }
  } catch (e) {
    console.warn('No se pudo leer el almacenamiento local', e);
  }
  return false;
}
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    console.warn('No se pudo guardar localmente', e);
  }
}
/** Guarda, avisa a la interfaz y (opcional) dispara la sincronización. */
export function commit({ sync = true } = {}) {
  save();
  version++;
  listeners.forEach((f) => f());
  if (sync) syncHook();
}
export function replaceAll(data) {
  S = { ...empty(), ...data };
  commit();
}
export function resetAll() {
  S = empty();
  commit({ sync: false });
}

// ---- Acceso (ocultando los borrados lógicos) -------------------------------
export const debts = () => S.debts.filter((d) => !d.deleted_at);
export const incomes = () => S.incomes.filter((d) => !d.deleted_at);

// ---- Altas, cambios y bajas -------------------------------------------------
export function saveItem(table, item) {
  const arr = S[table];
  item.updated_at = nowIso();
  item.created_at ||= item.updated_at;
  item.deleted_at ??= null;
  const i = arr.findIndex((x) => x.id === item.id);
  if (i < 0) arr.push(item);
  else arr[i] = item;
  commit();
}
export function deleteItem(table, id) {
  const it = S[table].find((x) => x.id === id);
  if (!it) return;
  it.deleted_at = it.updated_at = nowIso();
  commit();
}
export function setMark(key, paid) {
  S.marks[key] = { paid, t: nowIso() };
  commit();
}

/** Saldo capturado: cuánto había en `as_of`; `threshold` = avisar si baja de ese monto. */
export function setBalance({ amount, as_of, threshold }) {
  S.balance = { amount: +amount, as_of, threshold: +threshold || 0, updated_at: nowIso() };
  commit();
}

// ---- Estado de pago ---------------------------------------------------------
export function isPaid(it, key, date) {
  const m = S.marks[key];
  if (m) return m.paid;
  return !!(it.paid_until && date <= it.paid_until);
}

/** Fecha hasta la que ya está pagado: las primeras `doneN` fechas, o todas las anteriores a hoy si va vacío. */
export function computePaidUntil(it, doneN) {
  if (doneN !== '' && doneN != null && !Number.isNaN(+doneN)) {
    const ds = genDates(it, isFinite_(it) ? '2200-12-31' : ymd(addDays(new Date(), 800)));
    const n = Math.min(Math.max(+doneN, 0), ds.length);
    return n > 0 ? ds[n - 1] : null;
  }
  const ds = genDates(it, ymd(addDays(new Date(), -1)));
  return ds.length ? ds[ds.length - 1] : null;
}

// ---- Eventos (cada ocurrencia de un pago o ingreso) -------------------------
function mkEvents(it, kind, to) {
  return genOccurrences(it, to).map(({ date, nominal }, i) => ({
    key: `${it.id}|${date}`,
    kind,
    itemId: it.id,
    name: it.name,
    cat: kind === 'ingreso' ? 'ingreso' : it.cat,
    type: it.type,
    amount: +it.amount,
    date,
    nominal, // fecha teórica; distinta de `date` si se recorrió por fin de semana o festivo
    n: i + 1,
    total: it.count > 0 ? it.count : null,
  }));
}

export function eventsIn(from, to) {
  const t = todayS();
  const evs = [];
  for (const p of debts()) {
    for (const e of mkEvents(p, 'pago', to)) {
      if (e.date < from) continue;
      e.paid = isPaid(p, e.key, e.date);
      evs.push(e);
    }
    if (p.payout_date && +p.payout_amount > 0 && p.payout_date >= from && p.payout_date <= to) {
      evs.push({
        key: `${p.id}|cobro`, kind: 'ingreso', itemId: p.id, name: `Cobro de tanda · ${p.name}`,
        cat: 'tanda', type: 'variable', amount: +p.payout_amount, date: p.payout_date,
        payout: true, received: p.payout_date <= t,
      });
    }
  }
  for (const inc of incomes()) {
    for (const e of mkEvents(inc, 'ingreso', to)) {
      if (e.date < from) continue;
      e.received = e.date <= t;
      evs.push(e);
    }
  }
  evs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === b.kind ? 0 : a.kind === 'ingreso' ? -1 : 1));
  return evs;
}

/** Progreso y próximos pagos de una deuda. */
export function debtStats(it) {
  const fin = isFinite_(it);
  const horizon = fin ? '2200-12-31' : ymd(addDays(new Date(), 400));
  const evs = mkEvents(it, 'pago', horizon).map((e) => ({ ...e, paid: isPaid(it, e.key, e.date) }));
  const pending = evs.filter((e) => !e.paid);
  return {
    fin,
    total: fin ? evs.length : null,
    paidN: evs.filter((e) => e.paid).length,
    next: pending[0] || null,
    remaining: fin ? pending.length : null,
    remainingAmt: fin ? pending.reduce((s, e) => s + e.amount, 0) : null,
  };
}

export function nextIncome(it) {
  const t = todayS();
  return mkEvents(it, 'ingreso', ymd(addDays(new Date(), 400))).find((e) => e.date >= t) || null;
}

// ---- Datos de ejemplo -------------------------------------------------------
export function loadSample() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const d = (mo, day) => ymd(mk(y, mo, day));
  const base = { qdays: '15-fin', count: null, end_date: null, notes: '', payout_date: null, payout_amount: null };
  const stamp = nowIso();
  const mkItem = (o) => {
    const it = { ...base, id: uid(), created_at: stamp, updated_at: stamp, deleted_at: null, ...o };
    it.paid_until = computePaidUntil(it, '');
    return it;
  };
  const tanda = mkItem({ name: 'Tanda del trabajo', cat: 'tanda', amount: 1000, freq: 'quincenal', start_date: d(m, 1), count: 12 });
  const dts = genDates(tanda, '2200-12-31');
  tanda.payout_date = dts[5];
  tanda.payout_amount = 11000;

  S = {
    ...empty(),
    sample: true,
    // saldo de ejemplo bajo a propósito para que se vea cómo avisa un tramo en rojo
    balance: { amount: 1000, as_of: ymd(now), threshold: 0, updated_at: stamp },
    debts: [
      mkItem({ name: 'Kueski · Celular', cat: 'kueski', amount: 850, freq: 'quincenal', start_date: d(m, 1), count: 6 }),
      mkItem({ name: 'Kueski · Ropa', cat: 'kueski', amount: 380, freq: 'quincenal', start_date: d(m, 1), count: 4 }),
      mkItem({ name: 'Tarjeta BBVA', cat: 'tarjeta', amount: 1800, freq: 'mensual', start_date: d(m, 12) }),
      mkItem({ name: 'Tarjeta Nu', cat: 'tarjeta', amount: 1250, freq: 'mensual', start_date: d(m, 22) }),
      mkItem({ name: 'Netflix', cat: 'streaming', amount: 219, freq: 'mensual', start_date: d(m, 5) }),
      mkItem({ name: 'Spotify', cat: 'streaming', amount: 129, freq: 'mensual', start_date: d(m, 9) }),
      mkItem({ name: 'Disney+', cat: 'streaming', amount: 159, freq: 'mensual', start_date: d(m, 20) }),
      tanda,
      mkItem({ name: 'Colegiatura', cat: 'colegiatura', amount: 3800, freq: 'mensual', start_date: d(m, 10), count: 4 }),
      mkItem({ name: 'Inscripción', cat: 'inscripcion', amount: 4500, freq: 'unico', start_date: d(m + 1, 3) }),
    ],
    incomes: [
      mkItem({ name: 'Sueldo', type: 'fijo', cat: undefined, amount: 9800, freq: 'quincenal', start_date: d(m - 1, 1) }),
      mkItem({ name: 'Proyecto freelance', type: 'variable', cat: undefined, amount: 2500, freq: 'unico', start_date: d(m, 20) }),
    ].map(({ cat, paid_until, payout_date, payout_amount, ...rest }) => rest),
  };
  commit({ sync: false });
}

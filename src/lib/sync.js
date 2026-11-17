// Sincronización con Supabase: descarga lo remoto, fusiona por fecha de modificación y sube lo local más nuevo.
import { supabase } from './supabase.js';
import { S, save, commit, setSyncHook } from './store.js';

export const syncState = { status: supabase ? 'off' : 'disabled', email: null, msg: '', last: null };
const subs = new Set();
let syncVersion = 0;
export const getSyncVersion = () => syncVersion;
export const subscribeSync = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
const setState = (p) => {
  Object.assign(syncState, p);
  syncVersion++;
  subs.forEach((f) => f());
};

const DEBT_FIELDS = ['id', 'name', 'cat', 'amount', 'freq', 'qdays', 'start_date', 'count', 'end_date', 'paid_until', 'shift_biz', 'notes', 'payout_date', 'payout_amount', 'created_at', 'updated_at', 'deleted_at'];
const INCOME_FIELDS = ['id', 'name', 'type', 'amount', 'freq', 'qdays', 'start_date', 'count', 'end_date', 'shift_biz', 'notes', 'created_at', 'updated_at', 'deleted_at'];

const pick = (o, fields) => Object.fromEntries(fields.map((f) => [f, o[f] ?? null]));
const ts = (v) => (v ? Date.parse(v) : 0);

let running = false;
let again = false;
let timer;

export function queueSync() {
  if (!supabase || syncState.status === 'off' || syncState.status === 'disabled') return;
  clearTimeout(timer);
  timer = setTimeout(sync, 700);
}
setSyncHook(queueSync);

async function syncList(table, fields, local, userId) {
  const { data: remote, error } = await supabase.from(table).select('*');
  if (error) throw error;
  const rm = new Map(remote.map((r) => [r.id, r]));
  const merged = new Map(local.map((l) => [l.id, l]));
  const push = [];

  for (const r of remote) {
    const l = merged.get(r.id);
    if (!l || ts(r.updated_at) > ts(l.updated_at)) merged.set(r.id, pick(r, fields));
    else if (ts(l.updated_at) > ts(r.updated_at)) push.push(l);
  }
  for (const l of local) if (!rm.has(l.id)) push.push(l);

  if (push.length) {
    const rows = push.map((r) => ({ ...pick(r, fields), user_id: userId }));
    const { error: e2 } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (e2) throw e2;
  }
  local.splice(0, local.length, ...merged.values());
}

/** Una sola fila por usuario; gana la más reciente. Si la tabla aún no existe, no rompe el resto. */
async function syncBalance(userId) {
  const { data, error } = await supabase.from('account_balance').select('amount,as_of,threshold,updated_at').maybeSingle();
  if (error) {
    console.warn('Saldo sin sincronizar (¿falta correr la migración 0003?)', error.message);
    return;
  }
  const l = S.balance;
  if (data && (!l || ts(data.updated_at) > ts(l.updated_at))) {
    S.balance = { amount: +data.amount, as_of: data.as_of, threshold: +data.threshold || 0, updated_at: data.updated_at };
  } else if (l && (!data || ts(l.updated_at) > ts(data.updated_at))) {
    const { error: e2 } = await supabase
      .from('account_balance')
      .upsert({ user_id: userId, amount: l.amount, as_of: l.as_of, threshold: l.threshold || 0, updated_at: l.updated_at }, { onConflict: 'user_id' });
    if (e2) console.warn('No se pudo subir el saldo', e2.message);
  }
}

async function syncMarks(userId) {
  const { data: remote, error } = await supabase.from('payment_marks').select('key,paid,updated_at');
  if (error) throw error;
  const rm = new Map(remote.map((r) => [r.key, r]));
  const push = [];

  for (const r of remote) {
    const l = S.marks[r.key];
    if (!l || ts(r.updated_at) > ts(l.t)) S.marks[r.key] = { paid: r.paid, t: r.updated_at };
    else if (ts(l.t) > ts(r.updated_at)) push.push({ user_id: userId, key: r.key, paid: l.paid, updated_at: l.t });
  }
  for (const [key, l] of Object.entries(S.marks)) {
    if (!rm.has(key)) push.push({ user_id: userId, key, paid: l.paid, updated_at: l.t });
  }
  if (push.length) {
    const { error: e2 } = await supabase.from('payment_marks').upsert(push, { onConflict: 'user_id,key' });
    if (e2) throw e2;
  }
}

export async function sync() {
  if (!supabase) return;
  if (running) {
    again = true;
    return;
  }
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session) {
    setState({ status: 'off', email: null });
    return;
  }
  running = true;
  setState({ status: 'syncing', email: session.user.email, msg: '' });
  try {
    // Los datos de ejemplo nunca se suben: al conectar se descartan.
    if (S.sample) {
      S.debts = [];
      S.incomes = [];
      S.marks = {};
      S.balance = null;
      S.sample = false;
    }
    const uid = session.user.id;
    await syncList('debts', DEBT_FIELDS, S.debts, uid);
    await syncList('incomes', INCOME_FIELDS, S.incomes, uid);
    await syncMarks(uid);
    await syncBalance(uid);
    S.meta.lastSync = new Date().toISOString();
    setState({ status: 'ok', last: S.meta.lastSync });
    commit({ sync: false });
  } catch (e) {
    console.error('Sync falló', e);
    const offline = !navigator.onLine;
    setState({ status: offline ? 'offline' : 'error', msg: e?.message || String(e) });
    save();
  } finally {
    running = false;
    if (again) {
      again = false;
      queueSync();
    }
  }
}

// ---- Cuenta -----------------------------------------------------------------
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await sync();
}
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) return 'confirm'; // el proyecto exige confirmar el correo
  await sync();
  return 'ok';
}
export async function signOut() {
  await supabase.auth.signOut();
  setState({ status: 'off', email: null, msg: '' });
}

export async function initSync() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    setState({ status: 'idle', email: data.session.user.email });
    sync();
  }
  window.addEventListener('online', () => sync());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') sync();
  }, 60_000);
}

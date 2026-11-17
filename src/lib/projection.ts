// Saldo proyectado día por día. Sin dependencias de la app para poder probarlo aparte.
import { parseD, addDays, ymd, periodInfo, fmtShort } from './dates.js';
import { money } from './fmt.js';

export interface ProjEvent {
  date: string;
  kind: 'pago' | 'ingreso';
  name: string;
  amount: number;
  paid?: boolean;
}

export interface BalanceCfg {
  amount: number; // cuánto había en la fecha as_of
  as_of: string; // YYYY-MM-DD
  threshold: number; // avisar si baja de este monto (0 = solo números rojos)
}

export interface Mov { kind: 'pago' | 'ingreso'; name: string; amount: number }
export interface Day { date: string; balance: number; ing: number; pag: number; movs: Mov[] }

export interface Dip {
  from: string; // primer día por debajo del mínimo
  to: string; // último día por debajo
  min: number;
  minDate: string;
  recoversOn: string | null; // primer día que vuelve a estar bien (null = no se recupera en el periodo)
  recoveredBy: string | null; // ingreso que lo rescata
  nextIncome: { date: string; name: string; amount: number } | null; // primer ingreso después de que empieza
}

export interface QRow {
  label: string;
  from: string;
  to: string;
  opening: number;
  ing: number;
  pag: number;
  closing: number;
  min: number;
  minDate: string;
  red: boolean;
  partial: boolean; // quincena ya empezada (o cortada por el periodo)
}

export interface Projection {
  cfg: BalanceCfg;
  end: string;
  days: Day[];
  startBalance: number;
  endBalance: number;
  min: { date: string; balance: number };
  dips: Dip[];
  quincenas: QRow[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reglas sobre lo que ya está en el saldo capturado:
 *  - Lo anterior a `as_of` ya está reflejado: se ignora.
 *  - El día `as_of`: solo cuentan los pagos aún sin marcar; los ingresos de ese día ya entraron.
 *  - Después de `as_of`: cuenta todo (aunque lo marques pagado antes de tiempo, el saldo capturado no lo tenía descontado).
 */
export function project(events: ProjEvent[], cfg: BalanceCfg, endIn: string): Projection {
  const end = endIn < cfg.as_of ? cfg.as_of : endIn;
  const t = cfg.threshold || 0;

  const byDate = new Map<string, ProjEvent[]>();
  for (const e of events) {
    if (e.date < cfg.as_of || e.date > end) continue;
    if (e.date === cfg.as_of && (e.kind === 'ingreso' || e.paid)) continue;
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }

  // Saldo día por día
  const days: Day[] = [];
  let bal = cfg.amount;
  for (let d = parseD(cfg.as_of); ymd(d) <= end; d = addDays(d, 1)) {
    const date = ymd(d);
    const movs = byDate.get(date) ?? [];
    let ing = 0;
    let pag = 0;
    for (const m of movs) {
      if (m.kind === 'ingreso') ing += m.amount;
      else pag += m.amount;
    }
    bal = r2(bal + ing - pag);
    days.push({ date, balance: bal, ing: r2(ing), pag: r2(pag), movs: movs.map(({ kind, name, amount }) => ({ kind, name, amount })) });
  }

  // Punto más bajo
  let min = { date: days[0].date, balance: days[0].balance };
  for (const d of days) if (d.balance < min.balance) min = { date: d.date, balance: d.balance };

  // Tramos por debajo del mínimo
  const firstIncomeAfter = (date: string) => {
    for (const d of days) {
      if (d.date <= date) continue;
      const m = d.movs.find((x) => x.kind === 'ingreso');
      if (m) return { date: d.date, name: m.name, amount: m.amount };
    }
    return null;
  };
  const dips: Dip[] = [];
  for (let i = 0; i < days.length; i++) {
    if (days[i].balance >= t) continue;
    let j = i;
    let lo = days[i];
    while (j + 1 < days.length && days[j + 1].balance < t) {
      j++;
      if (days[j].balance < lo.balance) lo = days[j];
    }
    const rec = j + 1 < days.length ? days[j + 1] : null;
    dips.push({
      from: days[i].date,
      to: days[j].date,
      min: lo.balance,
      minDate: lo.date,
      recoversOn: rec?.date ?? null,
      recoveredBy: rec?.movs.find((m) => m.kind === 'ingreso')?.name ?? null,
      nextIncome: firstIncomeAfter(days[i].date),
    });
    i = j;
  }

  // Resumen por quincena
  const quincenas: QRow[] = [];
  const idx = new Map(days.map((d, i) => [d.date, i]));
  for (let cur = parseD(cfg.as_of); ymd(cur) <= end; ) {
    const info = periodInfo('quincena', cur);
    const from = info.from < cfg.as_of ? cfg.as_of : info.from;
    const to = info.to > end ? end : info.to;
    const i0 = idx.get(from)!;
    const i1 = idx.get(to)!;
    const slice = days.slice(i0, i1 + 1);
    let lo = slice[0];
    let ing = 0;
    let pag = 0;
    for (const d of slice) {
      ing += d.ing;
      pag += d.pag;
      if (d.balance < lo.balance) lo = d;
    }
    quincenas.push({
      label: info.label,
      from,
      to,
      opening: i0 === 0 ? cfg.amount : days[i0 - 1].balance,
      ing: r2(ing),
      pag: r2(pag),
      closing: days[i1].balance,
      min: lo.balance,
      minDate: lo.date,
      red: lo.balance < t,
      partial: from !== info.from || to !== info.to,
    });
    cur = addDays(parseD(info.to), 1);
  }

  return { cfg: { ...cfg, threshold: t }, end, days, startBalance: cfg.amount, endBalance: days[days.length - 1].balance, min, dips, quincenas };
}

/** Texto de aviso: "El 12 dic tu saldo baja a -$787.00 …" */
export function dipText(d: Dip, threshold = 0): string {
  const lim = threshold > 0 ? `de ${money(threshold)}` : 'de cero';
  const single = d.from === d.to;
  const cuando = !d.recoversOn
    ? `Desde el ${fmtShort(d.from)}`
    : single ? `El ${fmtShort(d.from)}` : `Del ${fmtShort(d.from)} al ${fmtShort(d.to)}`;
  const baja = d.min < 0 ? `tu saldo queda en rojo` : `tu saldo queda por debajo ${lim}`;
  const punto = `(mínimo ${money(d.min)}${d.from === d.minDate && d.from === d.to ? '' : ` el ${fmtShort(d.minDate)}`})`;
  let cierre: string;
  if (d.recoversOn) {
    cierre = d.recoveredBy
      ? `Se recupera el ${fmtShort(d.recoversOn)} cuando entra ${d.recoveredBy}.`
      : `Se recupera el ${fmtShort(d.recoversOn)}.`;
  } else if (d.nextIncome) {
    cierre = `Tu siguiente ingreso (${d.nextIncome.name}, ${fmtShort(d.nextIncome.date)}) no alcanza a cubrirlo dentro del periodo.`;
  } else {
    cierre = 'No hay ingresos registrados que lo cubran dentro del periodo.';
  }
  return `${cuando} ${baja} ${punto}. ${cierre}`;
}

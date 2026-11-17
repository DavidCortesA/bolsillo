import { debts, debtStats, eventsIn, incomes } from '@/lib/store';
import { freqText } from '@/lib/schedule';
import { CATS } from '@/lib/cats';
import { toCsv, type Cell } from '@/lib/csv';

const catLabel = (k: string) => (CATS[k] || CATS.otro).label;

/** Cada pago e ingreso del rango, uno por fila. */
export function movementsCsv(from: string, to: string): { csv: string; count: number } {
  const evs = eventsIn(from, to);
  const rows: Cell[][] = [['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Cuota', 'Monto', 'Importe', 'Estado', 'Fecha original', 'Cargo automático']];
  for (const e of evs as any[]) {
    const ing = e.kind === 'ingreso';
    rows.push([
      e.date,
      ing ? 'Ingreso' : 'Pago',
      e.name,
      catLabel(e.cat),
      // "2 de 6" y no "2/6": Excel lo leería como la fecha 2 de junio
      e.total ? `${e.n} de ${e.total}` : '',
      e.amount,
      ing ? e.amount : -e.amount, // con signo, para sumar y obtener el balance
      ing ? (e.received ? 'Recibido' : 'Por recibir') : e.paid ? 'Pagado' : 'Pendiente',
      e.nominal && e.nominal !== e.date ? e.nominal : '',
      ing ? '' : e.auto ? 'Sí' : 'No',
    ]);
  }
  return { csv: toCsv(rows), count: evs.length };
}

/** Las deudas y los ingresos registrados, con su progreso. */
export function catalogCsv(): { csv: string; count: number } {
  const rows: Cell[][] = [[
    'Tipo', 'Nombre', 'Categoría', 'Monto', 'Frecuencia', 'Primer pago', 'Termina', 'Pagos totales', 'Pagados', 'Restantes', 'Por pagar', 'Próximo pago', 'Cargo automático', 'Notas',
  ]];
  for (const p of debts() as any[]) {
    const st = debtStats(p);
    rows.push([
      'Deuda o pago', p.name, catLabel(p.cat), p.amount, freqText(p), p.start_date, p.end_date || '',
      st.total ?? '', st.paidN, st.remaining ?? '', st.remainingAmt ?? '', st.next?.date || '', p.auto_pay ? 'Sí' : 'No', p.notes || '',
    ]);
  }
  for (const i of incomes() as any[]) {
    rows.push([
      i.type === 'variable' ? 'Ingreso variable' : 'Ingreso fijo', i.name, '', i.amount, freqText(i), i.start_date, i.end_date || '',
      i.count || '', '', '', '', '', '', i.notes || '',
    ]);
  }
  return { csv: toCsv(rows), count: rows.length - 1 };
}

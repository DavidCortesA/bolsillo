import { S, eventsIn } from '@/lib/store';
import { addDays, periodInfo, ymd } from '@/lib/dates';
import { project, type Projection } from '@/lib/projection';
import { useStore } from '@/hooks/use-store';

/**
 * Saldo proyectado a `days` días desde hoy, calculado solo con lo que ya está registrado:
 * arranca en cero al inicio de la quincena actual y acumula ingresos menos pagos, como el
 * Balance del Resumen. Un saldo inicial (opcional) se suma desde ese arranque.
 */
export function useProjection(days: number): Projection {
  useStore(); // se recalcula cuando cambian los datos
  const start = periodInfo('quincena', new Date()).from;
  const end = ymd(addDays(new Date(), days));
  const events = eventsIn(start, end).map((e: any) => ({
    date: e.date, kind: e.kind, name: e.name, amount: e.amount, paid: !!e.paid,
  }));
  return project(events, { amount: S.balance?.amount ?? 0, as_of: start, threshold: S.balance?.threshold ?? 0, auto: true }, end);
}

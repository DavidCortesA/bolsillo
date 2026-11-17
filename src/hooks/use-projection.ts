import { S, eventsIn } from '@/lib/store';
import { addDays, ymd } from '@/lib/dates';
import { project, type Projection } from '@/lib/projection';
import { useStore } from '@/hooks/use-store';

/** Saldo proyectado a `days` días desde hoy, o null si aún no se ha capturado el saldo. */
export function useProjection(days: number): Projection | null {
  useStore(); // se recalcula cuando cambian los datos
  const cfg = S.balance;
  if (!cfg) return null;
  const end = ymd(addDays(new Date(), days));
  const events = eventsIn(cfg.as_of, end).map((e: any) => ({
    date: e.date, kind: e.kind, name: e.name, amount: e.amount, paid: !!e.paid,
  }));
  return project(events, cfg, end);
}

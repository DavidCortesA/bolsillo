import { ChevronRight, TriangleAlert } from 'lucide-react';
import { useProjection } from '@/hooks/use-projection';
import { dipText } from '@/lib/projection';

/** Aviso en el Resumen: el primer tramo en rojo de los próximos 2 meses. */
export function BalanceAlert() {
  const p = useProjection(60);
  if (!p || p.dips.length === 0) return null;
  const d = p.dips[0];
  const more = p.dips.length - 1;
  return (
    <a
      href="#/saldo"
      className="mx-3.5 mt-3.5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-bad-soft px-3.5 py-3 text-[13px] hover:border-destructive/50 sm:mx-5"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span className="flex-1">
        <b className="text-destructive">Ojo con tu saldo.</b> {dipText(d, p.cfg.threshold)}
        {more > 0 && <span className="text-ink-2"> Hay {more} {more === 1 ? 'aviso más' : 'avisos más'}.</span>}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 font-mono text-xs text-destructive">
        Ver <ChevronRight className="size-3.5" />
      </span>
    </a>
  );
}

import type { ReactNode } from 'react';
import { Check, ChevronRight, type LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CATS } from '@/lib/cats';
import { setMark } from '@/lib/store';
import { cn } from '@/lib/utils';

export function CatBadge({ cat, className }: { cat: string; className?: string }) {
  const c = CATS[cat] || CATS.otro;
  const Icon = c.icon;
  return (
    <Badge variant="secondary" className={cn('rounded-md font-mono text-[11px] font-medium uppercase tracking-wide', className)} style={{ color: c.c, backgroundColor: c.bg }}>
      <Icon />
      {c.label}
    </Badge>
  );
}

export function Pill({ tone, children }: { tone: 'ok' | 'bad' | 'warn' | 'plain'; children: ReactNode }) {
  const tones = {
    ok: 'bg-good-soft text-good',
    bad: 'bg-bad-soft text-destructive',
    warn: 'bg-[#fdf1d8] text-[#b45309]',
    plain: 'bg-cream-2 text-ink-2',
  };
  return (
    <Badge variant="secondary" className={cn('rounded-md font-mono text-[11px] font-medium uppercase tracking-wide', tones[tone])}>
      {children}
    </Badge>
  );
}

/** Casilla "pagado" ligada al store. */
export function PayCheck({ ev }: { ev: any }) {
  return (
    <Checkbox
      checked={!!ev.paid}
      onCheckedChange={(v) => setMark(ev.key, v === true)}
      aria-label={ev.paid ? `Marcar ${ev.name} como pendiente` : `Marcar ${ev.name} como pagado`}
      className="size-5 rounded-md border-[1.5px] data-[state=checked]:border-good data-[state=checked]:bg-good data-[state=checked]:text-white"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/** Indicador fijo de "ingreso recibido". */
export function ReceivedMark({ on }: { on: boolean }) {
  return (
    <span
      title={on ? 'Recibido' : 'Por recibir'}
      className={cn('grid size-5 place-items-center rounded-md border-[1.5px]', on ? 'border-good/30 bg-good-soft text-good' : 'border-input text-transparent')}
    >
      <Check className="size-3.5" />
    </span>
  );
}

/** Barra de progreso con hueco entre relleno y pista (como en el diseño). */
export function GapBar({ pct, color = 'var(--brand)', className }: { pct: number; color?: string; className?: string }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className={cn('flex h-3.5 gap-1', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)}>
      <span className="block rounded-full transition-[width]" style={{ width: `${p}%`, background: color }} />
      <span className="block flex-1 rounded-full bg-[#e7e6e1]" />
    </div>
  );
}

/** Tarjeta KPI: cabecera crema con etiqueta mono y cuerpo blanco. */
export function KCard(props: {
  label: string;
  icon: LucideIcon;
  href?: string;
  sub: ReactNode;
  big: ReactNode;
  neg?: boolean;
  extra?: ReactNode;
  note: ReactNode;
}) {
  const Icon = props.icon;
  return (
    <article className="rounded-xl border bg-cream">
      <div className="flex h-10 items-center justify-between pr-2 pl-3.5 font-mono text-xs font-medium tracking-wider text-ink-2 uppercase">
        <span className="flex items-center gap-2.5">
          <Icon className="size-4" />
          {props.label}
        </span>
        {props.href && (
          <a href={props.href} aria-label="Ver detalle" className="grid size-7 place-items-center rounded-md hover:bg-cream-2">
            <ChevronRight className="size-4" />
          </a>
        )}
      </div>
      <div className="-mx-px -mb-px rounded-xl border bg-card p-3.5 shadow-xs">
        <div className="truncate text-sm">{props.sub}</div>
        <div className={cn('mt-1.5 mb-1 flex flex-wrap items-baseline gap-2.5 text-[1.7rem] leading-tight font-semibold tracking-tight', props.neg && 'text-destructive')}>
          {props.big}
          {props.extra}
        </div>
        <p className="text-[13px] text-ink-2 [&_b]:font-semibold [&_b]:text-foreground">{props.note}</p>
      </div>
    </article>
  );
}

/** Variación contra el periodo anterior. goodUp: ¿subir es bueno? */
export function Delta({ cur, prev, goodUp }: { cur: number; prev: number; goodUp: boolean }) {
  if (!prev) return null;
  const p = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(p) < 0.05) return null;
  const up = p > 0;
  return (
    <span title="vs. periodo anterior" className={cn('font-mono text-xs font-medium', up === goodUp ? 'text-good' : 'text-destructive')}>
      {up ? '+' : '−'}
      {Math.abs(p).toFixed(1)}%
    </span>
  );
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function DayBadge({ date, late }: { date: string; late?: boolean }) {
  const [, m, d] = date.split('-').map(Number);
  return (
    <div className={cn('w-11 shrink-0 rounded-lg py-1 text-center leading-tight', late ? 'bg-bad-soft' : 'bg-cream')}>
      <b className="block text-base font-semibold">{d}</b>
      <span className={cn('font-mono text-[10px] uppercase tracking-wider', late ? 'text-destructive' : 'text-muted-foreground')}>{MES[m - 1]}</span>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-4 py-9 text-center text-sm text-ink-2">
      <b className="mb-1 block text-[15px] text-foreground">{title}</b>
      {text}
    </div>
  );
}

/** Cabecera de página con título y controles a la derecha. */
export function PageBar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
      <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Encabezado de tarjeta con etiqueta mono, estilo del diseño. */
export function CardLabel({ icon: Icon, children, right }: { icon: LucideIcon; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between gap-2 border-b bg-cream px-3.5 font-mono text-xs font-medium tracking-wider text-ink-2 uppercase">
      <span className="flex items-center gap-2.5">
        <Icon className="size-4" />
        {children}
      </span>
      {right}
    </div>
  );
}

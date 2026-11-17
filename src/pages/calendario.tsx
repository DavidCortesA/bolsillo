import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardLabel, EmptyState, PageBar, PayCheck, ReceivedMark } from '@/components/bits';
import { useApp } from '@/app-context';
import { eventsIn } from '@/lib/store';
import { DIAS_C, MESES, cap, dim, fmtLong, mk, todayS, ymd } from '@/lib/dates';
import { money, money0 } from '@/lib/fmt';
import { CATS } from '@/lib/cats';
import { cn } from '@/lib/utils';

export default function Calendario() {
  const { calMonth, setCalMonth, calSel, setCalSel, openForm } = useApp();
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), last = dim(y, m);
  const from = ymd(mk(y, m, 1)), to = ymd(mk(y, m, last));
  const t = todayS();
  const evs = eventsIn(from, to);
  const by: Record<string, any[]> = {};
  for (const e of evs) (by[e.date] ||= []).push(e);

  const sel = calSel && calSel >= from && calSel <= to ? calSel : t >= from && t <= to ? t : from;
  const offset = mk(y, m, 1).getDay();
  const cells = Math.ceil((offset + last) / 7) * 7;

  let ing = 0, pag = 0, pagPaid = 0;
  for (const e of evs) {
    if (e.kind === 'ingreso') ing += e.amount;
    else {
      pag += e.amount;
      if (e.paid) pagPaid += e.amount;
    }
  }
  const dayEvs = by[sel] || [];

  return (
    <>
      <PageBar title="Calendario de pagos">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => setCalMonth(mk(y, m - 1, 1))}><ChevronLeft /></Button>
          <span className="min-w-36 text-center font-mono text-[13px] font-medium">{cap(MESES[m])} {y}</span>
          <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => setCalMonth(mk(y, m + 1, 1))}><ChevronRight /></Button>
        </div>
        <Button variant="outline" size="sm" className="font-mono" onClick={() => { const n = new Date(); setCalMonth(mk(n.getFullYear(), n.getMonth(), 1)); setCalSel(todayS()); }}>Hoy</Button>
      </PageBar>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 p-3.5 sm:p-5">
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-7">
              {DIAS_C.map((d) => (
                <div key={d} className="border-b bg-cream p-2 text-center font-mono text-[11px] font-medium tracking-wider text-ink-2 uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: cells }, (_, i) => {
                const day = i - offset + 1;
                const col = i % 7;
                if (day < 1 || day > last) return <div key={i} aria-hidden className={cn('min-h-14 border-b bg-[#fbfaf7] sm:min-h-[104px]', col < 6 && 'border-r')} />;
                const date = ymd(mk(y, m, day));
                const list = by[date] || [];
                const isQ = day === 15 || day === last;
                return (
                  <button
                    key={i}
                    onClick={() => setCalSel(date)}
                    aria-label={`${day} de ${MESES[m]}${list.length ? `, ${list.length} movimientos` : ''}`}
                    className={cn(
                      'relative flex min-h-14 flex-col items-center gap-1 overflow-hidden border-b bg-card p-1 text-left outline-none hover:bg-[#faf9f5] focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[104px] sm:items-stretch sm:gap-[3px] sm:p-1.5',
                      col < 6 && 'border-r',
                      date === sel && 'z-[1] ring-2 ring-inset ring-foreground',
                    )}
                  >
                    <span className={cn('grid size-6 place-items-center rounded-md font-mono text-xs text-ink-2', date === t && 'bg-primary font-bold text-primary-foreground')}>{day}</span>
                    {isQ && <span className="absolute top-2 right-2 hidden font-mono text-[9px] tracking-wider text-muted-foreground uppercase sm:block">quincena</span>}
                    {/* móvil: puntos */}
                    <span className="flex flex-wrap justify-center gap-[3px] sm:hidden">
                      {list.map((e: any) => (
                        <i key={e.key} className={cn('size-1.5 rounded-full', e.kind === 'ingreso' ? 'bg-good' : 'bg-primary', e.kind === 'pago' && e.paid && 'opacity-35')} />
                      ))}
                    </span>
                    {/* escritorio: etiquetas */}
                    <span className="hidden flex-col gap-[3px] sm:flex">
                      {list.slice(0, 3).map((e: any) => {
                        const inc = e.kind === 'ingreso';
                        const c = CATS[e.cat] || CATS.otro;
                        return (
                          <span
                            key={e.key}
                            className={cn('flex justify-between gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-snug whitespace-nowrap', !inc && e.paid && 'line-through opacity-50')}
                            style={inc ? { color: 'var(--good)', background: 'var(--good-soft)' } : { color: c.c, background: c.bg }}
                          >
                            <span className="truncate">{e.name}</span>
                            <b className="font-semibold tabular-nums">{inc ? '+' : ''}{money0(e.amount)}</b>
                          </span>
                        );
                      })}
                      {list.length > 3 && <span className="pl-1 font-mono text-[11px] text-muted-foreground">+{list.length - 3} más</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2.5 px-0.5 font-mono text-xs text-muted-foreground">
            <span className="text-primary">●</span> pago &nbsp; <span className="text-good">●</span> ingreso &nbsp; Los pagos tachados ya están pagados.
          </p>
        </div>

        <aside className="flex flex-col gap-3.5 border-t p-3.5 sm:p-5 xl:border-t-0 xl:border-l">
          <article className="overflow-hidden rounded-xl border">
            <CardLabel icon={CalendarDays}>{cap(MESES[m])}</CardLabel>
            <div className="space-y-1.5 p-3.5 text-[13px]">
              <div className="flex justify-between"><span>Ingresos</span><b className="tabular-nums text-good">{money(ing)}</b></div>
              <div className="flex justify-between"><span>Pagos</span><b className="tabular-nums">{money(pag)}</b></div>
              <div className="flex justify-between text-muted-foreground"><span>Ya pagado</span><b className="tabular-nums font-semibold">{money(pagPaid)}</b></div>
              <div className="mt-1 flex justify-between border-t border-dashed pt-2.5"><span>Balance</span><b className={cn('tabular-nums', ing - pag < 0 && 'text-destructive')}>{money(ing - pag)}</b></div>
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border">
            <CardLabel
              icon={CalendarDays}
              right={<Button size="xs" variant="outline" className="font-mono normal-case tracking-normal" onClick={() => openForm('pago', { start_date: sel })}><Plus />Pago</Button>}
            >
              {fmtLong(sel)}
            </CardLabel>
            {dayEvs.length === 0 ? (
              <EmptyState title="Día libre" text="No hay pagos ni ingresos este día." />
            ) : (
              <div className="divide-y px-3.5">
                {dayEvs.map((e: any) => {
                  const inc = e.kind === 'ingreso';
                  return (
                    <div key={e.key} className="flex items-center gap-2.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{e.name}{e.total ? <small className="ml-1.5 text-muted-foreground">{e.n}/{e.total}</small> : null}</div>
                        <div className="text-xs text-muted-foreground">{inc ? (e.received ? 'Ingreso recibido' : 'Ingreso esperado') : (CATS[e.cat] || CATS.otro).label}</div>
                      </div>
                      <div className={cn('font-semibold tabular-nums', inc && 'text-good')}>{inc ? '+' : ''}{money(e.amount)}</div>
                      {inc ? <ReceivedMark on={!!e.received} /> : <PayCheck ev={e} />}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </aside>
      </div>
    </>
  );
}

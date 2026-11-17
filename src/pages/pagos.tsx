import { AlertTriangle, ArrowUpRight, CalendarDays, Check, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CatBadge, EmptyState, GapBar, KCard, PageBar, Pill } from '@/components/bits';
import { useApp } from '@/app-context';
import { debtStats, debts, deleteItem, eventsIn, setMark } from '@/lib/store';
import { freqText } from '@/lib/schedule';
import { diffDays, dim, fmtShort, mk, relDay, todayS, ymd } from '@/lib/dates';
import { money } from '@/lib/fmt';
import { CATS, PAY_CATS } from '@/lib/cats';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const th = 'font-mono text-[11px] tracking-wider uppercase';

export default function Pagos() {
  const { q, setQ, cat, setCat, openForm } = useApp();
  const list = debts();
  const stats = list.map((p: any) => debtStats(p));
  const faltante = stats.reduce((s: number, st: any) => s + (st.fin ? st.remainingAmt : 0), 0);

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthEvs = eventsIn(ymd(mk(y, m, 1)), ymd(mk(y, m, dim(y, m)))).filter((e: any) => e.kind === 'pago');
  const monthTot = monthEvs.reduce((s: number, e: any) => s + e.amount, 0);
  const monthPaid = monthEvs.filter((e: any) => e.paid).reduce((s: number, e: any) => s + e.amount, 0);
  const nx = list
    .map((p: any, i: number) => ({ p, e: stats[i].next }))
    .filter((x: any) => x.e)
    .sort((a: any, b: any) => a.e.date.localeCompare(b.e.date))[0];

  const needle = q.trim().toLowerCase();
  const rows = list
    .map((p: any) => ({ p, st: debtStats(p) }))
    .filter(({ p }: any) => cat === 'todas' || p.cat === cat)
    .filter(({ p }: any) => !needle || p.name.toLowerCase().includes(needle) || (CATS[p.cat]?.label || '').toLowerCase().includes(needle))
    .sort((a: any, b: any) => (a.st.next?.date || '9999').localeCompare(b.st.next?.date || '9999'));

  const chips = ['todas', ...PAY_CATS.filter((c) => list.some((p: any) => p.cat === c))];

  return (
    <>
      <PageBar title="Deudas y pagos" />
      <div className="flex flex-col gap-3.5 p-3.5 sm:p-5">
        <div className="grid gap-3.5 md:grid-cols-3">
          <KCard label="Falta por pagar" icon={AlertTriangle} sub="Deudas con fecha de fin" big={money(faltante)} note="Suma de los pagos pendientes de tus deudas a plazos" />
          <KCard
            label="Este mes" icon={CalendarDays} href="#/calendario" sub="Pagos del mes" big={money(monthTot)}
            note={<>Pagado <b>{money(monthPaid)}</b> · por pagar <b>{money(monthTot - monthPaid)}</b></>}
          />
          <KCard
            label="Próximo pago" icon={ArrowUpRight} sub={nx ? nx.p.name : 'Sin pagos pendientes'} big={nx ? money(nx.e.amount) : '—'}
            note={nx ? <><b>{fmtShort(nx.e.date)}</b> · {relDay(nx.e.date)}</> : 'Estás al corriente'}
          />
        </div>

        <article className="overflow-hidden rounded-xl border">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
            <div>
              <h2 className="text-[15px] font-semibold">Tus compromisos</h2>
              <p className="text-[13px] text-ink-2">Todo lo que pagas, con su progreso y próxima fecha.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" aria-label="Buscar pagos" className="h-9 w-52 pl-8 font-mono text-[13px]" />
              </div>
              <Button size="lg" onClick={() => openForm('pago')} className="font-mono"><Plus />Agregar deuda</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn('h-7 rounded-lg border bg-card px-2.5 font-mono text-[11px] tracking-wide text-ink-2 uppercase', cat === c && 'border-foreground bg-foreground text-background')}
              >
                {c === 'todas' ? 'Todas' : CATS[c].label}
              </button>
            ))}
          </div>

          <Table>
            <TableHeader className="bg-cream">
              <TableRow>
                <TableHead className={th}>Concepto</TableHead>
                <TableHead className={cn(th, 'hidden lg:table-cell')}>Frecuencia</TableHead>
                <TableHead className={cn(th, 'text-right')}>Monto</TableHead>
                <TableHead className={cn(th, 'hidden md:table-cell')}>Progreso</TableHead>
                <TableHead className={th}>Próximo pago</TableHead>
                <TableHead className={cn(th, 'hidden text-right lg:table-cell')}>Restante</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7}>
                    {list.length ? (
                      <EmptyState title="Sin resultados" text="Prueba con otra búsqueda o categoría." />
                    ) : (
                      <EmptyState title="Aún no tienes deudas registradas" text="Toca “Agregar deuda” para empezar: Kueski, tarjetas, streaming, tandas, colegiatura…" />
                    )}
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ p, st }: any) => {
                const c = CATS[p.cat] || CATS.otro;
                const late = st.next && diffDays(todayS(), st.next.date) < 0;
                return (
                  <TableRow key={p.id} className={cn('cursor-pointer', !st.next && 'text-muted-foreground')} onClick={() => openForm('pago', { id: p.id })}>
                    <TableCell>
                      <div className="mb-1 font-medium">{p.name}</div>
                      <CatBadge cat={p.cat} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{freqText(p)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">{money(p.amount)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {st.fin ? (
                        <div className="flex items-center gap-2.5 font-mono text-xs text-ink-2">
                          <GapBar pct={(st.paidN / st.total) * 100} color={c.c} className="h-2 w-20" />
                          {st.paidN}/{st.total}
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">Recurrente</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {st.next ? (
                        <>
                          <span className={cn(late && 'text-destructive')}>{fmtShort(st.next.date)}</span>{' '}
                          <small className="text-muted-foreground">{relDay(st.next.date)}</small>
                        </>
                      ) : (
                        <Pill tone="ok">Liquidado</Pill>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{st.fin ? money(st.remainingAmt) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {st.next && (
                        <Button variant="ghost" size="icon-sm" title="Marcar el siguiente pago como pagado" aria-label="Marcar el siguiente pago como pagado" onClick={(e) => { e.stopPropagation(); setMark(st.next.key, true); toast.success(`${p.name} marcado como pagado`); }}>
                          <Check />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={(e) => { e.stopPropagation(); openForm('pago', { id: p.id }); }}><Pencil /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar" className="hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar “${p.name}”?`)) { deleteItem('debts', p.id); toast('Eliminado'); } }}><Trash2 /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </article>
      </div>
    </>
  );
}

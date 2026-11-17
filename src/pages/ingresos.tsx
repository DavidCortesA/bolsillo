import { ArrowDownLeft, CalendarDays, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, KCard, PageBar, Pill } from '@/components/bits';
import { useApp } from '@/app-context';
import { deleteItem, eventsIn, incomes, nextIncome } from '@/lib/store';
import { MONTHLY_FACTOR, freqText } from '@/lib/schedule';
import { dim, fmtShort, mk, relDay, todayS, ymd } from '@/lib/dates';
import { money } from '@/lib/fmt';
import { cn } from '@/lib/utils';

const th = 'font-mono text-[11px] tracking-wider uppercase';

export default function Ingresos() {
  const { openForm } = useApp();
  const list = incomes();
  const t = todayS();
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const mEvs = eventsIn(ymd(mk(y, m, 1)), ymd(mk(y, m, dim(y, m)))).filter((e: any) => e.kind === 'ingreso');

  const fijoMes = list
    .filter((i: any) => i.type === 'fijo' && (!i.end_date || i.end_date >= t))
    .reduce((s: number, i: any) => s + i.amount * (MONTHLY_FACTOR[i.freq as keyof typeof MONTHLY_FACTOR] || 0), 0);
  const varMes = mEvs.filter((e: any) => e.type === 'variable').reduce((s: number, e: any) => s + e.amount, 0);
  const totMes = mEvs.reduce((s: number, e: any) => s + e.amount, 0);

  const rows = list
    .map((i: any) => ({ i, next: nextIncome(i) }))
    .sort((a: any, b: any) => (a.next?.date || '9999').localeCompare(b.next?.date || '9999'));
  const nx = rows.find((r: any) => r.next);

  return (
    <>
      <PageBar title="Ingresos" />
      <div className="flex flex-col gap-3.5 p-3.5 sm:p-5">
        <div className="grid gap-3.5 md:grid-cols-3">
          <KCard label="Fijo al mes" icon={Wallet} sub="Ingreso fijo estimado" big={money(fijoMes)} note="Sueldo y demás ingresos recurrentes, calculado a mes" />
          <KCard label="Variable" icon={ArrowDownLeft} sub="Extras de este mes" big={money(varMes)} note={<>Total del mes con fijos: <b>{money(totMes)}</b></>} />
          <KCard
            label="Próximo ingreso" icon={CalendarDays} href="#/calendario" sub={nx ? nx.i.name : 'Sin ingresos próximos'} big={nx ? money(nx.next.amount) : '—'}
            note={nx ? <><b>{fmtShort(nx.next.date)}</b> · {relDay(nx.next.date)}</> : 'Agrega un ingreso para verlo aquí'}
          />
        </div>

        <article className="overflow-hidden rounded-xl border">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
            <div>
              <h2 className="text-[15px] font-semibold">Tus ingresos</h2>
              <p className="text-[13px] text-ink-2">Fijos (quincenal o mensual) y variables (extras o por cierto tiempo).</p>
            </div>
            <Button size="lg" onClick={() => openForm('ingreso')} className="font-mono"><Plus />Agregar ingreso</Button>
          </div>
          <Table>
            <TableHeader className="bg-cream">
              <TableRow>
                <TableHead className={th}>Concepto</TableHead>
                <TableHead className={cn(th, 'hidden lg:table-cell')}>Frecuencia</TableHead>
                <TableHead className={cn(th, 'text-right')}>Monto</TableHead>
                <TableHead className={cn(th, 'hidden md:table-cell')}>Vigencia</TableHead>
                <TableHead className={th}>Próximo</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6}><EmptyState title="Aún no tienes ingresos" text="Agrega tu sueldo (quincenal o mensual) y los extras que te lleguen." /></TableCell>
                </TableRow>
              )}
              {rows.map(({ i, next }: any) => {
                const vig = i.end_date ? `hasta ${fmtShort(i.end_date)}` : i.count ? `${i.count} pagos` : 'Sin fin';
                return (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => openForm('ingreso', { id: i.id })}>
                    <TableCell>
                      <div className="mb-1 font-medium">{i.name}</div>
                      <Pill tone={i.type === 'fijo' ? 'ok' : 'warn'}>{i.type === 'fijo' ? 'Fijo' : 'Variable'}</Pill>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{freqText(i)}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums text-good">{money(i.amount)}</TableCell>
                    <TableCell className="hidden md:table-cell">{fmtShort(i.start_date)} · {vig}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {next ? <>{fmtShort(next.date)} <small className="text-muted-foreground">{relDay(next.date)}</small></> : <Pill tone="plain">Terminado</Pill>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={(e) => { e.stopPropagation(); openForm('ingreso', { id: i.id }); }}><Pencil /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar" className="hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar “${i.name}”?`)) { deleteItem('incomes', i.id); toast('Eliminado'); } }}><Trash2 /></Button>
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

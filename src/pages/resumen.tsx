import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChartColumn, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardLabel, CatBadge, DayBadge, Delta, EmptyState, GapBar, KCard, PageBar, PayCheck, Pill, ReceivedMark, ShiftNote } from '@/components/bits';
import { FlowChart, type Bucket } from '@/components/flow-chart';
import { useApp, type Mode } from '@/app-context';
import { eventsIn } from '@/lib/store';
import { MESES, MESES_C, addDays, cap, diffDays, fmtShort, parseD, periodInfo, relDay, shiftAnchor, todayS, ymd } from '@/lib/dates';
import { money } from '@/lib/fmt';
import { CATS } from '@/lib/cats';
import { cn } from '@/lib/utils';

function totals(evs: any[]) {
  const t = { ing: 0, ingRec: 0, pag: 0, pagPaid: 0 };
  for (const e of evs) {
    if (e.kind === 'ingreso') {
      t.ing += e.amount;
      if (e.received) t.ingRec += e.amount;
    } else {
      t.pag += e.amount;
      if (e.paid) t.pagPaid += e.amount;
    }
  }
  return t;
}

function buildBuckets(mode: Mode, from: string, to: string, evs: any[]): Bucket[] {
  const t = todayS();
  let buckets: Bucket[];
  let indexOf: (d: string) => number | undefined;
  if (mode === 'anio') {
    const y = from.slice(0, 4);
    buckets = MESES_C.map((m, i) => ({
      label: m, title: `${cap(MESES[i])} ${y}`, ing: 0, pag: 0, lines: [],
      today: t.slice(0, 7) === `${y}-${String(i + 1).padStart(2, '0')}`,
    }));
    indexOf = (d) => +d.slice(5, 7) - 1;
  } else {
    const days: string[] = [];
    for (let d = parseD(from); ymd(d) <= to; d = addDays(d, 1)) days.push(ymd(d));
    const idx = new Map(days.map((d, i) => [d, i]));
    buckets = days.map((d) => ({ label: String(+d.slice(8)), title: fmtShort(d), ing: 0, pag: 0, today: d === t, lines: [] }));
    indexOf = (d) => idx.get(d);
  }
  for (const e of evs) {
    const i = indexOf(e.date);
    const b = i == null ? undefined : buckets[i];
    if (!b) continue;
    if (e.kind === 'ingreso') b.ing += e.amount;
    else b.pag += e.amount;
    if (mode !== 'anio') b.lines.push(`${e.kind === 'pago' ? '−' : '+'} ${e.name} ${money(e.amount)}`);
  }
  buckets.forEach((b) => {
    if (b.lines.length > 4) b.lines = [...b.lines.slice(0, 4), `+ ${b.lines.length - 4} más`];
  });
  return buckets;
}

function Upcoming() {
  const evs = eventsIn(ymd(addDays(new Date(), -120)), ymd(addDays(new Date(), 45)));
  const pend = evs.filter((e: any) => e.kind === 'pago' && !e.paid).slice(0, 8);
  return (
    <article className="overflow-hidden rounded-xl border">
      <CardLabel
        icon={CalendarDays}
        right={
          <a href="#/calendario" aria-label="Abrir calendario" className="grid size-7 place-items-center rounded-md hover:bg-cream-2">
            <ChevronRight className="size-4" />
          </a>
        }
      >
        Próximos pagos
      </CardLabel>
      {pend.length === 0 ? (
        <EmptyState title="Todo al corriente" text="No tienes pagos pendientes en los próximos 45 días." />
      ) : (
        <div className="divide-y">
          {pend.map((e: any) => {
            const late = diffDays(todayS(), e.date) < 0;
            const c = CATS[e.cat] || CATS.otro;
            return (
              <div key={e.key} className="flex items-center gap-3 px-3.5 py-2.5">
                <DayBadge date={e.date} late={late} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.name}</div>
                  <div className={cn('text-xs text-muted-foreground', late && 'text-destructive')}>
                    {late && 'Vencido · '}
                    {c.label}
                    {e.total ? ` · ${e.n}/${e.total}` : ''} · {relDay(e.date)}
                  </div>
                  <ShiftNote ev={e} />
                </div>
                <div className="font-semibold tabular-nums">{money(e.amount)}</div>
                <PayCheck ev={e} />
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default function Resumen() {
  const { mode, setMode, anchor, setAnchor, mov, setMov } = useApp();
  const { from, to, label } = periodInfo(mode, anchor);
  const prev = periodInfo(mode, shiftAnchor(mode, anchor, -1));
  const evs = eventsIn(from, to);
  const T = totals(evs);
  const P = totals(eventsIn(prev.from, prev.to));
  const bal = T.ing - T.pag;
  const pBal = P.ing - P.pag;
  const pct = T.ing > 0 ? Math.round((T.pag / T.ing) * 100) : null;
  const modeTxt = { quincena: 'esta quincena', mes: 'este mes', anio: 'este año' }[mode];

  const byCat: Record<string, { total: number; paid: number; n: number }> = {};
  for (const e of evs.filter((x: any) => x.kind === 'pago')) {
    const c = (byCat[e.cat] ||= { total: 0, paid: 0, n: 0 });
    c.total += e.amount;
    if (e.paid) c.paid += e.amount;
    c.n++;
  }
  const cats = Object.entries(byCat).sort((a, b) => b[1].total - a[1].total);
  const shown = evs.filter((e: any) => mov === 'todo' || e.kind === mov);

  return (
    <>
      <PageBar title="Mi resumen">
        <ToggleGroup type="single" variant="outline" value={mode} onValueChange={(v) => v && setMode(v as Mode)} aria-label="Periodo">
          <ToggleGroupItem value="quincena" className="font-mono text-xs">Quincena</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="font-mono text-xs">Mes</ToggleGroupItem>
          <ToggleGroupItem value="anio" className="font-mono text-xs">Año</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" aria-label="Periodo anterior" onClick={() => setAnchor(shiftAnchor(mode, anchor, -1))}>
            <ChevronLeft />
          </Button>
          <span className="min-w-40 text-center font-mono text-[13px] font-medium">{label}</span>
          <Button variant="ghost" size="icon" aria-label="Periodo siguiente" onClick={() => setAnchor(shiftAnchor(mode, anchor, 1))}>
            <ChevronRight />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="font-mono" onClick={() => setAnchor(new Date())}>Hoy</Button>
      </PageBar>

      <div className="grid lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3.5 border-b p-3.5 sm:p-5 lg:border-r lg:border-b-0">
          <KCard
            label="Ingresos" icon={ArrowDownLeft} href="#/ingresos" sub="Ingresos del periodo"
            big={money(T.ing)} extra={<Delta cur={T.ing} prev={P.ing} goodUp />}
            note={T.ing === 0 ? 'Aún no hay ingresos en este periodo' : T.ing - T.ingRec <= 0 ? <>Ya recibiste <b>todo</b></> : <>Recibido <b>{money(T.ingRec)}</b> · faltan <b>{money(T.ing - T.ingRec)}</b></>}
          />
          <KCard
            label="Pagos" icon={ArrowUpRight} href="#/pagos" sub="Pagos del periodo"
            big={money(T.pag)} extra={<Delta cur={T.pag} prev={P.pag} goodUp={false} />}
            note={T.pag === 0 ? 'Sin pagos en este periodo' : T.pag - T.pagPaid <= 0 ? <>Ya pagaste <b>todo</b></> : <>Pagado <b>{money(T.pagPaid)}</b> · por pagar <b>{money(T.pag - T.pagPaid)}</b></>}
          />
          <KCard
            label="Balance" icon={Wallet} sub={`Lo que te queda ${modeTxt}`}
            big={money(bal)} neg={bal < 0} extra={<Delta cur={bal} prev={pBal} goodUp />}
            note={pct == null ? 'Registra ingresos para ver tu margen' : <>Tus pagos usan el <b>{pct}%</b> de tus ingresos</>}
          />
          <Upcoming />
        </section>

        <section className="flex min-w-0 flex-col gap-3.5 p-3.5 sm:p-5">
          <article className="overflow-hidden rounded-xl border">
            <CardLabel
              icon={ChartColumn}
              right={
                <span className="flex gap-3.5 font-mono text-xs normal-case tracking-normal">
                  <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[var(--chart-1)]" />Ingresos</span>
                  <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[var(--chart-2)]" />Pagos</span>
                </span>
              }
            >
              Flujo · {label}
            </CardLabel>
            <div className="p-3.5">
              <FlowChart buckets={buildBuckets(mode, from, to, evs)} />
            </div>
          </article>

          <div className="mt-1.5">
            <h2 className="text-[15px] font-semibold">Por categoría</h2>
            <p className="text-[13px] text-ink-2">Cómo se reparten tus pagos {modeTxt} y cuánto llevas pagado.</p>
          </div>
          {cats.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {cats.map(([k, c]) => {
                const cat = CATS[k] || CATS.otro;
                return (
                  <div key={k} className="flex flex-col">
                    <CatBadge cat={k} className="h-6 self-start rounded-b-none rounded-t-lg px-2.5" />
                    <div className="rounded-xl rounded-tl-none border bg-card px-3.5 py-3">
                      <div className="flex justify-between text-[13px] text-ink-2"><span>Total</span><span>{c.n} {c.n === 1 ? 'pago' : 'pagos'}</span></div>
                      <div className="mt-0.5 mb-2.5 text-2xl font-semibold tracking-tight">{money(c.total)}</div>
                      <div className="mb-2.5 border-t border-dashed" />
                      <div className="mb-2 flex justify-between text-[13px]"><b>{money(c.paid)}</b><span className="text-muted-foreground">de {money(c.total)}</span></div>
                      <GapBar pct={c.total ? (c.paid / c.total) * 100 : 0} color={cat.c} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border"><EmptyState title="Sin pagos en este periodo" text="Agrega una deuda o cambia de periodo." /></div>
          )}

          <article className="overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div>
                <h2 className="text-[15px] font-semibold">Movimientos</h2>
                <p className="text-[13px] text-ink-2">Pagos e ingresos de {label}.</p>
              </div>
              <ToggleGroup type="single" variant="outline" value={mov} onValueChange={(v) => v && setMov(v as any)} aria-label="Filtrar">
                <ToggleGroupItem value="todo" className="font-mono text-xs">Todo</ToggleGroupItem>
                <ToggleGroupItem value="pago" className="font-mono text-xs">Pagos</ToggleGroupItem>
                <ToggleGroupItem value="ingreso" className="font-mono text-xs">Ingresos</ToggleGroupItem>
              </ToggleGroup>
            </div>
            {shown.length === 0 ? (
              <EmptyState title="Nada por aquí" text="No hay movimientos en este periodo." />
            ) : (
              <Table>
                <TableHeader className="bg-cream">
                  <TableRow>
                    <TableHead className="w-11" />
                    <TableHead className="font-mono text-[11px] tracking-wider uppercase">Fecha</TableHead>
                    <TableHead className="font-mono text-[11px] tracking-wider uppercase">Concepto</TableHead>
                    <TableHead className="hidden font-mono text-[11px] tracking-wider uppercase md:table-cell">Categoría</TableHead>
                    <TableHead className="text-right font-mono text-[11px] tracking-wider uppercase">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.slice(0, 250).map((e: any) => {
                    const inc = e.kind === 'ingreso';
                    return (
                      <TableRow key={e.key} className={cn(!inc && e.paid && 'text-muted-foreground')}>
                        <TableCell>{inc ? <ReceivedMark on={!!e.received} /> : <PayCheck ev={e} />}</TableCell>
                        <TableCell className="font-mono whitespace-nowrap">{fmtShort(e.date)}</TableCell>
                        <TableCell>
                          <span className={cn('font-medium', !inc && e.paid && 'line-through decoration-muted-foreground/40')}>{e.name}</span>
                          {e.total ? <small className="ml-1.5 text-muted-foreground">{e.n}/{e.total}</small> : null}
                          <ShiftNote ev={e} className="font-normal" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {inc && !e.payout ? <Pill tone="ok">{e.type === 'variable' ? 'Variable' : 'Fijo'}</Pill> : <CatBadge cat={e.cat} />}
                        </TableCell>
                        <TableCell className={cn('text-right whitespace-nowrap tabular-nums', inc && 'font-semibold text-good')}>
                          {inc ? '+' : ''}{money(e.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </article>
        </section>
      </div>
    </>
  );
}

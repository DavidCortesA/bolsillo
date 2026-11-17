import { useState, type FormEvent } from 'react';
import { CircleCheck, TrendingDown, TrendingUp, TriangleAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardLabel, Delta, EmptyState, KCard, PageBar, Pill } from '@/components/bits';
import { BalanceChart } from '@/components/balance-chart';
import { useProjection } from '@/hooks/use-projection';
import { S, eventsIn, setBalance } from '@/lib/store';
import { addDays, fmtShort, todayS, ymd } from '@/lib/dates';
import { money } from '@/lib/fmt';
import { dipText } from '@/lib/projection';
import { cn } from '@/lib/utils';

const th = 'font-mono text-[11px] tracking-wider uppercase';
const HORIZONS = [
  { v: '30', l: '1 mes' },
  { v: '60', l: '2 meses' },
  { v: '90', l: '3 meses' },
  { v: '180', l: '6 meses' },
];
const readHorizon = () => {
  try {
    const n = Number(localStorage.getItem('bolsillo.horizon'));
    if ([30, 60, 90, 180].includes(n)) return n;
  } catch {}
  return 60;
};

function BalanceForm({ first }: { first: boolean }) {
  const cfg = S.balance;
  const [amount, setAmount] = useState(cfg ? String(cfg.amount) : '');
  const [asOf, setAsOf] = useState(todayS());
  const [thr, setThr] = useState(cfg && cfg.threshold ? String(cfg.threshold) : '');
  const [err, setErr] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!Number.isFinite(a)) return setErr('Escribe cuánto tienes (puede ser negativo si estás en sobregiro).');
    if (!asOf) return setErr('Elige la fecha del saldo.');
    const t = thr === '' ? 0 : parseFloat(thr);
    if (!(t >= 0)) return setErr('El mínimo de aviso debe ser 0 o más.');
    setErr('');
    setBalance({ amount: a, as_of: asOf, threshold: t });
    toast.success('Saldo guardado');
  };

  return (
    <article className="overflow-hidden rounded-xl border">
      <CardLabel icon={Wallet}>{first ? '¿Cuánto tienes hoy?' : 'Mi saldo'}</CardLabel>
      <form onSubmit={submit} className="flex flex-col gap-3 p-3.5">
        <p className="text-[13px] text-ink-2">
          Escribe lo que tienes disponible hoy (cuentas y efectivo). A partir de ahí la app suma tus ingresos y resta tus pagos día por día.
          Vuelve a capturarlo cuando quieras afinar la proyección.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bal-amount" className="font-mono text-xs tracking-wide uppercase">Tengo (MXN)</Label>
            <Input id="bal-amount" type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={first} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bal-date" className="font-mono text-xs tracking-wide uppercase">Saldo al día</Label>
            <Input id="bal-date" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bal-thr" className="font-mono text-xs tracking-wide uppercase">Avisar si baja de</Label>
            <Input id="bal-thr" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={thr} onChange={(e) => setThr(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="font-mono">Guardar</Button>
        </div>
        {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
      </form>
    </article>
  );
}

export default function Saldo() {
  const [days, setDays] = useState(readHorizon);
  const p = useProjection(days);

  const changeHorizon = (v: string) => {
    if (!v) return;
    setDays(+v);
    try {
      localStorage.setItem('bolsillo.horizon', v);
    } catch {}
  };

  // Pagos vencidos sin marcar: no están en la proyección (se asume que ya los traes descontados)
  const yesterday = ymd(addDays(new Date(), -1));
  const overdue = eventsIn(ymd(addDays(new Date(), -120)), yesterday).filter((e: any) => e.kind === 'pago' && !e.paid);
  const overdueTotal = overdue.reduce((s: number, e: any) => s + e.amount, 0);

  if (!p) {
    return (
      <>
        <PageBar title="Saldo proyectado" />
        <div className="flex flex-col gap-3.5 p-3.5 sm:p-5">
          <BalanceForm first />
          <article className="rounded-xl border">
            <EmptyState title="Así funciona" text="Con tu saldo de hoy, la app dibuja cuánto tendrás cada día según tus ingresos y pagos, y te avisa si una quincena te va a dejar en negativo antes de que llegue el siguiente ingreso." />
          </article>
        </div>
      </>
    );
  }

  const t = p.cfg.threshold;
  const lowest = p.min.balance < t;
  const diff = p.endBalance - p.startBalance;

  return (
    <>
      <PageBar title="Saldo proyectado">
        <ToggleGroup type="single" variant="outline" value={String(days)} onValueChange={changeHorizon} aria-label="Periodo de la proyección">
          {HORIZONS.map((h) => (
            <ToggleGroupItem key={h.v} value={h.v} className="font-mono text-xs">{h.l}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PageBar>

      <div className="flex flex-col gap-3.5 p-3.5 sm:p-5">
        <div className="grid gap-3.5 md:grid-cols-3">
          <KCard
            label="Saldo base" icon={Wallet} sub={`Capturado el ${fmtShort(p.cfg.as_of)}`}
            big={money(p.startBalance)}
            note={t > 0 ? <>Te aviso si baja de <b>{money(t)}</b></> : 'Te aviso si queda en números rojos'}
          />
          <KCard
            label="Punto más bajo" icon={TrendingDown} sub={`El ${fmtShort(p.min.date)}`}
            big={money(p.min.balance)} neg={lowest}
            note={lowest ? <>Queda <b>por debajo</b> de {t > 0 ? money(t) : 'cero'}</> : 'No baja de tu mínimo'}
          />
          <KCard
            label="Al final" icon={TrendingUp} sub={`Al ${fmtShort(p.end)}`}
            big={money(p.endBalance)} neg={p.endBalance < t} extra={<Delta cur={p.endBalance} prev={p.startBalance} goodUp />}
            note={<>{diff >= 0 ? '+' : '−'}{money(Math.abs(diff))} en el periodo</>}
          />
        </div>

        {/* Avisos */}
        {p.dips.length > 0 ? (
          <article className="overflow-hidden rounded-xl border border-destructive/30">
            <div className="flex h-10 items-center gap-2.5 border-b border-destructive/20 bg-bad-soft px-3.5 font-mono text-xs font-medium tracking-wider text-destructive uppercase">
              <TriangleAlert className="size-4" />
              {p.dips.length === 1 ? 'Aviso de saldo' : `${p.dips.length} avisos de saldo`}
            </div>
            <ul className="divide-y">
              {p.dips.map((d) => (
                <li key={d.from} className="flex items-start gap-3 px-3.5 py-3 text-[13px]">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{dipText(d, t)}</span>
                </li>
              ))}
            </ul>
          </article>
        ) : (
          <article className="flex items-center gap-3 rounded-xl border border-good/25 bg-good-soft px-3.5 py-3 text-[13px] text-good">
            <CircleCheck className="size-4 shrink-0" />
            <span><b>Sin números rojos</b> en los próximos {days === 30 ? '30 días' : days === 60 ? '2 meses' : days === 90 ? '3 meses' : '6 meses'}{t > 0 ? ` (ni por debajo de ${money(t)})` : ''}.</span>
          </article>
        )}

        {overdue.length > 0 && (
          <p className="rounded-xl border border-[#f3d9a4] bg-[#fdf6e3] px-3.5 py-2.5 text-[13px] text-[#8a5a00]">
            Tienes <b>{overdue.length}</b> {overdue.length === 1 ? 'pago vencido sin marcar' : 'pagos vencidos sin marcar'} por <b>{money(overdueTotal)}</b>.
            No entran en la proyección porque se asume que tu saldo ya los trae descontados: márcalos como pagados en Pagos o en el calendario.
          </p>
        )}

        <article className="overflow-hidden rounded-xl border">
          <CardLabel
            icon={TrendingUp}
            right={
              <span className="flex gap-3.5 font-mono text-xs normal-case tracking-normal">
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[var(--chart-1)]" />Por encima</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-destructive" />Por debajo</span>
              </span>
            }
          >
            Saldo día a día
          </CardLabel>
          <div className="p-3.5"><BalanceChart p={p} /></div>
        </article>

        <article className="overflow-hidden rounded-xl border">
          <div className="p-3.5">
            <h2 className="text-[15px] font-semibold">Por quincena</h2>
            <p className="text-[13px] text-ink-2">Con cuánto empiezas, cuánto entra y sale, y cuál es tu saldo más bajo en cada una.</p>
          </div>
          <Table>
            <TableHeader className="bg-cream">
              <TableRow>
                <TableHead className={th}>Quincena</TableHead>
                <TableHead className={cn(th, 'hidden text-right md:table-cell')}>Inicio</TableHead>
                <TableHead className={cn(th, 'hidden text-right sm:table-cell')}>Ingresos</TableHead>
                <TableHead className={cn(th, 'hidden text-right sm:table-cell')}>Pagos</TableHead>
                <TableHead className={cn(th, 'text-right')}>Final</TableHead>
                <TableHead className={cn(th, 'text-right')}>Más bajo</TableHead>
                <TableHead className={th}>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.quincenas.map((q) => (
                <TableRow key={q.from} className={cn(q.red && 'bg-bad-soft/50')}>
                  <TableCell>
                    <div className="font-medium">{q.label.replace(' · ', ' ')}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{fmtShort(q.from)} → {fmtShort(q.to)}{q.partial ? ' · parcial' : ''}</div>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{money(q.opening)}</TableCell>
                  <TableCell className="hidden text-right whitespace-nowrap tabular-nums text-good sm:table-cell">{q.ing ? `+${money(q.ing)}` : '—'}</TableCell>
                  <TableCell className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell">{q.pag ? `−${money(q.pag)}` : '—'}</TableCell>
                  <TableCell className={cn('text-right whitespace-nowrap font-semibold tabular-nums', q.closing < t && 'text-destructive')}>{money(q.closing)}</TableCell>
                  <TableCell className={cn('text-right whitespace-nowrap tabular-nums', q.red && 'font-semibold text-destructive')}>
                    {money(q.min)}
                    <div className="font-mono text-[11px] font-normal text-muted-foreground">{fmtShort(q.minDate)}</div>
                  </TableCell>
                  <TableCell>{q.red ? <Pill tone="bad">En rojo</Pill> : <Pill tone="ok">Bien</Pill>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </article>

        <BalanceForm first={false} />
      </div>
    </>
  );
}

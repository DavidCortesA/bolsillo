import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { fmtFull, fmtShort, todayS } from '@/lib/dates';
import { money, moneyK } from '@/lib/fmt';
import type { Day, Projection } from '@/lib/projection';

const config = { balance: { label: 'Saldo', color: 'var(--chart-1)' } } satisfies ChartConfig;

function Tip({ active, payload, threshold }: any) {
  const d: Day | undefined = payload?.[0]?.payload;
  if (!active || !d) return null;
  const low = d.balance < threshold;
  return (
    <div className="min-w-48 max-w-64 rounded-xl bg-foreground px-3 py-2.5 text-xs text-background shadow-lg">
      <b className="mb-1.5 block font-mono font-semibold">{fmtFull(d.date)}</b>
      <div className="flex justify-between gap-4">
        <span>Saldo</span>
        <span className={low ? 'font-semibold text-[#ff8a80]' : 'font-semibold'}>{money(d.balance)}</span>
      </div>
      {d.movs.length > 0 && (
        <div className="mt-1.5 space-y-0.5 border-t border-background/20 pt-1.5 text-background/75">
          {d.movs.slice(0, 6).map((m, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="truncate">{m.kind === 'pago' ? '−' : '+'} {m.name}</span>
              <span className="tabular-nums">{money(m.amount)}</span>
            </div>
          ))}
          {d.movs.length > 6 && <div>+ {d.movs.length - 6} más</div>}
        </div>
      )}
    </div>
  );
}

export function BalanceChart({ p }: { p: Projection }) {
  const uid = useId().replace(/:/g, '');
  const t = p.cfg.threshold || 0;
  const vals = p.days.map((d) => d.balance);
  const dMin = Math.min(...vals);
  const dMax = Math.max(...vals);
  // El degradado cambia de verde a rojo exactamente en la línea del mínimo. El SVG mide cada
  // trazo sobre su propia caja: el área llega hasta el cero y la línea solo hasta los datos.
  const cut = (lo: number, hi: number) => (hi <= lo ? (hi >= t ? 1 : 0) : Math.max(0, Math.min(1, (hi - t) / (hi - lo))));
  const offFill = cut(Math.min(dMin, 0), Math.max(dMax, 0));
  const offStroke = cut(dMin, dMax);
  const flat = dMax === dMin; // una línea plana no admite degradado (caja de alto cero)
  const flatColor = dMin < t ? 'var(--destructive)' : 'var(--chart-1)';
  const today = todayS();
  const showToday = p.days.some((d) => d.date === today);

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <AreaChart data={p.days} margin={{ left: 0, right: 8, top: 10 }}>
        <defs>
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset={offFill} stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset={offFill} stopColor="var(--destructive)" stopOpacity={0.28} />
          </linearGradient>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset={offStroke} stopColor="var(--chart-1)" />
            <stop offset={offStroke} stopColor="var(--destructive)" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="date" tickFormatter={fmtShort} tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} className="font-mono text-[10px]" />
        <YAxis
          width={54} tickLine={false} axisLine={false} tickFormatter={moneyK} className="font-mono text-[10px]"
          domain={[(m: number) => Math.min(m, t, 0), (m: number) => Math.max(m, t, 0)]}
        />
        <ChartTooltip cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }} content={<Tip threshold={t} />} />
        <ReferenceLine y={0} stroke="var(--destructive)" strokeOpacity={0.55} />
        {t > 0 && <ReferenceLine y={t} stroke="var(--brand)" strokeDasharray="4 4" label={{ value: `mínimo ${moneyK(t)}`, position: 'insideTopRight', fontSize: 10, fill: 'var(--brand)' }} />}
        {showToday && <ReferenceLine x={today} stroke="var(--brand)" strokeDasharray="3 3" />}
        <Area dataKey="balance" type="stepAfter" baseValue={0} stroke={flat ? flatColor : `url(#${uid}s)`} strokeWidth={2} fill={`url(#${uid}f)`} isAnimationActive={false} />
        <ReferenceDot x={p.min.date} y={p.min.balance} r={5} fill={p.min.balance < t ? 'var(--destructive)' : 'var(--chart-1)'} stroke="#fff" strokeWidth={2} ifOverflow="visible" />
      </AreaChart>
    </ChartContainer>
  );
}

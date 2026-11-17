import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { money, moneyK } from '@/lib/fmt';

const config = {
  ing: { label: 'Ingresos', color: 'var(--chart-1)' },
  pag: { label: 'Pagos', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export interface Bucket {
  label: string;
  title: string;
  ing: number;
  pag: number;
  today: boolean;
  lines: string[];
}

function Tip({ active, payload }: any) {
  const b: Bucket | undefined = payload?.[0]?.payload;
  if (!active || !b || (!b.ing && !b.pag)) return null;
  return (
    <div className="min-w-44 max-w-64 rounded-xl bg-foreground px-3 py-2.5 text-xs text-background shadow-lg">
      <b className="mb-1.5 block font-mono font-semibold">{b.title}</b>
      <div className="flex justify-between gap-4">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-[2px] bg-[var(--chart-1)]" />Ingresos</span>
        <span>{money(b.ing)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-[2px] bg-[var(--chart-2)]" />Pagos</span>
        <span>{money(b.pag)}</span>
      </div>
      {b.lines.length > 0 && <div className="mt-1.5 border-t border-background/20 pt-1.5 text-background/70">{b.lines.map((l, i) => <div key={i}>{l}</div>)}</div>}
    </div>
  );
}

export function FlowChart({ buckets }: { buckets: Bucket[] }) {
  const today = buckets.find((b) => b.today);
  const empty = buckets.every((b) => !b.ing && !b.pag);
  return (
    <div className="relative">
      <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
        <BarChart data={buckets} margin={{ left: 0, right: 4, top: 8 }} barGap={2} barCategoryGap="16%">
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={buckets.length > 16 ? 4 : 0} className="font-mono text-[10px]" />
          <YAxis width={44} tickLine={false} axisLine={false} tickFormatter={moneyK} className="font-mono text-[10px]" />
          <ChartTooltip cursor={{ fill: 'var(--cream)' }} content={<Tip />} />
          {today && <ReferenceLine x={today.label} stroke="var(--brand)" strokeDasharray="3 3" />}
          <Bar dataKey="ing" fill="var(--color-ing)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="pag" fill="var(--color-pag)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ChartContainer>
      {empty && <div className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[13px] text-muted-foreground">Sin movimientos en este periodo</div>}
    </div>
  );
}

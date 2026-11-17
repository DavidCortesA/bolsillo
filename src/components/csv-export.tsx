import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardLabel } from '@/components/bits';
import { catalogCsv, movementsCsv } from '@/lib/export-csv';
import { downloadText } from '@/lib/download';
import { dim, mk, todayS, ymd } from '@/lib/dates';

const RANGES = [
  { v: 'mes', l: 'Este mes' },
  { v: 'anio', l: 'Este año' },
  { v: 'prox12', l: 'Próximos 12 meses' },
];

function rangeOf(v: string): { from: string; to: string } {
  const n = new Date();
  const y = n.getFullYear(), m = n.getMonth();
  if (v === 'anio') return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (v === 'prox12') return { from: todayS(), to: ymd(mk(y, m + 12, n.getDate())) };
  return { from: ymd(mk(y, m, 1)), to: ymd(mk(y, m, dim(y, m))) };
}

const MIME = 'text/csv;charset=utf-8';

export function CsvExport() {
  const [range, setRange] = useState('mes');

  const movimientos = () => {
    const { from, to } = rangeOf(range);
    const { csv, count } = movementsCsv(from, to);
    if (count === 0) return toast('No hay movimientos en ese periodo.');
    downloadText(`bolsillo-movimientos-${from}_a_${to}.csv`, csv, MIME);
    toast.success(`${count} movimientos listos para Excel`);
  };

  const catalogo = () => {
    const { csv, count } = catalogCsv();
    if (count === 0) return toast('Aún no hay deudas ni ingresos.');
    downloadText(`bolsillo-deudas-e-ingresos-${todayS()}.csv`, csv, MIME);
    toast.success(`${count} filas listas para Excel`);
  };

  return (
    <article className="overflow-hidden rounded-xl border">
      <CardLabel icon={FileSpreadsheet}>Exportar a Excel (CSV)</CardLabel>
      <div className="flex flex-col gap-3.5 p-3.5 text-[13px] text-ink-2">
        <p>Archivos que abren directo en Excel, Numbers o Google Sheets, con acentos bien y montos que suman.</p>

        <div className="flex flex-col gap-1.5">
          <Label className="font-mono text-xs tracking-wide uppercase">Movimientos del periodo</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{RANGES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="lg" variant="outline" className="font-mono" onClick={movimientos}><Download />Descargar movimientos</Button>
          </div>
          <small className="text-xs text-muted-foreground">Un renglón por pago o ingreso, con importe con signo para sumar tu balance.</small>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="font-mono text-xs tracking-wide uppercase">Deudas e ingresos</Label>
          <div><Button size="lg" variant="outline" className="font-mono" onClick={catalogo}><Download />Descargar deudas e ingresos</Button></div>
          <small className="text-xs text-muted-foreground">Cada compromiso con su progreso: pagados, restantes, cuánto falta y próxima fecha.</small>
        </div>
      </div>
    </article>
  );
}

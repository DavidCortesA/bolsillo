import { useEffect, useState } from 'react';
import { BellRing, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardLabel } from '@/components/bits';
import { eventsIn } from '@/lib/store';
import { buildIcs, type IcsEvent } from '@/lib/ics';
import { fmtShort, todayS, ymd } from '@/lib/dates';
import { CATS } from '@/lib/cats';

const KEY = 'bolsillo.ics';
interface Prefs { leads: number[]; hour: string; months: number; incomes: boolean }
const DEFAULTS: Prefs = { leads: [1, 0], hour: '09:00', months: 3, incomes: false };

const readPrefs = (): Prefs => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
};

const LEADS = [
  { v: 0, l: 'El mismo día' },
  { v: 1, l: '1 día antes' },
  { v: 3, l: '3 días antes' },
];
const MONTHS = [
  { v: 1, l: 'Próximo mes' },
  { v: 3, l: '3 meses' },
  { v: 6, l: '6 meses' },
  { v: 12, l: '12 meses' },
];

export function CalendarReminders() {
  const [p, setP] = useState<Prefs>(readPrefs);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {}
  }, [p]);

  const now = new Date();
  const end = ymd(new Date(now.getFullYear(), now.getMonth() + p.months, now.getDate(), 12));
  const events = eventsIn(todayS(), end).filter((e: any) => (e.kind === 'pago' ? !e.paid : p.incomes));

  const toggleLead = (v: number, on: boolean) =>
    setP((s) => ({ ...s, leads: on ? [...new Set([...s.leads, v])] : s.leads.filter((x) => x !== v) }));

  const download = () => {
    const list: IcsEvent[] = events.map((e: any) => ({
      key: e.key, kind: e.kind, name: e.name, amount: e.amount, date: e.date, nominal: e.nominal,
      n: e.n, total: e.total, payout: e.payout, catLabel: (CATS[e.cat] || CATS.otro).label,
    }));
    const text = buildIcs(list, { hour: p.hour || '09:00', leads: p.leads });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bolsillo-recordatorios-${todayS()}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success(`${list.length} recordatorios listos para tu calendario`);
  };

  return (
    <article className="overflow-hidden rounded-xl border">
      <CardLabel icon={BellRing}>Recordatorios en tu calendario</CardLabel>
      <div className="flex flex-col gap-3.5 p-3.5 text-[13px] text-ink-2 [&_b]:text-foreground">
        <p>Descarga tus próximos pagos como eventos con aviso y ábrelos en el calendario de tu celular. No necesita internet ni servidor.</p>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-xs tracking-wide uppercase">Avisarme</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEADS.map((o) => (
              <div key={o.v} className="flex items-center gap-2">
                <Checkbox id={`lead-${o.v}`} checked={p.leads.includes(o.v)} onCheckedChange={(c) => toggleLead(o.v, c === true)} />
                <Label htmlFor={`lead-${o.v}`} className="text-[13px] font-normal text-foreground">{o.l}</Label>
              </div>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ics-hour" className="font-mono text-xs tracking-wide uppercase">Hora del aviso</Label>
            <Input id="ics-hour" type="time" value={p.hour} onChange={(e) => setP((s) => ({ ...s, hour: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="font-mono text-xs tracking-wide uppercase">Periodo</Label>
            <Select value={String(p.months)} onValueChange={(v) => setP((s) => ({ ...s, months: +v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="ics-inc" checked={p.incomes} onCheckedChange={(c) => setP((s) => ({ ...s, incomes: c === true }))} />
          <Label htmlFor="ics-inc" className="text-[13px] font-normal text-foreground">Incluir también mis ingresos (sueldo, cobro de tanda)</Label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" className="font-mono" disabled={events.length === 0} onClick={download}>
            <Download />Descargar .ics
          </Button>
          <span>
            {events.length === 0 ? 'No hay pagos pendientes en este periodo.' : <><b>{events.length}</b> {events.length === 1 ? 'evento' : 'eventos'} hasta el {fmtShort(end)}</>}
          </span>
        </div>

        <ul className="list-disc space-y-1 pl-4 text-xs">
          <li><b>iPhone:</b> toca el archivo descargado y elige <i>Agregar todos</i>.</li>
          <li><b>Android:</b> ábrelo con Google Calendar, o en calendar.google.com ve a <i>Configuración → Importar y exportar</i>.</li>
          <li>Google Calendar puede ignorar los avisos del archivo y usar los predeterminados del calendario; Apple Calendar sí los respeta.</li>
          <li>El archivo es una foto de hoy: cuando agregues o pagues algo, descárgalo de nuevo. Los eventos conservan su identificador, así que normalmente se actualizan en vez de duplicarse.</li>
        </ul>
      </div>
    </article>
  );
}

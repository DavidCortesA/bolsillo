import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/app-context';
import { S, computePaidUntil, saveItem } from '@/lib/store';
import { removeWithUndo } from '@/lib/undo';
import { FREQ, QLABEL, genDates, isFinite_, shiftOf } from '@/lib/schedule';
import { Checkbox } from '@/components/ui/checkbox';
import { addDays, fmtShort, todayS, ymd } from '@/lib/dates';
import { money, uid } from '@/lib/fmt';
import { CATS, PAY_CATS } from '@/lib/cats';

interface V {
  name: string; cat: string; type: string; amount: string; freq: string; qdays: string;
  start_date: string; count: string; end_date: string; done: string; notes: string;
  payout_date: string; payout_amount: string; shift: boolean; auto: boolean;
}

function Field({ label, children, full, hint }: { label: string; children: ReactNode; full?: boolean; hint?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${full ? 'sm:col-span-2' : ''}`}>
      <Label className="font-mono text-xs tracking-wide uppercase text-ink-2">{label}</Label>
      {children}
      {hint && <small className="text-xs text-muted-foreground">{hint}</small>}
    </div>
  );
}

export function ItemForm() {
  const { form, closeForm } = useApp();
  if (!form) return null;
  return <FormBody key={form.n} kind={form.kind} id={form.id} startDate={form.start_date} onClose={closeForm} />;
}

function FormBody({ kind, id, startDate, onClose }: { kind: 'pago' | 'ingreso'; id?: string; startDate?: string; onClose: () => void }) {
  const table = kind === 'pago' ? 'debts' : 'incomes';
  const it = id ? S[table].find((x: any) => x.id === id) : null;

  const [v, setV] = useState<V>(() => ({
    name: it?.name ?? '',
    cat: it?.cat ?? 'otro',
    type: it?.type ?? 'fijo',
    amount: it ? String(it.amount) : '',
    freq: it?.freq ?? (kind === 'pago' ? 'mensual' : 'quincenal'),
    qdays: it?.qdays ?? '15-fin',
    start_date: it?.start_date ?? startDate ?? todayS(),
    count: it?.count ? String(it.count) : '',
    end_date: it?.end_date ?? '',
    done: it && kind === 'pago' ? String(it.paid_until ? genDates(it, it.paid_until).length : 0) : '',
    notes: it?.notes ?? '',
    payout_date: it?.payout_date ?? '',
    payout_amount: it?.payout_amount ? String(it.payout_amount) : '',
    // por defecto: lo quincenal se recorre al día hábil anterior
    shift: it ? shiftOf(it) : kind === 'ingreso',
    // cargo automático: se da por pagado al pasar la fecha (sugerido para streaming)
    auto: !!it?.auto_pay,
  }));
  const [err, setErr] = useState('');
  const [shiftTouched, setShiftTouched] = useState(!!it);
  const [autoTouched, setAutoTouched] = useState(!!it);
  const set = (p: Partial<V>) => setV((s) => ({ ...s, ...p }));
  const setCat = (cat: string) => set({ cat, ...(autoTouched ? {} : { auto: cat === 'streaming' }) });
  const setFreq = (freq: string) => set({ freq, ...(shiftTouched ? {} : { shift: freq === 'quincenal' }) });
  const unico = v.freq === 'unico';

  const candidate = () => ({
    ...(it || {}),
    id: it?.id ?? uid(),
    name: v.name.trim(),
    amount: parseFloat(v.amount),
    freq: v.freq,
    qdays: v.qdays,
    start_date: v.start_date,
    count: !unico && v.count ? Math.max(1, parseInt(v.count, 10)) : null,
    end_date: !unico && v.end_date ? v.end_date : null,
    shift_biz: v.shift,
    notes: v.notes.trim(),
  });

  const preview = useMemo(() => {
    if (!v.start_date || !(parseFloat(v.amount) >= 0) || v.amount === '') return null;
    const c: any = candidate();
    const fin = isFinite_(c);
    const all = genDates(c, fin ? '2200-12-31' : ymd(addDays(new Date(), 400)));
    if (fin) {
      const sample = all.slice(0, 4).map(fmtShort).join(', ');
      return (
        <>
          Se acomodan <b>{all.length} {all.length === 1 ? 'pago' : 'pagos'}</b> · total <b>{money(all.length * c.amount)}</b>
          {sample && <> · {sample}{all.length > 4 ? '…' : ''}</>}
        </>
      );
    }
    const next = all.filter((d) => d >= todayS()).slice(0, 4).map(fmtShort).join(', ');
    return <>Recurrente. Próximas fechas: <b>{next || '—'}</b></>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(v.amount);
    if (!v.name.trim()) return setErr('Ponle un nombre.');
    if (!(amount >= 0)) return setErr('Escribe un monto válido.');
    if (!v.start_date) return setErr('Elige la fecha del primer pago.');
    if (v.end_date && v.end_date < v.start_date) return setErr('La fecha de fin no puede ser antes del primer pago.');

    const item: any = candidate();
    if (kind === 'pago') {
      item.cat = v.cat;
      item.auto_pay = v.auto;
      item.paid_until = computePaidUntil(item, unico ? '' : v.done);
      const tanda = v.cat === 'tanda' && v.payout_date && parseFloat(v.payout_amount) > 0;
      item.payout_date = tanda ? v.payout_date : null;
      item.payout_amount = tanda ? parseFloat(v.payout_amount) : null;
    } else {
      item.type = v.type;
    }
    saveItem(table, item);
    toast.success(it ? 'Cambios guardados' : kind === 'pago' ? 'Deuda agregada' : 'Ingreso agregado');
    onClose();
  };

  const remove = () => {
    if (!it) return;
    removeWithUndo(table, it);
    onClose();
  };

  const input = 'h-10';
  const trigger = 'h-10 w-full';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form onSubmit={submit} className="flex max-h-[92dvh] flex-col">
          <DialogHeader className="border-b bg-cream px-4 py-3.5">
            <DialogTitle className="text-base">{it ? 'Editar' : 'Nueva'} {kind === 'pago' ? 'deuda o pago' : 'ingreso'}</DialogTitle>
            <DialogDescription className="sr-only">Completa los datos y guarda.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 overflow-y-auto p-4 sm:grid-cols-2">
            <Field label="Nombre" full>
              <Input autoFocus className={input} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder={kind === 'pago' ? 'Ej. Kueski · Celular' : 'Ej. Sueldo'} />
            </Field>

            {kind === 'pago' ? (
              <Field label="Categoría">
                <Select value={v.cat} onValueChange={setCat}>
                  <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_CATS.map((c) => <SelectItem key={c} value={c}>{CATS[c].label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            ) : (
              <Field label="Tipo">
                <Select value={v.type} onValueChange={(x) => set({ type: x })}>
                  <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fijo">Fijo (sueldo, recurrente)</SelectItem>
                    <SelectItem value="variable">Variable (extra)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Monto (MXN)">
              <Input className={input} type="number" inputMode="decimal" step="0.01" min="0" value={v.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="0.00" />
            </Field>

            <Field label="Frecuencia">
              <Select value={v.freq} onValueChange={setFreq}>
                <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(FREQ).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            {v.freq === 'quincenal' && (
              <Field label="Días de pago">
                <Select value={v.qdays} onValueChange={(x) => set({ qdays: x })}>
                  <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(QLABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}

            <Field label={unico ? 'Fecha' : kind === 'pago' ? 'Fecha del primer pago' : 'Fecha del primer ingreso'}>
              <Input className={input} type="date" value={v.start_date} onChange={(e) => set({ start_date: e.target.value })} />
            </Field>

            <div className="flex items-start gap-2.5 rounded-xl border bg-cream px-3 py-2.5 sm:col-span-2">
              <Checkbox
                id="shift"
                checked={v.shift}
                onCheckedChange={(c) => { setShiftTouched(true); set({ shift: c === true }); }}
                className="mt-0.5"
              />
              <Label htmlFor="shift" className="flex-col items-start gap-0.5 text-[13px] leading-snug font-medium">
                Si cae en sábado, domingo o festivo, recorrer al día hábil anterior
                <span className="text-xs font-normal text-muted-foreground">Ej. la quincena del domingo 15 se {kind === 'pago' ? 'paga' : 'recibe'} el viernes 13.</span>
              </Label>
            </div>

            {kind === 'pago' && (
              <div className="flex items-start gap-2.5 rounded-xl border bg-cream px-3 py-2.5 sm:col-span-2">
                <Checkbox
                  id="auto"
                  checked={v.auto}
                  onCheckedChange={(c) => { setAutoTouched(true); set({ auto: c === true }); }}
                  className="mt-0.5"
                />
                <Label htmlFor="auto" className="flex-col items-start gap-0.5 text-[13px] leading-snug font-medium">
                  Cargo automático: se cobra solo
                  <span className="text-xs font-normal text-muted-foreground">Se da por pagado en cuanto pasa su fecha. Si un cargo falla, lo desmarcas y esa marca gana.</span>
                </Label>
              </div>
            )}

            {!unico && (
              <>
                <Field label="Número de pagos" hint="Déjalo vacío si no tiene fin. Ej. colegiatura a 4 meses: 4.">
                  <Input className={input} type="number" inputMode="numeric" min="1" step="1" value={v.count} onChange={(e) => set({ count: e.target.value })} placeholder="Indefinido" />
                </Field>
                <Field label="Termina el (opcional)" hint={kind === 'ingreso' ? 'Para ingresos por cierto tiempo.' : undefined}>
                  <Input className={input} type="date" value={v.end_date} onChange={(e) => set({ end_date: e.target.value })} />
                </Field>
              </>
            )}

            {kind === 'pago' && !unico && (
              <Field label="Pagos ya realizados" hint="Vacío = cuento como pagado todo lo anterior a hoy." full>
                <Input className={input} type="number" inputMode="numeric" min="0" step="1" value={v.done} onChange={(e) => set({ done: e.target.value })} placeholder="Automático" />
              </Field>
            )}

            {kind === 'pago' && v.cat === 'tanda' && (
              <>
                <Field label="Mi turno (fecha de cobro)">
                  <Input className={input} type="date" value={v.payout_date} onChange={(e) => set({ payout_date: e.target.value })} />
                </Field>
                <Field label="Monto que recibo">
                  <Input className={input} type="number" inputMode="decimal" step="0.01" min="0" value={v.payout_amount} onChange={(e) => set({ payout_amount: e.target.value })} placeholder="0.00" />
                </Field>
              </>
            )}

            <Field label="Notas" full>
              <Input className={input} value={v.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Opcional" />
            </Field>

            {preview && <div className="rounded-xl border border-dashed bg-cream px-3 py-2.5 text-[13px] text-ink-2 sm:col-span-2 [&_b]:text-foreground">{preview}</div>}
            {err && <p role="alert" className="text-[13px] text-destructive sm:col-span-2">{err}</p>}
          </div>

          <DialogFooter className="mx-0 mb-0 flex-row items-center justify-end rounded-none border-t bg-cream px-4 py-3">
            {it && (
              <Button type="button" variant="destructive" size="lg" className="mr-auto font-mono" onClick={remove}>
                <Trash2 />Eliminar
              </Button>
            )}
            <Button type="button" variant="outline" size="lg" className="font-mono" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="lg" className="font-mono">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

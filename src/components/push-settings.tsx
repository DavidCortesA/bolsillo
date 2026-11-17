import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardLabel } from '@/components/bits';
import { useSync } from '@/hooks/use-store';
import {
  disablePush, enablePush, hasLiveSubscription, isIos, isPushOn, isStandalone, notificationPermission,
  pushSupported, readPushPrefs, refreshReminders, vapidKey, writePushPrefs, type EnableResult,
} from '@/lib/push';
import type { PushPrefs } from '@/lib/reminders';

const LEADS = [
  { v: 0, l: 'El mismo día' },
  { v: 1, l: '1 día antes' },
  { v: 3, l: '3 días antes' },
];

const REASONS: Record<string, string> = {
  unsupported: 'Este navegador no admite notificaciones push.',
  'no-key': 'Falta configurar la clave VAPID (VITE_VAPID_PUBLIC_KEY) en el despliegue.',
  'no-session': 'Inicia sesión primero: los avisos se guardan en tu cuenta.',
  denied: 'El permiso de notificaciones está bloqueado. Actívalo en los ajustes del navegador o del sistema y vuelve a intentarlo.',
};

export function PushSettings() {
  const sync = useSync();
  const [on, setOn] = useState(isPushOn());
  const [live, setLive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs>(readPushPrefs);

  useEffect(() => {
    hasLiveSubscription().then(setLive);
  }, [on]);

  const supported = pushSupported();
  const needsInstall = isIos() && !isStandalone(); // en iPhone solo funciona con la app instalada
  const loggedIn = !!sync.email;
  const blocked = notificationPermission() === 'denied';

  const savePrefs = (p: PushPrefs) => {
    setPrefs(p);
    writePushPrefs(p);
    if (on) refreshReminders().catch(() => {});
  };
  const toggleLead = (v: number, checked: boolean) =>
    savePrefs({ ...prefs, leads: checked ? [...new Set([...prefs.leads, v])] : prefs.leads.filter((x) => x !== v) });

  const turnOn = async () => {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    if (r.ok) {
      setOn(true);
      toast.success('Notificaciones activadas en este dispositivo');
    } else {
      const f = r as Extract<EnableResult, { ok: false }>;
      toast.error(f.reason === 'error' ? `No se pudo activar: ${f.message}` : REASONS[f.reason]);
    }
  };
  const turnOff = async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setOn(false);
    toast('Notificaciones desactivadas');
  };

  return (
    <article className="overflow-hidden rounded-xl border">
      <CardLabel icon={BellRing}>Notificaciones de pago</CardLabel>
      <div className="flex flex-col gap-3.5 p-3.5 text-[13px] text-ink-2 [&_b]:text-foreground">
        <p>Recibe un aviso en tu celular antes de cada pago, aunque la app esté cerrada. Se activa por dispositivo.</p>

        {!supported && <p className="rounded-xl border border-warn-border bg-warn-bg px-3 py-2 text-warn-fg">{REASONS.unsupported}</p>}
        {supported && needsInstall && (
          <p className="rounded-xl border border-warn-border bg-warn-bg px-3 py-2 text-warn-fg">
            En iPhone solo funcionan si instalas Bolsillo: Safari → Compartir → <b className="text-warn-fg">Agregar a pantalla de inicio</b>, y abre la app desde ahí.
          </p>
        )}
        {supported && !needsInstall && !vapidKey && <p className="rounded-xl border border-warn-border bg-warn-bg px-3 py-2 text-warn-fg">{REASONS['no-key']}</p>}
        {supported && !needsInstall && vapidKey && !loggedIn && <p>Inicia sesión en la tarjeta de cuenta para poder activarlas.</p>}
        {on && !live && <p className="rounded-xl border border-warn-border bg-warn-bg px-3 py-2 text-warn-fg">El navegador ya no tiene la suscripción de este dispositivo. Desactívalas y vuelve a activarlas.</p>}
        {blocked && <p className="text-destructive">{REASONS.denied}</p>}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-xs tracking-wide uppercase">Avisarme</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEADS.map((o) => (
              <div key={o.v} className="flex items-center gap-2">
                <Checkbox id={`pl-${o.v}`} checked={prefs.leads.includes(o.v)} onCheckedChange={(c) => toggleLead(o.v, c === true)} />
                <Label htmlFor={`pl-${o.v}`} className="text-[13px] font-normal text-foreground">{o.l}</Label>
              </div>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5 sm:w-48">
          <Label htmlFor="push-hour" className="font-mono text-xs tracking-wide uppercase">Hora del aviso</Label>
          <Input id="push-hour" type="time" value={prefs.hour} onChange={(e) => e.target.value && savePrefs({ ...prefs, hour: e.target.value })} />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="push-inc" checked={prefs.incomes} onCheckedChange={(c) => savePrefs({ ...prefs, incomes: c === true })} />
          <Label htmlFor="push-inc" className="text-[13px] font-normal text-foreground">Avisarme también de mis ingresos</Label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {on ? (
            <Button size="lg" variant="outline" className="font-mono" disabled={busy} onClick={turnOff}>Desactivar en este dispositivo</Button>
          ) : (
            <Button size="lg" className="font-mono" disabled={busy || !supported || needsInstall || !vapidKey || !loggedIn} onClick={turnOn}>
              <BellRing />Activar notificaciones
            </Button>
          )}
          {on && live && <span><b>Activadas</b> en este dispositivo.</span>}
        </div>

        <p className="border-t pt-3 text-xs">
          Los avisos se calculan con tus pagos pendientes y se envían desde tu cuenta de Supabase, así que se actualizan solos cuando marcas un pago o cambias algo y la app sincroniza. Un aviso puede llegar con algunos minutos de retraso.
        </p>
      </div>
    </article>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Fingerprint, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardLabel } from '@/components/bits';
import {
  bioSupported, changePin, disableLock, enableLock, getAfter, getPinLength, hasBio, isLockEnabled, lockNow,
  registerBio, removeBio, setAfter, validPin,
} from '@/lib/lock';

const AFTER = [
  { v: '0', l: 'Cada vez que salgo de la app' },
  { v: '1', l: 'Tras 1 minuto fuera' },
  { v: '5', l: 'Tras 5 minutos fuera' },
  { v: '15', l: 'Tras 15 minutos fuera' },
];

const pinProps = { type: 'password', inputMode: 'numeric' as const, maxLength: 6, autoComplete: 'off', placeholder: '••••' };

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="font-mono text-xs tracking-wide uppercase">{label}</Label>
      {children}
    </div>
  );
}

export function LockSettings() {
  const [, bump] = useState(0);
  const refresh = () => bump((n) => n + 1);
  const enabled = isLockEnabled();
  const [bioOk, setBioOk] = useState(false);
  const [err, setErr] = useState('');
  const [view, setView] = useState<'none' | 'change' | 'off'>('none');

  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [after, setAfterState] = useState(String(getAfter()));
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [nw2, setNw2] = useState('');

  useEffect(() => {
    bioSupported().then(setBioOk);
  }, []);

  const reset = () => {
    setP1(''); setP2(''); setCur(''); setNw(''); setNw2(''); setErr(''); setView('none');
  };
  const pinMsg = (r: string) => (r === 'wait' ? 'Demasiados intentos. Espera un momento.' : 'PIN actual incorrecto.');

  const activate = async (e: FormEvent) => {
    e.preventDefault();
    if (!validPin(p1)) return setErr('El PIN debe tener de 4 a 6 dígitos.');
    if (p1 !== p2) return setErr('Los PIN no coinciden.');
    await enableLock(p1, +after);
    reset();
    refresh();
    toast.success('Bloqueo activado');
  };

  const change = async (e: FormEvent) => {
    e.preventDefault();
    if (!validPin(nw)) return setErr('El PIN nuevo debe tener de 4 a 6 dígitos.');
    if (nw !== nw2) return setErr('Los PIN nuevos no coinciden.');
    const r = await changePin(cur, nw);
    if (r !== 'ok') return setErr(pinMsg(r));
    reset();
    refresh();
    toast.success('PIN cambiado');
  };

  const turnOff = async (e: FormEvent) => {
    e.preventDefault();
    const r = await disableLock(cur);
    if (r !== 'ok') return setErr(pinMsg(r));
    reset();
    refresh();
    toast('Bloqueo desactivado');
  };

  const toggleBio = async () => {
    if (hasBio()) {
      removeBio();
      toast('Huella desactivada');
    } else if (await registerBio()) toast.success('Huella o Face ID activado');
    else toast.error('No se pudo activar. Revisa que el dispositivo tenga huella o Face ID configurado.');
    refresh();
  };

  return (
    <article className="overflow-hidden rounded-xl border">
      <CardLabel icon={Lock}>Bloqueo de la app</CardLabel>
      <div className="flex flex-col gap-3.5 p-3.5 text-[13px] text-ink-2">
        {!enabled ? (
          <form onSubmit={activate} className="flex flex-col gap-3.5">
            <p>Pide un PIN al abrir Bolsillo, y huella o Face ID si tu dispositivo lo permite.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="PIN (4 a 6 dígitos)" id="lk-1"><Input id="lk-1" {...pinProps} value={p1} onChange={(e) => setP1(e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="Repite el PIN" id="lk-2"><Input id="lk-2" {...pinProps} value={p2} onChange={(e) => setP2(e.target.value.replace(/\D/g, ''))} /></Field>
            </div>
            <Field label="Volver a pedirlo" id="lk-after">
              <Select value={after} onValueChange={setAfterState}>
                <SelectTrigger id="lk-after" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>{AFTER.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {err && <p role="alert" className="text-destructive">{err}</p>}
            <div><Button type="submit" size="lg" className="font-mono"><Lock />Activar bloqueo</Button></div>
          </form>
        ) : (
          <>
            <p>Bloqueo <b className="text-foreground">activado</b> con un PIN de {getPinLength()} dígitos.</p>

            <Field label="Volver a pedirlo" id="lk-after2">
              <Select value={after} onValueChange={(v) => { setAfterState(v); setAfter(+v); toast('Guardado'); }}>
                <SelectTrigger id="lk-after2" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>{AFTER.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="font-mono" onClick={() => lockNow()}><Lock />Bloquear ahora</Button>
              {bioOk && (
                <Button variant="outline" className="font-mono" onClick={toggleBio}>
                  <Fingerprint />{hasBio() ? 'Quitar huella / Face ID' : 'Activar huella / Face ID'}
                </Button>
              )}
              <Button variant="outline" className="font-mono" onClick={() => { reset(); setView(view === 'change' ? 'none' : 'change'); }}>Cambiar PIN</Button>
              <Button variant="outline" className="font-mono" onClick={() => { reset(); setView(view === 'off' ? 'none' : 'off'); }}>Desactivar</Button>
            </div>
            {!bioOk && <p className="text-xs">Este dispositivo no ofrece huella o Face ID para el navegador; el bloqueo funciona con PIN.</p>}

            {view === 'change' && (
              <form onSubmit={change} className="flex flex-col gap-3 rounded-xl border bg-cream p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="PIN actual" id="lk-c"><Input id="lk-c" {...pinProps} value={cur} onChange={(e) => setCur(e.target.value.replace(/\D/g, ''))} /></Field>
                  <Field label="PIN nuevo" id="lk-n"><Input id="lk-n" {...pinProps} value={nw} onChange={(e) => setNw(e.target.value.replace(/\D/g, ''))} /></Field>
                  <Field label="Repite el nuevo" id="lk-n2"><Input id="lk-n2" {...pinProps} value={nw2} onChange={(e) => setNw2(e.target.value.replace(/\D/g, ''))} /></Field>
                </div>
                {err && <p role="alert" className="text-destructive">{err}</p>}
                <div><Button type="submit" className="font-mono">Guardar PIN nuevo</Button></div>
              </form>
            )}
            {view === 'off' && (
              <form onSubmit={turnOff} className="flex flex-col gap-3 rounded-xl border bg-cream p-3">
                <Field label="Escribe tu PIN para desactivar" id="lk-off"><Input id="lk-off" {...pinProps} className="sm:w-48" value={cur} onChange={(e) => setCur(e.target.value.replace(/\D/g, ''))} /></Field>
                {err && <p role="alert" className="text-destructive">{err}</p>}
                <div><Button type="submit" variant="destructive" className="font-mono">Desactivar bloqueo</Button></div>
              </form>
            )}
          </>
        )}

        <p className="border-t pt-3 text-xs">
          Es un bloqueo de pantalla para que nadie curiosee tu celular: no cifra los datos guardados en el dispositivo. El PIN no se puede recuperar; si lo olvidas, la pantalla de bloqueo ofrece borrar los datos locales (en la nube siguen a salvo si usas tu cuenta).
        </p>
      </div>
    </article>
  );
}

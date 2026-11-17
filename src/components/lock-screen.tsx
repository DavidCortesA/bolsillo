import { useCallback, useEffect, useState } from 'react';
import { Delete, Fingerprint } from 'lucide-react';
import { getPinLength, hasBio, lockoutRemaining, unlock, verifyBio, verifyPin, wipeLockConfig } from '@/lib/lock';
import { cn } from '@/lib/utils';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function LockScreen() {
  const len = getPinLength();
  const bio = hasBio();
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const [wait, setWait] = useState(() => lockoutRemaining());
  const [busy, setBusy] = useState(false);

  // Cuenta regresiva cuando hay espera por demasiados intentos
  useEffect(() => {
    if (wait <= 0) return;
    const id = setInterval(() => {
      const r = lockoutRemaining();
      setWait(r);
      if (r <= 0) setMsg('');
    }, 500);
    return () => clearInterval(id);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const tryBio = useCallback(async () => {
    if (await verifyBio()) unlock();
  }, []);

  // Si hay huella registrada, la pide en cuanto aparece la pantalla
  useEffect(() => {
    if (bio) tryBio();
  }, [bio, tryBio]);

  const submit = async (p: string) => {
    setBusy(true);
    const r = await verifyPin(p);
    setBusy(false);
    if (r === 'ok') return unlock();
    setPin('');
    if (r === 'wait') {
      setWait(lockoutRemaining());
      setMsg('Demasiados intentos.');
    } else setMsg('PIN incorrecto');
  };

  const press = (d: string) => {
    if (busy || wait > 0) return;
    setMsg('');
    const next = (pin + d).slice(0, len);
    setPin(next);
    if (next.length === len) submit(next);
  };
  const back = () => !busy && setPin((p) => p.slice(0, -1));

  // Teclado físico
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const forgot = () => {
    if (!confirm('Esto borra los datos guardados en ESTE dispositivo y quita el bloqueo. Si usas una cuenta, tus datos siguen en la nube y vuelven al iniciar sesión. ¿Continuar?')) return;
    wipeLockConfig();
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('bolsillo.') || k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k));
    } catch {}
    location.reload();
  };

  const secs = Math.ceil(wait / 1000);

  return (
    <div role="dialog" aria-modal="true" aria-label="Bolsillo bloqueado" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-auto bg-background p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" width={56} height={56} className="rounded-2xl" />
        <h1 className="text-lg font-semibold tracking-tight">Bolsillo bloqueado</h1>
        <p className="text-[13px] text-ink-2">Escribe tu PIN para entrar</p>
      </div>

      <div className="flex gap-3" aria-label={`${pin.length} de ${len} dígitos`}>
        {Array.from({ length: len }, (_, i) => (
          <span key={i} className={cn('size-3.5 rounded-full border-2 transition-colors', i < pin.length ? 'border-primary bg-primary' : 'border-input')} />
        ))}
      </div>

      <p role="status" className={cn('h-5 text-[13px]', msg ? 'text-destructive' : 'text-ink-2')}>
        {wait > 0 ? `${msg} Vuelve a intentar en ${secs >= 60 ? `${Math.ceil(secs / 60)} min` : `${secs} s`}.` : msg}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button key={k} onClick={() => press(k)} disabled={wait > 0} className="size-[72px] rounded-full border bg-card text-2xl font-medium transition active:scale-95 active:bg-cream-2 disabled:opacity-40">
            {k}
          </button>
        ))}
        {bio ? (
          <button onClick={tryBio} aria-label="Usar huella o Face ID" className="grid size-[72px] place-items-center rounded-full text-primary transition active:scale-95">
            <Fingerprint className="size-7" />
          </button>
        ) : (
          <span />
        )}
        <button onClick={() => press('0')} disabled={wait > 0} className="size-[72px] rounded-full border bg-card text-2xl font-medium transition active:scale-95 active:bg-cream-2 disabled:opacity-40">
          0
        </button>
        <button onClick={back} aria-label="Borrar" className="grid size-[72px] place-items-center rounded-full text-ink-2 transition active:scale-95">
          <Delete className="size-6" />
        </button>
      </div>

      <button onClick={forgot} className="font-mono text-xs text-muted-foreground underline underline-offset-4">Olvidé mi PIN</button>
    </div>
  );
}

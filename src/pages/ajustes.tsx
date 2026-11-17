import { useRef, useState, type FormEvent } from 'react';
import { Cloud, Download, LogOut, SlidersHorizontal, Smartphone, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardLabel, PageBar } from '@/components/bits';
import { useApp } from '@/app-context';
import { useSync } from '@/hooks/use-store';
import { S, deleteItem, loadSample, resetAll } from '@/lib/store';
import { signIn, signOut, signUp, sync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { exportBackup, importBackup } from '@/lib/backup';

function Cuenta() {
  const s = useSync();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!supabase) {
    return (
      <p>
        La sincronización no está configurada (faltan <code className="font-mono text-xs">VITE_SUPABASE_URL</code> y{' '}
        <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>). La app funciona igual, solo guarda en este dispositivo.
      </p>
    );
  }

  if (s.email) {
    const label = ({ ok: 'Sincronizado', syncing: 'Sincronizando…', idle: 'Listo', error: 'Error al sincronizar', offline: 'Sin conexión' } as Record<string, string>)[s.status] || '';
    return (
      <>
        <p>Sesión iniciada como <b>{s.email}</b>. Tus datos se guardan en tu cuenta y se comparten entre tus dispositivos.</p>
        <p className="font-mono text-xs">
          {label}
          {s.last ? ` · última vez ${new Date(s.last).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
        </p>
        {s.status === 'error' && <p className="text-destructive">{s.msg}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="font-mono" onClick={() => sync()}><Cloud />Sincronizar ahora</Button>
          <Button variant="outline" className="font-mono" onClick={() => signOut()}><LogOut />Cerrar sesión</Button>
        </div>
      </>
    );
  }

  const run = async (fn: () => Promise<any>, after?: (r: any) => void) => {
    setBusy(true);
    setErr('');
    try {
      after?.(await fn());
    } catch (e: any) {
      setErr(e?.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : e?.message || 'No se pudo completar la operación.');
    } finally {
      setBusy(false);
    }
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run(() => signIn(email.trim(), password), () => toast.success('Sesión iniciada'));
  };

  return (
    <>
      <p>Inicia sesión para guardar tus datos en la nube y verlos igual en el celular y en la compu. Sin cuenta, todo se queda solo en este dispositivo.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="em" className="font-mono text-xs tracking-wide uppercase">Correo</Label>
          <Input id="em" type="email" required autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pw" className="font-mono text-xs tracking-wide uppercase">Contraseña</Label>
          <Input id="pw" type="password" required minLength={6} autoComplete="current-password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
        </div>
        {err && <p className="text-destructive">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={busy} className="font-mono">Entrar</Button>
          <Button
            type="button" variant="outline" size="lg" disabled={busy || !email || password.length < 6} className="font-mono"
            onClick={() => run(() => signUp(email.trim(), password), (r) => (r === 'confirm' ? toast.info('Revisa tu correo para confirmar la cuenta y luego entra.') : toast.success('Cuenta creada')))}
          >
            Crear cuenta
          </Button>
        </div>
      </form>
    </>
  );
}

export default function Ajustes() {
  const { install, doInstall } = useApp();
  const file = useRef<HTMLInputElement>(null);
  const nDeb = S.debts.filter((d: any) => !d.deleted_at).length;
  const nInc = S.incomes.filter((d: any) => !d.deleted_at).length;
  const s = useSync();

  const wipe = () => {
    if (!confirm('¿Borrar TODAS tus deudas e ingresos? Esta acción no se puede deshacer.')) return;
    if (s.email) {
      // con sesión: se marcan como borrados para que también se borren en la nube
      [...S.debts, ...S.incomes].forEach((x: any) => !x.deleted_at && deleteItem(S.debts.includes(x) ? 'debts' : 'incomes', x.id));
    } else resetAll();
    toast('Datos borrados');
  };

  const card = 'overflow-hidden rounded-xl border';
  const body = 'flex flex-col gap-3 p-3.5 text-[13px] text-ink-2 [&_b]:text-foreground';

  return (
    <>
      <PageBar title="Ajustes" />
      <div className="grid items-start gap-3.5 p-3.5 sm:p-5 lg:grid-cols-2">
        <article className={card}>
          <CardLabel icon={Cloud}>Cuenta y sincronización</CardLabel>
          <div className={body}><Cuenta /></div>
        </article>

        <article className={card}>
          <CardLabel icon={Download}>Tus datos</CardLabel>
          <div className={body}>
            <p>Tienes <b>{nDeb}</b> deudas y <b>{nInc}</b> ingresos registrados. Descarga un respaldo cuando quieras o restaura uno.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="font-mono" onClick={exportBackup}><Download />Exportar respaldo</Button>
              <Button variant="outline" className="font-mono" onClick={() => file.current?.click()}><Upload />Importar respaldo</Button>
              <input
                ref={file} type="file" accept="application/json,.json" hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  if (!confirm('Importar reemplaza lo que tienes ahora en este dispositivo. ¿Continuar?')) return;
                  try {
                    await importBackup(f);
                    toast.success('Respaldo importado');
                  } catch (err: any) {
                    toast.error(err?.message || 'No se pudo importar el archivo');
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="font-mono" onClick={() => { if (confirm('Esto reemplaza tus datos por los de ejemplo. ¿Continuar?')) { loadSample(); toast('Datos de ejemplo cargados'); } }}>Cargar datos de ejemplo</Button>
              <Button variant="destructive" size="sm" className="font-mono" onClick={wipe}><Trash2 />Borrar todo</Button>
            </div>
          </div>
        </article>

        <article className={card}>
          <CardLabel icon={Smartphone}>Instalar en el celular</CardLabel>
          <div className={body}>
            <p>Bolsillo es una PWA: se instala como app, abre sin barra del navegador y funciona sin internet.</p>
            {install ? (
              <div><Button size="lg" onClick={doInstall} className="font-mono"><Download />Instalar Bolsillo</Button></div>
            ) : (
              <p className="font-mono text-xs">Android (Chrome): menú ⋮ → “Instalar aplicación”.<br />iPhone (Safari): botón Compartir → “Agregar a pantalla de inicio”.</p>
            )}
          </div>
        </article>

        <article className={card}>
          <CardLabel icon={SlidersHorizontal}>Cómo cuento tus fechas</CardLabel>
          <div className={body}>
            <p>
              <b>Quincenal</b>: dos pagos al mes (15 y fin de mes, 1 y 16, 5 y 20, o 10 y 25).<br />
              <b>Cada 14 días</b>: como los pagos de Kueski por catorcena.<br />
              <b>Mensual</b>: el mismo día de cada mes (si el mes es corto, el último día).<br />
              <b>N pagos</b>: la colegiatura a 4 meses, por ejemplo, es mensual con 4 pagos.
            </p>
          </div>
        </article>
      </div>
    </>
  );
}

import { Suspense, lazy, useEffect } from 'react';
import { AppProvider, useApp } from '@/app-context';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import { useLocked } from '@/hooks/use-lock';
import { LockScreen } from '@/components/lock-screen';
import { S, resetAll } from '@/lib/store';
import { toast } from 'sonner';
import { BalanceAlert } from '@/components/balance-alert';
import { PageSkeleton } from '@/components/bits';

// Cada página y el formulario se cargan por partes: el arranque pesa mucho menos.
const loaders = {
  resumen: () => import('@/pages/resumen'),
  calendario: () => import('@/pages/calendario'),
  saldo: () => import('@/pages/saldo'),
  pagos: () => import('@/pages/pagos'),
  ingresos: () => import('@/pages/ingresos'),
  ajustes: () => import('@/pages/ajustes'),
};
const pages = {
  resumen: lazy(loaders.resumen),
  calendario: lazy(loaders.calendario),
  saldo: lazy(loaders.saldo),
  pagos: lazy(loaders.pagos),
  ingresos: lazy(loaders.ingresos),
  ajustes: lazy(loaders.ajustes),
};
const loadForm = () => import('@/components/item-form');
const ItemForm = lazy(() => loadForm().then((m) => ({ default: m.ItemForm })));

function SampleBanner() {
  if (!S.sample) return null;
  return (
    <div className="mx-3.5 mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-soft px-3.5 py-2.5 text-[13px] sm:mx-5">
      <span>Estás viendo <b>datos de ejemplo</b>. Edítalos o empieza en blanco con tus propios pagos.</span>
      <span className="flex gap-2">
        <Button size="sm" className="font-mono" onClick={() => { resetAll(); toast('Listo, empieza en blanco'); }}>Empezar en blanco</Button>
      </span>
    </div>
  );
}

function Banners() {
  const { route } = useApp();
  return (
    <>
      <SampleBanner />
      {route === 'resumen' && <BalanceAlert />}
    </>
  );
}

function Routes() {
  const { route } = useApp();
  const Page = pages[route] ?? pages.resumen;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Page />
    </Suspense>
  );
}

/** El formulario solo se descarga y monta cuando se abre. */
function FormHost() {
  const { form } = useApp();
  return form ? (
    <Suspense fallback={null}>
      <ItemForm />
    </Suspense>
  ) : null;
}

export default function App() {
  useStore(); // re-renderiza toda la app cuando cambian los datos
  useTheme(); // y cuando cambia el tema (algunos colores de categoría dependen de él)
  const locked = useLocked();

  // Con el navegador libre, precarga el resto para que navegar y abrir el formulario sea instantáneo
  useEffect(() => {
    const warm = () => {
      Object.values(loaders).forEach((l) => l());
      loadForm();
    };
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void) => number);
    if (ric) ric(warm);
    else setTimeout(warm, 2000);
  }, []);

  // Con PIN activo no se monta nada de la app hasta desbloquear: los datos no quedan a la vista
  if (locked) return <LockScreen />;

  return (
    <AppProvider>
      <AppShell banner={<Banners />}>
        <Routes />
      </AppShell>
      <FormHost />
      <Toaster position="bottom-center" mobileOffset={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }} />
    </AppProvider>
  );
}

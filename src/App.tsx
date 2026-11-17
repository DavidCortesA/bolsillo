import { AppProvider, useApp } from '@/app-context';
import { AppShell } from '@/components/app-shell';
import { ItemForm } from '@/components/item-form';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { useStore } from '@/hooks/use-store';
import { S, resetAll } from '@/lib/store';
import { toast } from 'sonner';
import Resumen from '@/pages/resumen';
import Calendario from '@/pages/calendario';
import Saldo from '@/pages/saldo';
import { BalanceAlert } from '@/components/balance-alert';
import Pagos from '@/pages/pagos';
import Ingresos from '@/pages/ingresos';
import Ajustes from '@/pages/ajustes';

function SampleBanner() {
  if (!S.sample) return null;
  return (
    <div className="mx-3.5 mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ffd9bd] bg-brand-soft px-3.5 py-2.5 text-[13px] sm:mx-5">
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
  switch (route) {
    case 'calendario': return <Calendario />;
    case 'saldo': return <Saldo />;
    case 'pagos': return <Pagos />;
    case 'ingresos': return <Ingresos />;
    case 'ajustes': return <Ajustes />;
    default: return <Resumen />;
  }
}

export default function App() {
  useStore(); // re-renderiza toda la app cuando cambian los datos
  return (
    <AppProvider>
      <AppShell banner={<Banners />}>
        <Routes />
      </AppShell>
      <ItemForm />
      <Toaster position="bottom-center" />
    </AppProvider>
  );
}

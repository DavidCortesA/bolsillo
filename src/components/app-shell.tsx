import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowDownLeft, CalendarDays, Cloud, CloudOff, Download, HandCoins, LayoutDashboard, Plus, ReceiptText, Search, SlidersHorizontal, TrendingUp, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp, type Route } from '@/app-context';
import { useSync } from '@/hooks/use-store';
import { useProjection } from '@/hooks/use-projection';
import { exportBackup } from '@/lib/backup';
import { cn } from '@/lib/utils';

const NAV: { id: Route; label: string; icon: LucideIcon }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'saldo', label: 'Saldo', icon: TrendingUp },
  { id: 'pagos', label: 'Pagos', icon: ReceiptText },
  { id: 'ingresos', label: 'Ingresos', icon: HandCoins },
  { id: 'ajustes', label: 'Ajustes', icon: SlidersHorizontal },
];

function SyncStatus() {
  const s = useSync();
  const map: Record<string, { t: string; dot: string }> = {
    disabled: { t: 'Sin sincronizar', dot: 'bg-muted-foreground' },
    off: { t: 'Sin sincronizar', dot: 'bg-muted-foreground' },
    idle: { t: 'Conectado', dot: 'bg-brand' },
    ok: { t: 'Sincronizado', dot: 'bg-brand' },
    syncing: { t: 'Sincronizando…', dot: 'bg-brand animate-pulse' },
    error: { t: 'Error de sincronización', dot: 'bg-destructive' },
    offline: { t: 'Sin conexión', dot: 'bg-muted-foreground' },
  };
  const m = map[s.status] || map.off;
  const Icon = s.email ? Cloud : CloudOff;
  return (
    <a href="#/ajustes" className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-[13px] text-ink-2 hover:bg-cream-2" title={s.email || 'Inicia sesión en Ajustes para sincronizar'}>
      <span className={cn('size-2 rounded-[3px]', m.dot)} />
      <span className="flex-1 truncate">{m.t}</span>
      <Icon className="size-3.5" />
    </a>
  );
}

export function AppShell({ children, banner }: { children: ReactNode; banner?: ReactNode }) {
  const { route, go, q, setQ, openForm } = useApp();
  const searchRef = useRef<HTMLInputElement>(null);
  const proj = useProjection(60);
  const saldoAlert = !!proj && proj.dips.length > 0; // punto rojo en el menú

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(t?.tagName) || t?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const current = NAV.find((n) => n.id === route)!;

  return (
    <div className="grid h-dvh bg-cream lg:grid-cols-[244px_minmax(0,1fr)]">
      {/* Sidebar (escritorio) */}
      <aside className="hidden flex-col gap-3.5 overflow-auto p-3 lg:flex">
        <div className="flex items-center gap-2.5 px-1.5 pt-0.5 text-xl font-semibold tracking-tight">
          <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" width={32} height={32} className="rounded-[9px]" />
          Bolsillo
        </div>

        <label className="flex h-10 items-center gap-2 rounded-xl border bg-card px-2.5 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <Search className="size-4" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (route !== 'pagos') go('pagos');
            }}
            placeholder="Buscar pago…"
            aria-label="Buscar pago"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="font-mono text-[11px]">Ctrl K</kbd>
        </label>

        <nav className="mt-1 flex flex-col gap-0.5" aria-label="Principal">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#/${n.id}`}
              aria-current={route === n.id ? 'page' : undefined}
              className={cn(
                'flex h-[38px] items-center gap-3 rounded-[9px] px-3 font-mono text-sm text-ink-2 hover:bg-cream-2',
                route === n.id && 'bg-cream-2 font-semibold text-foreground ring-1 ring-foreground/10',
              )}
            >
              <n.icon className="size-[18px]" />
              {n.label}
              {n.id === 'saldo' && saldoAlert && <span className="ml-auto size-2 rounded-full bg-destructive" role="img" aria-label="Hay avisos de saldo" />}
            </a>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 border-t pt-2.5">
          <SyncStatus />
          <button onClick={exportBackup} className="flex h-[38px] items-center gap-3 rounded-[9px] px-3 text-left font-mono text-[13px] text-ink-2 hover:bg-cream-2">
            <Download className="size-4" />
            Exportar respaldo
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex min-w-0 flex-col overflow-auto bg-background pb-[calc(64px+env(safe-area-inset-bottom))] lg:m-2 lg:ml-0 lg:rounded-2xl lg:border lg:pb-0">
        <header className="sticky top-0 z-10 flex h-[54px] shrink-0 items-center justify-between gap-3 border-b bg-background/90 px-3.5 backdrop-blur lg:h-[58px] lg:px-5">
          <div className="flex min-w-0 items-center gap-2.5 font-mono text-sm text-muted-foreground">
            <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" width={26} height={26} className="rounded-md lg:hidden" />
            <current.icon className="hidden size-4 lg:block" />
            <span className="hidden lg:inline">Bolsillo /</span>
            <b className="truncate font-medium text-foreground">{current.label}</b>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={() => openForm('ingreso')} aria-label="Agregar ingreso" className="font-mono">
              <ArrowDownLeft />
              <span className="hidden sm:inline">Agregar ingreso</span>
            </Button>
            <Button size="lg" onClick={() => openForm('pago')} aria-label="Agregar deuda" className="font-mono">
              <Plus />
              <span className="hidden sm:inline">Agregar deuda</span>
            </Button>
          </div>
        </header>
        {banner}
        <div className="min-w-0 flex-1">{children}</div>
      </main>

      {/* Barra inferior (móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t bg-cream/95 px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur lg:hidden" aria-label="Principal">
        {NAV.map((n) => (
          <a key={n.id} href={`#/${n.id}`} aria-current={route === n.id ? 'page' : undefined} className={cn('flex flex-col items-center gap-0.5 rounded-lg py-1.5 font-mono text-[10px] text-muted-foreground', route === n.id && 'font-semibold text-primary')}>
            <span className="relative">
              <n.icon className="size-5" />
              {n.id === 'saldo' && saldoAlert && <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-destructive ring-2 ring-cream" role="img" aria-label="Hay avisos de saldo" />}
            </span>
            {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

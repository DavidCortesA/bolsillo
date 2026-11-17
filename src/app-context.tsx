import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mk } from '@/lib/dates';

export type Route = 'resumen' | 'calendario' | 'saldo' | 'pagos' | 'ingresos' | 'ajustes';
export type Mode = 'quincena' | 'mes' | 'anio';
export interface FormReq {
  kind: 'pago' | 'ingreso';
  id?: string;
  start_date?: string;
  n: number; // fuerza un formulario nuevo cada vez
}

const ROUTES: Route[] = ['resumen', 'calendario', 'saldo', 'pagos', 'ingresos', 'ajustes'];
const readRoute = (): Route => {
  const r = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'resumen';
};
const readMode = (): Mode => {
  try {
    const m = localStorage.getItem('bolsillo.mode') as Mode;
    if (m === 'quincena' || m === 'mes' || m === 'anio') return m;
  } catch {}
  return 'quincena';
};

interface Ctx {
  route: Route;
  go: (r: Route) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  anchor: Date;
  setAnchor: (d: Date) => void;
  mov: 'todo' | 'pago' | 'ingreso';
  setMov: (v: 'todo' | 'pago' | 'ingreso') => void;
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  calSel: string | null;
  setCalSel: (s: string | null) => void;
  cat: string;
  setCat: (c: string) => void;
  q: string;
  setQ: (q: string) => void;
  form: FormReq | null;
  openForm: (kind: 'pago' | 'ingreso', opts?: { id?: string; start_date?: string }) => void;
  closeForm: () => void;
  install: any;
  doInstall: () => Promise<void>;
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(readRoute());
  const [mode, setModeState] = useState<Mode>(readMode());
  const [anchor, setAnchor] = useState(new Date());
  const [mov, setMov] = useState<'todo' | 'pago' | 'ingreso'>('todo');
  const now = new Date();
  const [calMonth, setCalMonth] = useState(mk(now.getFullYear(), now.getMonth(), 1));
  const [calSel, setCalSel] = useState<string | null>(null);
  const [cat, setCat] = useState('todas');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<FormReq | null>(null);
  const [install, setInstall] = useState<any>(null);

  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
      document.querySelector('main')?.scrollTo?.(0, 0);
    };
    window.addEventListener('hashchange', on);
    const bip = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener('beforeinstallprompt', bip);
    window.addEventListener('appinstalled', () => setInstall(null));
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('beforeinstallprompt', bip);
    };
  }, []);

  const go = useCallback((r: Route) => {
    location.hash = `#/${r}`;
  }, []);
  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem('bolsillo.mode', m);
    } catch {}
  }, []);
  const openForm = useCallback(
    (kind: 'pago' | 'ingreso', opts: { id?: string; start_date?: string } = {}) => setForm({ kind, ...opts, n: Date.now() }),
    [],
  );
  const doInstall = useCallback(async () => {
    if (!install) return;
    install.prompt();
    await install.userChoice;
    setInstall(null);
  }, [install]);

  const value = useMemo<Ctx>(
    () => ({
      route, go, mode, setMode, anchor, setAnchor, mov, setMov, calMonth, setCalMonth, calSel, setCalSel,
      cat, setCat, q, setQ, form, openForm, closeForm: () => setForm(null), install, doInstall,
    }),
    [route, go, mode, setMode, anchor, mov, calMonth, calSel, cat, q, form, openForm, install, doInstall],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

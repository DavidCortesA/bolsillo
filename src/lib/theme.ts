// Tema claro / oscuro / automático (sigue al sistema). La clase `dark` va en <html>.
export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'bolsillo.theme';
const listeners = new Set<() => void>();
let version = 0;

export const subscribeTheme = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getThemeVersion = () => version;

export function getPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
}

const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
export const resolveTheme = (p: ThemePref = getPref()): 'light' | 'dark' => (p === 'system' ? (systemDark() ? 'dark' : 'light') : p);

/** ¿Está activo el modo oscuro ahora mismo? (para colores que no salen de variables CSS) */
export const isDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export function applyTheme() {
  const dark = resolveTheme() === 'dark';
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1b1a17' : '#f6f4ee');
  version++;
  listeners.forEach((f) => f());
}

export function setPref(p: ThemePref) {
  try {
    localStorage.setItem(KEY, p);
  } catch {}
  applyTheme();
}

export function initTheme() {
  applyTheme();
  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getPref() === 'system') applyTheme();
    });
  }
}

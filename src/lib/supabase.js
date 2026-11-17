const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** false si faltan las variables de entorno: la app sigue funcionando solo en local. */
export const hasSupabase = Boolean(url && key);

let clientPromise = null;

/**
 * Carga supabase-js solo cuando hace falta (es de lo más pesado de la app) y reutiliza el cliente.
 * Devuelve null si no hay configuración.
 */
export function getSupabase() {
  if (!hasSupabase) return Promise.resolve(null);
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }),
  );
  return clientPromise;
}

/**
 * ¿Hay una sesión guardada en este dispositivo? Se mira el almacenamiento directamente para no
 * cargar supabase-js en quien nunca ha iniciado sesión.
 */
export function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch {}
  return false;
}

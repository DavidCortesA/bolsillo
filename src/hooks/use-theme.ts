import { useSyncExternalStore } from 'react';
import { getPref, getThemeVersion, isDark, subscribeTheme } from '@/lib/theme';

/** Re-renderiza cuando cambia el tema; devuelve la preferencia y si el modo oscuro está activo. */
export function useTheme() {
  useSyncExternalStore(subscribeTheme, getThemeVersion);
  return { pref: getPref(), dark: isDark() };
}

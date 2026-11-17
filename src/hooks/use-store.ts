import { useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '@/lib/store';
import { getSyncVersion, subscribeSync, syncState } from '@/lib/sync';

/** Re-renderiza cuando cambian los datos locales. */
export function useStore() {
  return useSyncExternalStore(subscribe, getVersion);
}

/** Re-renderiza cuando cambia el estado de sincronización. */
export function useSync() {
  useSyncExternalStore(subscribeSync, getSyncVersion);
  return syncState;
}

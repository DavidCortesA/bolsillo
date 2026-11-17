import { useSyncExternalStore } from 'react';
import { getLockVersion, isLocked, subscribeLock } from '@/lib/lock';

/** true mientras la app esté bloqueada. */
export function useLocked() {
  useSyncExternalStore(subscribeLock, getLockVersion);
  return isLocked();
}

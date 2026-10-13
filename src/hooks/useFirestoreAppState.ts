import { useCallback, useEffect, useRef, useState } from 'react';
import { AppStateStore, type AppStateValues, type StateKey, type StoreView } from '../services/appStateStore';
import { firestoreRepository } from '../services/firestoreState';

export function useFirestoreAppState(defaults: AppStateValues) {
  const store = useRef<AppStateStore | null>(null);
  const [view, setView] = useState<StoreView>({ values: defaults, ready: false, pending: false, error: null });
  useEffect(() => {
    const current = new AppStateStore(firestoreRepository, defaults, setView);
    store.current = current;
    current.start();
    return () => { current.stop(); store.current = null; };
  }, [defaults]);
  useEffect(() => {
    if (!view.pending) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [view.pending]);
  const setField = useCallback((key: StateKey, update: any) => store.current?.update(key, update), []);
  return { ...view, setField };
}

'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pcx-transactions-columns';

interface StoredPreferences {
  order: string[];
  hidden: string[];
}

function subscribe(onChange: () => void): () => void {
  // Same-window writes re-dispatch a StorageEvent (see persist below); the
  // browser's own event only fires for other tabs.
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/** The raw string is a primitive, so the snapshot is referentially stable. */
function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** No localStorage on the server — render the defaults, then hydrate. */
function getServerSnapshot(): string | null {
  return null;
}

/**
 * Reconcile what's stored against the columns that actually exist: unknown
 * ids are dropped and newly-shipped columns are appended, so adding a column
 * never leaves someone with a stale layout that hides it forever.
 */
function reconcile(raw: string | null, defaultOrder: string[]): StoredPreferences {
  if (!raw) return { order: defaultOrder, hidden: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    const known = new Set(defaultOrder);
    const stored = (parsed.order ?? []).filter((id) => known.has(id));
    const missing = defaultOrder.filter((id) => !stored.includes(id));
    return {
      order: stored.length > 0 ? [...stored, ...missing] : defaultOrder,
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((id) => known.has(id)) : [],
    };
  } catch {
    return { order: defaultOrder, hidden: [] };
  }
}

/**
 * Per-browser column order + visibility for the transactions table — the v3
 * equivalent of v2's usePersistedColumnOrder / usePersistedColumnVisibility
 * pair, minus their TanStack coupling. localStorage is the single source of
 * truth (read through useSyncExternalStore) rather than state mirrored into
 * it, so a second tab stays in step and there's no hydration mismatch.
 */
export function useColumnPreferences(defaultOrder: string[]) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { order, hidden } = useMemo(() => reconcile(raw, defaultOrder), [raw, defaultOrder]);

  const persist = useCallback((next: StoredPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch {
      // Private mode / quota — the session still works, it just won't stick.
    }
  }, []);

  const updateOrder = useCallback(
    (nextOrder: string[]) => persist({ order: nextOrder, hidden }),
    [persist, hidden],
  );

  const toggleColumn = useCallback(
    (columnId: string) =>
      persist({
        order,
        hidden: hidden.includes(columnId)
          ? hidden.filter((id) => id !== columnId)
          : [...hidden, columnId],
      }),
    [persist, order, hidden],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  }, []);

  return { order, hidden, updateOrder, toggleColumn, reset };
}

import { useState, useEffect, useCallback } from 'react';

function readValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : initialValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => readValue(key, initialValue));

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Resolve functional updates against the latest persisted value, not a
        // possibly-stale closure, so concurrent hook instances stay consistent.
        const valueToStore =
          value instanceof Function ? value(readValue(key, initialValue)) : value;

        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // `storage` only fires in *other* tabs; broadcast a same-tab event so
          // sibling instances (e.g. App + Navbar sharing 'theme') stay in sync.
          window.dispatchEvent(new CustomEvent('local-storage', { detail: { key } }));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, initialValue],
  );

  // Re-read when the key changes.
  useEffect(() => {
    setStoredValue(readValue(key, initialValue));
    // initialValue intentionally omitted: a new literal each render would reset state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Sync across tabs (`storage`) and across instances in the same tab (`local-storage`).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key && event.key !== key) return;
      if (event instanceof CustomEvent && event.detail?.key && event.detail.key !== key) return;
      setStoredValue(readValue(key, initialValue));
    };
    window.addEventListener('storage', sync);
    window.addEventListener('local-storage', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('local-storage', sync as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Theme-specific side effect: drive the documentElement attribute/class.
  useEffect(() => {
    if (key === 'theme' && typeof window !== 'undefined') {
      if (storedValue === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

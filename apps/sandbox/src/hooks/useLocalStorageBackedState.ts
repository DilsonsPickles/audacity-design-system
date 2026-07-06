import { useState, useEffect } from 'react';

/**
 * Generic hook that mirrors a state value to localStorage on every change.
 *
 * Serialization strategy is selected by `serialize`/`deserialize` params so
 * callers can match their exact existing localStorage semantics:
 *
 *   - JSON (cloudAudioFiles): pass `JSON.stringify` / guarded `JSON.parse`
 *   - boolean string (dontShowSaveModalAgain): pass `String` / `s === 'true'`
 *
 * The initial value is read synchronously from localStorage on first render
 * (lazy initializer), mirroring the pattern used in the original useState calls.
 */
export function useLocalStorageBackedState<T>(
  key: string,
  initial: T,
  serialize: (value: T) => string,
  deserialize: (raw: string) => T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    if (raw === null) return initial;
    try {
      return deserialize(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, serialize(value));
  }, [key, value, serialize]);

  return [value, setValue];
}

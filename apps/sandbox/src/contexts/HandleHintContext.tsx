/**
 * The clip handle under the pointer, for the status bar (user decision
 * 2026-10-01): TrackNew reports which handle the pointer is over (a
 * `ClipHandleHint` id, Alt already folded in), Canvas writes it here,
 * and the selection toolbar reads it to show that handle's gestures in
 * place of "Click and drag to select audio". The text itself is the
 * sandbox's (utils/handleHints.ts), so the modifier names follow the
 * operating-system preference.
 *
 * The default value is a working no-op so a Canvas rendered without the
 * provider (tests) neither throws nor needs one.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ClipHandleHint } from '@audacity-ui/components';

interface HandleHintContextType {
  hint: ClipHandleHint | null;
  setHint: (hint: ClipHandleHint | null) => void;
}

const HandleHintContext = createContext<HandleHintContextType>({ hint: null, setHint: () => {} });

export function HandleHintProvider({ children }: { children: ReactNode }) {
  const [hint, setHint] = useState<ClipHandleHint | null>(null);
  const value = useMemo(() => ({ hint, setHint }), [hint]);
  return <HandleHintContext.Provider value={value}>{children}</HandleHintContext.Provider>;
}

export function useHandleHint() {
  return useContext(HandleHintContext);
}

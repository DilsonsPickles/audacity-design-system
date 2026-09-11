/* SPDX-License-Identifier: AGPL-3.0-only */
import { createContext, useContext } from 'react';
import type { SkinId } from './skin-preferences';
import type { SkinMode } from './skin-themes';

export interface SkinContextValue {
  skin: SkinId;
  decoration: SkinId;
  mode: SkinMode;
  preview: SkinId | null;
  endPreview: () => void;
  adopt: (skin: SkinId, persist: (skin: SkinId) => unknown) => Promise<void>;
}
export const SkinContext = createContext<SkinContextValue>({
  skin: 'default', decoration: 'default', mode: 'light', preview: null,
  endPreview: () => {}, adopt: async (skin, persist) => { await persist(skin); },
});
export const useSkin = () => useContext(SkinContext);

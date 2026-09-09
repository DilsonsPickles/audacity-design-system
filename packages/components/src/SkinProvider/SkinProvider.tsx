/* SPDX-License-Identifier: AGPL-3.0-only */
import React, { useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { ThemeTokens } from '@audacity-ui/tokens';
import { ThemeProvider } from '../ThemeProvider';
import { createSkinPreview, type SkinPreviewBrowser } from './skin-preview';
import { normalizeSkin, type SkinId } from './skin-preferences';
import { resolveSkinTheme, type SkinMode } from './skin-themes';
import { SkinContext } from './SkinContext';
import { SkinScope } from './SkinScope';
import './skins.css';
export { useSkin } from './SkinContext';

export interface SkinProviderProps {
  skin?: SkinId;
  mode?: SkinMode;
  highContrast?: boolean;
  /** Supply the host's existing high-contrast theme when high contrast is active. */
  highContrastTheme?: ThemeTokens;
  /** Inject browser resources, or pass null to disable URL previews. */
  previewBrowser?: SkinPreviewBrowser | null;
  children: ReactNode;
}
const noPreview = () => null;
export function SkinProvider({ skin: savedSkin = 'default', mode = 'light', highContrast = false,
  highContrastTheme, previewBrowser = typeof window === 'undefined' ? null : window, children }: SkinProviderProps) {
  const runtime = useMemo(() => createSkinPreview(previewBrowser ?? undefined), [previewBrowser]);
  const preview = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, noPreview);
  const skin = preview ?? normalizeSkin(savedSkin);
  const decoration = highContrast ? 'default' : skin;
  const theme = highContrast && highContrastTheme ? highContrastTheme : resolveSkinTheme(skin, mode, highContrast);
  const value = useMemo(() => ({ skin, decoration, mode, preview, endPreview: runtime.end, adopt: runtime.adopt }),
    [skin, decoration, mode, preview, runtime]);
  return <SkinContext.Provider value={value}><ThemeProvider theme={theme}>
    <SkinScope>{children}</SkinScope>
  </ThemeProvider></SkinContext.Provider>;
}

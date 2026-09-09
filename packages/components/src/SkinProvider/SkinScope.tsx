/* SPDX-License-Identifier: AGPL-3.0-only */
import React, { type CSSProperties, type ReactNode } from 'react';
import { useSkin } from './SkinContext';
import { useTheme } from '../ThemeProvider';
import { SKINS } from './skin-themes';

/** Re-establish inherited decoration for a portal; never modify the host body. */
export function SkinScope({ children }: { children: ReactNode }) {
  const { decoration, mode } = useSkin();
  const { theme } = useTheme();
  if (decoration === 'default') return <>{children}</>;
  const style = {
    display: 'contents', '--editor-skin-font': SKINS[decoration].font,
    '--text': theme.foreground.text.primary, '--muted': theme.foreground.text.secondary,
    '--accent': theme.accent.primary, '--line': theme.border.default,
    '--bg': theme.background.surface.default, '--panel': theme.background.surface.elevated, '--control': theme.background.control.input.idle,
    '--skin-timecode-bg': theme.background.control.timecode.idle,
    '--skin-timecode-hover': theme.background.control.timecode.hover,
  } as CSSProperties;
  return <div className="audacity-skin" data-editor-skin={decoration} data-skin-mode={mode} style={style}>{children}</div>;
}

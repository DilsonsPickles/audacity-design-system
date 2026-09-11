import { useTheme } from '../ThemeProvider';
/* SPDX-License-Identifier: AGPL-3.0-only */
import React, { useState, type CSSProperties } from 'react';
import { SKIN_IDS, type SkinId } from './skin-preferences';
import { useSkin } from './SkinContext';
import { SKINS } from './skin-themes';
import { appearancePreview } from './appearance-previews';
import SkinCarousel from './SkinCarousel';
import './SkinSelector.css';

export const skinSelectorEnglish = {
  skin: 'Skin', skinDefault: 'Default', skinCarousel: 'carousel', skinPrevious: 'Previous skins', skinNext: 'Next skins',
  skinPreview: 'Previewing {skin}. Your saved skin has not changed.', skinKeep: 'Keep this skin',
  skinEndPreview: 'End preview', skinSaveError: 'Could not save the skin. Please try again.',
};
export const skinSelectorGerman = {
  skin: 'Skin', skinDefault: 'Standard', skinCarousel: 'Karussell', skinPrevious: 'Vorherige Skins', skinNext: 'Weitere Skins',
  skinPreview: 'Vorschau: {skin}. Dein gespeicherter Skin bleibt erhalten.', skinKeep: 'Diesen Skin behalten',
  skinEndPreview: 'Vorschau beenden', skinSaveError: 'Der Skin konnte nicht gespeichert werden. Bitte versuche es erneut.',
};
export function SkinSelector({ value, onChange, labels = skinSelectorEnglish }: {
  value: SkinId;
  /** Resolve only once persistence succeeds; a rejection leaves the preview active. */
  onChange: (skin: SkinId) => unknown;
  labels?: typeof skinSelectorEnglish;
}) {
  const skin = useSkin();
  const { theme } = useTheme();
  const style = {
    '--text': theme.foreground.text.primary, '--line': theme.border.default,
    '--accent': theme.accent.primary, '--bg': theme.background.surface.default,
    '--control': theme.background.control.button.secondary.idle,
  } as CSSProperties;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const current = skin.preview ?? value;
  const name = (id: SkinId) => id === 'default' ? labels.skinDefault : SKINS[id].name;
  const select = (id: SkinId) => {
    setSaving(true); setError(false);
    void skin.adopt(id, onChange).catch(() => { setError(true); }).finally(() => { setSaving(false); });
  };
  return <section className="editor-skin-preferences" style={style} aria-label={labels.skin}>
    <h3>{labels.skin}</h3>
    <SkinCarousel current={current} copy={labels}>
      {SKIN_IDS.map((id) => <button type="button" className="editor-skin-choice" key={id}
        aria-pressed={current === id} disabled={saving} onClick={() => select(id)}>
        <img className="editor-skin-swatch" src={appearancePreview(id, skin.mode)} alt="" />
        <span>{name(id)}</span>
      </button>)}
    </SkinCarousel>
    {skin.preview !== null && <div className="editor-skin-preview-actions">
      <p role="status">{labels.skinPreview.replace('{skin}', name(current))}</p>
      <button type="button" disabled={saving} onClick={() => select(current)}>{labels.skinKeep}</button>
      <button type="button" disabled={saving} onClick={skin.endPreview}>{labels.skinEndPreview}</button>
    </div>}
    {error && <p role="alert">{labels.skinSaveError}</p>}
  </section>;
}

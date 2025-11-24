'use client';

import { theme } from '../theme';

interface ToolbarProps {
  envelopeMode: boolean;
  envelopeAltMode: boolean;
  onToggleEnvelope: () => void;
  onToggleEnvelopeAlt: () => void;
}

export default function Toolbar({ envelopeMode, envelopeAltMode, onToggleEnvelope, onToggleEnvelopeAlt }: ToolbarProps) {
  return (
    <div
      className="h-[50px] flex items-center px-4 gap-2"
      style={{
        backgroundColor: theme.toolbar,
        borderBottom: `1px solid ${theme.toolbarBorder}`
      }}
    >
      <button
        onClick={onToggleEnvelope}
        className="flex items-center gap-2 px-4 py-2 rounded border transition-all"
        style={{
          backgroundColor: envelopeMode ? theme.buttonActiveBg : theme.buttonBg,
          borderColor: envelopeMode ? theme.buttonActiveBorder : theme.buttonBorder,
          color: envelopeMode ? theme.buttonActiveText : theme.buttonText,
        }}
        onMouseEnter={(e) => {
          if (!envelopeMode) {
            e.currentTarget.style.backgroundColor = theme.buttonHoverBg;
            e.currentTarget.style.borderColor = theme.buttonHoverBorder;
          }
        }}
        onMouseLeave={(e) => {
          if (!envelopeMode) {
            e.currentTarget.style.backgroundColor = theme.buttonBg;
            e.currentTarget.style.borderColor = theme.buttonBorder;
          }
        }}
      >
        <i className="fas fa-wave-square text-base"></i>
        <span className="text-sm">Clip Envelopes</span>
      </button>

      <button
        onClick={onToggleEnvelopeAlt}
        className="flex items-center gap-2 px-4 py-2 rounded border transition-all"
        style={{
          backgroundColor: envelopeAltMode ? theme.buttonActiveBg : theme.buttonBg,
          borderColor: envelopeAltMode ? theme.buttonActiveBorder : theme.buttonBorder,
          color: envelopeAltMode ? theme.buttonActiveText : theme.buttonText,
        }}
        onMouseEnter={(e) => {
          if (!envelopeAltMode) {
            e.currentTarget.style.backgroundColor = theme.buttonHoverBg;
            e.currentTarget.style.borderColor = theme.buttonHoverBorder;
          }
        }}
        onMouseLeave={(e) => {
          if (!envelopeAltMode) {
            e.currentTarget.style.backgroundColor = theme.buttonBg;
            e.currentTarget.style.borderColor = theme.buttonBorder;
          }
        }}
      >
        <i className="fas fa-wave-square text-base"></i>
        <span className="text-sm">Clip Envelopes Alt</span>
      </button>
    </div>
  );
}

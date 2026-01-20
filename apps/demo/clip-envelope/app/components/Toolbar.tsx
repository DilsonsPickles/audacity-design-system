'use client';

import { theme } from '../theme';
import './Toolbar.css';

interface ToolbarProps {
  envelopeMode: boolean;
  envelopeAltMode: boolean;
  showVerticalRulers?: boolean;
  onToggleEnvelope: () => void;
  onToggleEnvelopeAlt: () => void;
  onToggleVerticalRulers?: () => void;
}

export default function Toolbar({ envelopeMode, envelopeAltMode, showVerticalRulers = true, onToggleEnvelope, onToggleEnvelopeAlt, onToggleVerticalRulers }: ToolbarProps) {
  return (
    <div
      className="toolbar"
      style={{
        backgroundColor: theme.toolbar,
        borderBottom: `1px solid ${theme.toolbarBorder}`
      }}
    >
      <button
        onClick={onToggleEnvelope}
        className="toolbar__button"
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
        <i className="fas fa-wave-square toolbar__button-icon"></i>
        <span className="toolbar__button-text">Clip Envelopes</span>
      </button>

      <button
        onClick={onToggleEnvelopeAlt}
        className="toolbar__button"
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
        <i className="fas fa-wave-square toolbar__button-icon"></i>
        <span className="toolbar__button-text">Clip Envelopes Alt</span>
      </button>

      {onToggleVerticalRulers && (
        <button
          onClick={onToggleVerticalRulers}
          className="toolbar__button"
          style={{
            backgroundColor: showVerticalRulers ? theme.buttonActiveBg : theme.buttonBg,
            borderColor: showVerticalRulers ? theme.buttonActiveBorder : theme.buttonBorder,
            color: showVerticalRulers ? theme.buttonActiveText : theme.buttonText,
          }}
          onMouseEnter={(e) => {
            if (!showVerticalRulers) {
              e.currentTarget.style.backgroundColor = theme.buttonHoverBg;
              e.currentTarget.style.borderColor = theme.buttonHoverBorder;
            }
          }}
          onMouseLeave={(e) => {
            if (!showVerticalRulers) {
              e.currentTarget.style.backgroundColor = theme.buttonBg;
              e.currentTarget.style.borderColor = theme.buttonBorder;
            }
          }}
        >
          <i className="fas fa-ruler-vertical toolbar__button-icon"></i>
          <span className="toolbar__button-text">Vertical Rulers</span>
        </button>
      )}
    </div>
  );
}

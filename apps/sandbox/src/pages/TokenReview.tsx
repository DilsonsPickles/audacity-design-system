/**
 * Design Tokens v2 Review Page
 *
 * Interactive preview of all tokens in light and dark themes
 */

import React, { useState } from 'react';
import { lightTheme } from '../../../../packages/tokens/src/themes/light.v2';
import { darkTheme } from '../../../../packages/tokens/src/themes/dark.v2';

type ThemeType = 'light' | 'dark';

export function TokenReview() {
  const [activeTheme, setActiveTheme] = useState<ThemeType>('light');
  const theme = activeTheme === 'light' ? lightTheme : darkTheme;

  return (
    <div style={{
      padding: '40px',
      backgroundColor: theme.background.surface.default,
      color: theme.foreground.text.primary,
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
          Design Tokens v2 Review
        </h1>
        <p style={{ color: theme.foreground.text.secondary, marginBottom: '24px' }}>
          Interactive preview of all ~200 tokens. Switch between light and dark themes to compare.
        </p>

        {/* Theme Switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTheme('light')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTheme === 'light'
                ? theme.background.control.button.primary.idle
                : theme.background.control.button.secondary.idle,
              color: activeTheme === 'light'
                ? theme.foreground.text.inverse
                : theme.foreground.text.primary,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Light Theme
          </button>
          <button
            onClick={() => setActiveTheme('dark')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTheme === 'dark'
                ? theme.background.control.button.primary.idle
                : theme.background.control.button.secondary.idle,
              color: activeTheme === 'dark'
                ? theme.foreground.text.inverse
                : theme.foreground.text.primary,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Dark Theme
          </button>
        </div>
      </div>

      {/* Token Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

        {/* Background Tokens */}
        <TokenSection title="Background Tokens">
          <TokenSubsection title="Surface (UI Chrome)">
            <ColorSwatch label="surface.default" color={theme.background.surface.default} />
            <ColorSwatch label="surface.elevated" color={theme.background.surface.elevated} />
            <ColorSwatch label="surface.subtle" color={theme.background.surface.subtle} />
            <ColorSwatch label="surface.hover" color={theme.background.surface.hover} />
          </TokenSubsection>

          <TokenSubsection title="Canvas (Audio Workspace)">
            <ColorSwatch label="canvas.default" color={theme.background.canvas.default} />
            <ColorSwatch label="canvas.track.idle" color={theme.background.canvas.track.idle} />
            <ColorSwatch label="canvas.track.selected" color={theme.background.canvas.track.selected} />
            <ColorSwatch label="canvas.track.hover" color={theme.background.canvas.track.hover} />
          </TokenSubsection>

          <TokenSubsection title="Button States">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <StateButton label="Primary Idle" color={theme.background.control.button.primary.idle} />
              <StateButton label="Primary Hover" color={theme.background.control.button.primary.hover} />
              <StateButton label="Primary Active" color={theme.background.control.button.primary.active} />
              <StateButton label="Primary Disabled" color={theme.background.control.button.primary.disabled} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <StateButton label="Secondary Idle" color={theme.background.control.button.secondary.idle} />
              <StateButton label="Secondary Hover" color={theme.background.control.button.secondary.hover} />
              <StateButton label="Secondary Active" color={theme.background.control.button.secondary.active} />
              <StateButton label="Secondary Disabled" color={theme.background.control.button.secondary.disabled} />
            </div>
          </TokenSubsection>
        </TokenSection>

        {/* Foreground Tokens */}
        <TokenSection title="Foreground Tokens">
          <TokenSubsection title="Text Colors">
            <TextSwatch label="text.primary" color={theme.foreground.text.primary} />
            <TextSwatch label="text.secondary" color={theme.foreground.text.secondary} />
            <TextSwatch label="text.tertiary" color={theme.foreground.text.tertiary} />
            <TextSwatch label="text.disabled" color={theme.foreground.text.disabled} />
            <TextSwatch label="text.inverse" color={theme.foreground.text.inverse} />
            <TextSwatch label="text.error" color={theme.foreground.text.error} />
            <TextSwatch label="text.success" color={theme.foreground.text.success} />
            <TextSwatch label="text.warning" color={theme.foreground.text.warning} />
            <TextSwatch label="text.info" color={theme.foreground.text.info} />
          </TokenSubsection>
        </TokenSection>

        {/* Border Tokens */}
        <TokenSection title="Border Tokens">
          <TokenSubsection title="Border Colors">
            <BorderSwatch label="border.default" color={theme.border.default} />
            <BorderSwatch label="border.subtle" color={theme.border.subtle} />
            <BorderSwatch label="border.emphasis" color={theme.border.emphasis} />
            <BorderSwatch label="border.focus" color={theme.border.focus} />
            <BorderSwatch label="border.error" color={theme.border.error} />
            <BorderSwatch label="border.success" color={theme.border.success} />
          </TokenSubsection>
        </TokenSection>

        {/* Semantic Tokens */}
        <TokenSection title="Semantic Tokens">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <SemanticCard
              title="Success"
              bg={theme.semantic.success.background}
              bgSubtle={theme.semantic.success.backgroundSubtle}
              border={theme.semantic.success.border}
              text={theme.semantic.success.text}
            />
            <SemanticCard
              title="Warning"
              bg={theme.semantic.warning.background}
              bgSubtle={theme.semantic.warning.backgroundSubtle}
              border={theme.semantic.warning.border}
              text={theme.semantic.warning.text}
            />
            <SemanticCard
              title="Error"
              bg={theme.semantic.error.background}
              bgSubtle={theme.semantic.error.backgroundSubtle}
              border={theme.semantic.error.border}
              text={theme.semantic.error.text}
            />
            <SemanticCard
              title="Info"
              bg={theme.semantic.info.background}
              bgSubtle={theme.semantic.info.backgroundSubtle}
              border={theme.semantic.info.border}
              text={theme.semantic.info.text}
            />
          </div>
        </TokenSection>

        {/* Audio Tokens - Clip Colors */}
        <TokenSection title="Audio Tokens - Clip Colors (54 pre-computed)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(theme.audio.clip).filter(([key]) => key !== 'border').map(([colorName, states]: any) => (
              <div key={colorName}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  textTransform: 'capitalize',
                  color: theme.foreground.text.primary
                }}>
                  {colorName}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  <ClipColorSwatch label="header" color={states.header} />
                  <ClipColorSwatch label="headerHover" color={states.headerHover} />
                  <ClipColorSwatch label="body" color={states.body} />
                  <ClipColorSwatch label="headerSelected" color={states.headerSelected} />
                  <ClipColorSwatch label="headerSelectedHover" color={states.headerSelectedHover} />
                  <ClipColorSwatch label="bodySelected" color={states.bodySelected} />
                </div>
              </div>
            ))}
          </div>
        </TokenSection>

        {/* Audio Tokens - Other */}
        <TokenSection title="Audio Tokens - Waveform & Envelope">
          <TokenSubsection title="Waveform">
            <ColorSwatch label="waveform.default" color={theme.audio.waveform.default} />
            <ColorSwatch label="waveform.muted" color={theme.audio.waveform.muted} />
            <ColorSwatch label="waveform.rms" color={theme.audio.waveform.rms} />
            <ColorSwatch label="waveform.centerLine" color={theme.audio.waveform.centerLine} />
          </TokenSubsection>

          <TokenSubsection title="Envelope">
            <ColorSwatch label="envelope.line" color={theme.audio.envelope.line} />
            <ColorSwatch label="envelope.lineHover" color={theme.audio.envelope.lineHover} />
            <ColorSwatch label="envelope.point" color={theme.audio.envelope.point} />
            <ColorSwatch label="envelope.pointCenter" color={theme.audio.envelope.pointCenter} />
            <ColorSwatch label="envelope.fill" color={theme.audio.envelope.fill} />
            <ColorSwatch label="envelope.fillIdle" color={theme.audio.envelope.fillIdle} />
          </TokenSubsection>

          <TokenSubsection title="Timeline">
            <ColorSwatch label="timeline.background" color={theme.audio.timeline.background} />
            <ColorSwatch label="timeline.text" color={theme.audio.timeline.text} />
            <ColorSwatch label="timeline.playhead" color={theme.audio.timeline.playhead} />
          </TokenSubsection>
        </TokenSection>
      </div>
    </div>
  );
}

// Helper Components

function TokenSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {children}
      </div>
    </section>
  );
}

function TokenSubsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', opacity: 0.8 }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
      <div
        style={{
          width: '100%',
          height: '60px',
          backgroundColor: color,
          borderRadius: '4px',
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      />
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.9 }}>{label}</div>
        <div style={{ fontSize: '10px', opacity: 0.6, fontFamily: 'monospace' }}>{color}</div>
      </div>
    </div>
  );
}

function TextSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ minWidth: '200px', padding: '12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px' }}>
      <div style={{ color, fontSize: '14px', marginBottom: '4px' }}>
        The quick brown fox jumps over the lazy dog
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'monospace' }}>{color}</div>
    </div>
  );
}

function BorderSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ minWidth: '120px' }}>
      <div
        style={{
          width: '100%',
          height: '60px',
          border: `2px solid ${color}`,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          opacity: 0.5,
        }}
      >
        Border
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '8px', opacity: 0.9 }}>{label}</div>
      <div style={{ fontSize: '10px', opacity: 0.6, fontFamily: 'monospace' }}>{color}</div>
    </div>
  );
}

function StateButton({ label, color }: { label: string; color: string }) {
  return (
    <button
      style={{
        padding: '8px 16px',
        backgroundColor: color,
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'pointer',
        minWidth: '120px',
      }}
    >
      {label}
    </button>
  );
}

function ClipColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        style={{
          height: '40px',
          backgroundColor: color,
          borderRadius: '2px',
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      />
      <div style={{ fontSize: '10px', opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: '9px', opacity: 0.5, fontFamily: 'monospace' }}>{color}</div>
    </div>
  );
}

function SemanticCard({ title, bg, bgSubtle, border, text }: {
  title: string;
  bg: string;
  bgSubtle: string;
  border: string;
  text: string;
}) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: bgSubtle,
        border: `2px solid ${border}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: text }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', opacity: 0.8 }}>
        <div>bg: {bg}</div>
        <div>bgSubtle: {bgSubtle}</div>
        <div>border: {border}</div>
        <div>text: {text}</div>
      </div>
    </div>
  );
}

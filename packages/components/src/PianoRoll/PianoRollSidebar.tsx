import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { Dropdown } from '../Dropdown/Dropdown';
import { Button } from '../Button/Button';
import { SIDEBAR_WIDTH } from './constants';
import type { PianoRollSidebarProps } from './types';
import type { SnapGrid } from '@audacity-ui/core';

const NOTE_LENGTH_OPTIONS = [
  { label: '1/1', value: '1' },
  { label: '1/2', value: '2' },
  { label: '1/4', value: '4' },
  { label: '1/8', value: '8' },
  { label: '1/16', value: '16' },
  { label: '1/32', value: '32' },
];

const QUANTIZE_OPTIONS = [
  { label: '1/1', value: '1' },
  { label: '1/2', value: '2' },
  { label: '1/4', value: '4' },
  { label: '1/8', value: '8' },
  { label: '1/16', value: '16' },
  { label: '1/32', value: '32' },
];

export const PianoRollSidebar: React.FC<PianoRollSidebarProps> = ({
  snap,
  onSnapChange,
}) => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        background: theme.background.surface.subtle,
        borderRight: `1px solid ${theme.border.onElevated}`,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflow: 'hidden',
      }}
    >
      {/* Note length */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label
          style={{
            color: theme.foreground.text.primary,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
          }}
        >
          Note length
        </label>
        <Dropdown
          options={NOTE_LENGTH_OPTIONS}
          value={String(snap.subdivision)}
          onChange={(val) =>
            onSnapChange({ ...snap, subdivision: Number(val) as SnapGrid['subdivision'] })
          }
        />
      </div>

      {/* Quantize */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label
          style={{
            color: theme.foreground.text.primary,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
          }}
        >
          Quantize
        </label>
        <Dropdown
          options={QUANTIZE_OPTIONS}
          value={String(snap.subdivision)}
          onChange={(val) =>
            onSnapChange({ ...snap, subdivision: Number(val) as SnapGrid['subdivision'] })
          }
        />
      </div>

      {/* Edit note velocity button */}
      <Button variant="secondary" size="small">
        Edit note velocity
      </Button>
    </div>
  );
};

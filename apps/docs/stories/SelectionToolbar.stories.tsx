import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SelectionToolbar } from '@audacity-ui/components';
import { useState } from 'react';

const meta: Meta<typeof SelectionToolbar> = {
  title: 'Components/SelectionToolbar',
  component: SelectionToolbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SelectionToolbar>;

/**
 * Default state with a selection
 */
export const WithSelection: Story = {
  args: {
    selectionStart: 1.5,
    selectionEnd: 5.25,
    format: 'hh:mm:ss+milliseconds',
    sampleRate: 44100,
    frameRate: 24,
  },
};

/**
 * No selection state (disabled)
 */
export const NoSelection: Story = {
  args: {
    selectionStart: null,
    selectionEnd: null,
    format: 'hh:mm:ss+milliseconds',
  },
};

/**
 * Sample-based format
 */
export const SampleFormat: Story = {
  args: {
    selectionStart: 2.0,
    selectionEnd: 6.5,
    format: 'hh:mm:ss+samples',
    sampleRate: 44100,
  },
};

/**
 * Simple seconds format
 */
export const SecondsFormat: Story = {
  args: {
    selectionStart: 10.5,
    selectionEnd: 45.25,
    format: 'seconds+milliseconds',
  },
};

/**
 * Long selection (multiple hours)
 */
export const LongSelection: Story = {
  args: {
    selectionStart: 3661.5, // 1h 1m 1.5s
    selectionEnd: 7322.75,  // 2h 2m 2.75s
    format: 'dd:hh:mm:ss',
  },
};

/**
 * Interactive demo with format switching
 */
export const Interactive = () => {
  const [selectionStart, setSelectionStart] = useState(2.5);
  const [selectionEnd, setSelectionEnd] = useState(8.75);
  const [format, setFormat] = useState<any>('hh:mm:ss+milliseconds');

  return (
    <div>
      <div style={{ marginBottom: '16px', padding: '16px', background: '#f8f8f9', borderBottom: '1px solid #d4d5d9' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
          Interactive Selection Toolbar
        </h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={() => {
              setSelectionStart(1.0);
              setSelectionEnd(3.5);
            }}
            style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            Set Selection (1.0s - 3.5s)
          </button>
          <button
            onClick={() => {
              setSelectionStart(5.25);
              setSelectionEnd(12.75);
            }}
            style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            Set Selection (5.25s - 12.75s)
          </button>
          <button
            onClick={() => {
              setSelectionStart(0);
              setSelectionEnd(0);
            }}
            style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            Clear Selection
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          Current: {selectionStart.toFixed(2)}s - {selectionEnd.toFixed(2)}s (Duration: {(selectionEnd - selectionStart).toFixed(2)}s)
        </p>
      </div>

      <SelectionToolbar
        selectionStart={selectionStart === 0 && selectionEnd === 0 ? null : selectionStart}
        selectionEnd={selectionStart === 0 && selectionEnd === 0 ? null : selectionEnd}
        format={format}
        onFormatChange={(newFormat) => {
          console.log('Format changed to:', newFormat);
          setFormat(newFormat);
        }}
        onSelectionStartChange={(newStart) => {
          console.log('Selection start changed to:', newStart);
          setSelectionStart(newStart);
        }}
        onSelectionEndChange={(newEnd) => {
          console.log('Selection end changed to:', newEnd);
          setSelectionEnd(newEnd);
        }}
      />
    </div>
  );
};

/**
 * All formats showcase
 */
export const AllFormats = () => {
  const selectionStart = 125.5;
  const selectionEnd = 256.25;

  const formats: Array<{ label: string; format: any }> = [
    { label: 'hh:mm:ss', format: 'hh:mm:ss' },
    { label: 'hh:mm:ss + milliseconds', format: 'hh:mm:ss+milliseconds' },
    { label: 'hh:mm:ss + samples', format: 'hh:mm:ss+samples' },
    { label: 'seconds + milliseconds', format: 'seconds+milliseconds' },
    { label: 'samples', format: 'samples' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {formats.map(({ label, format }) => (
        <div key={format} style={{ marginBottom: '1px' }}>
          <div style={{ padding: '8px 16px', background: '#f8f8f9', borderBottom: '1px solid #d4d5d9', fontSize: '11px', fontWeight: 600 }}>
            {label}
          </div>
          <SelectionToolbar
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            format={format}
            sampleRate={44100}
          />
        </div>
      ))}
    </div>
  );
};

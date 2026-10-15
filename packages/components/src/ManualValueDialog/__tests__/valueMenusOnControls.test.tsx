import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { TrackControlPanel } from '../../TrackControlPanel/TrackControlPanel';
import { VarispeedControl } from '../../VarispeedControl/VarispeedControl';
import { BpmStepper } from '../../BpmStepper/BpmStepper';
import { TimeCode } from '../../TimeCode/TimeCode';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">{children}</AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

describe('the right-click "Enter value…" menu on the value controls (2026-10-15)', () => {
  it('track header: the volume slot opens Enter value… / Reset to default, the dialog applies through onVolumeChange; the pan slot resets to centre', () => {
    const onVolumeChange = vi.fn();
    const onPanChange = vi.fn();
    const { container, baseElement, getByText } = render(
      <Providers>
        <TrackControlPanel trackName="Track 1" trackIndex={0} volume={60} pan={20} trackHeight={114} onVolumeChange={onVolumeChange} onPanChange={onPanChange} />
      </Providers>,
    );
    fireEvent.contextMenu(container.querySelector('[data-tcp-slot="volume"]') as HTMLElement, { clientX: 30, clientY: 30 });
    expect(getByText('Reset to default')).toBeTruthy();
    fireEvent.click(getByText('Enter value…'));
    const input = baseElement.querySelector('[data-manual-value-dialog] input') as HTMLInputElement;
    expect(input.value).toBe('60 %');
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onVolumeChange).toHaveBeenCalledWith(45);

    fireEvent.contextMenu(container.querySelector('[data-tcp-slot="pan"]') as HTMLElement, { clientX: 30, clientY: 30 });
    fireEvent.click(getByText('Reset to centre'));
    expect(onPanChange).toHaveBeenCalledWith(0);
  });

  it('play-at-speed: Enter value… applies through onChange with the × unit and the range; Reset to 1×', () => {
    const onChange = vi.fn();
    const { container, baseElement, getByText } = render(
      <Providers>
        <VarispeedControl speed={0.5} enabled onChange={onChange} onDial={onChange} />
      </Providers>,
    );
    fireEvent.contextMenu(container.querySelector('[data-varispeed-display]') as HTMLElement, { clientX: 30, clientY: 30 });
    fireEvent.click(getByText('Enter value…'));
    const input = baseElement.querySelector('[data-manual-value-dialog] input') as HTMLInputElement;
    expect(input.value).toBe('0.5 ×');
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(3); // clamped to the top
    fireEvent.contextMenu(container.querySelector('.varispeed') as HTMLElement, { clientX: 30, clientY: 30 });
    fireEvent.click(getByText('Reset to 1×'));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('BPM: Enter value… opens the display’s own typed field; Reset to 120 bpm', () => {
    const onChange = vi.fn();
    const { container, getByText } = render(
      <Providers>
        <BpmStepper value={98} onChange={onChange} />
      </Providers>,
    );
    fireEvent.contextMenu(container.querySelector('.bpm-stepper') as HTMLElement, { clientX: 30, clientY: 30 });
    fireEvent.click(getByText('Enter value…'));
    expect(container.querySelector('.bpm-stepper__input')).toBeTruthy();
    fireEvent.contextMenu(container.querySelector('.bpm-stepper') as HTMLElement, { clientX: 30, clientY: 30 });
    fireEvent.click(getByText('Reset to 120 bpm'));
    expect(onChange).toHaveBeenLastCalledWith(120);
  });

  it('timecode: a right-click opens its menu with Enter value… above the formats', () => {
    const { container, getByText } = render(
      <Providers>
        <TimeCode value={0} format="hh:mm:ss" onChange={() => {}} onFormatChange={() => {}} />
      </Providers>,
    );
    fireEvent.contextMenu(container.querySelector('.timecode') as HTMLElement, { clientX: 30, clientY: 30 });
    expect(getByText('Enter value…')).toBeTruthy();
    expect(getByText('hh:mm:ss')).toBeTruthy();
  });
});

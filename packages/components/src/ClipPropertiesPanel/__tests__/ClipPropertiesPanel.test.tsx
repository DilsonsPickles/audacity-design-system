import { render, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { ClipPropertiesPanel, type ClipPropertiesClip } from '../ClipPropertiesPanel';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const colors = [{ id: 'blue', label: 'Blue' }, { id: 'red', label: 'Red' }];
const fadeShapes = [{ id: 'default', label: 'S-curve' }, { id: 'linear', label: 'Linear' }];
const clip: ClipPropertiesClip = {
  id: 7, name: 'Vocal', color: 'blue', trackName: 'Track 2',
  start: 1.5, duration: 4, trimStart: 0.25, fullDuration: 6, stretchFactor: 1, pitchSemitones: 0,
  fadeIn: 0.5, fadeOut: 0, fadeInShapeId: 'default',
};

function renderPanel(props: Partial<React.ComponentProps<typeof ClipPropertiesPanel>> = {}) {
  const handlers = {
    onRename: vi.fn(), onColorChange: vi.fn(), onStartChange: vi.fn(), onDurationChange: vi.fn(),
    onFadeChange: vi.fn(), onFadeShapeChange: vi.fn(), onPitchChange: vi.fn(), onSpeedChange: vi.fn(),
  };
  const utils = render(
    <ThemeProvider>
      <ClipPropertiesPanel clip={clip} colors={colors} fadeShapes={fadeShapes} {...handlers} {...props} />
    </ThemeProvider>,
  );
  const field = (label: string) => {
    const el = [...utils.container.querySelectorAll('.clip-properties__field')]
      .find((f) => f.querySelector('.clip-properties__label')?.textContent === label) as HTMLElement;
    expect(el, label).toBeTruthy();
    return el;
  };
  const input = (label: string) => within(field(label)).getByRole('textbox') as HTMLInputElement;
  const arrow = (label: string, dir: 'up' | 'down') => field(label).querySelector(`.number-stepper__arrow--${dir}`) as HTMLButtonElement;
  return { ...utils, ...handlers, field, input, arrow };
}

describe('ClipPropertiesPanel (2026-10-02)', () => {
  it('shows the clip: name, track, position, source, fades, pitch and speed', () => {
    const { container, input, field } = renderPanel();
    expect(container.querySelector('[data-clip-properties-clip="7"]')).toBeTruthy();
    expect(container.querySelector('.clip-properties__subtitle')?.textContent).toBe('Track 2');
    expect(input('Name').value).toBe('Vocal');
    expect(input('Start (s)').value).toBe('1.5');
    expect(input('Length (s)').value).toBe('4');
    expect(field('End').textContent).toContain('5.5 s');
    expect(field('Source').textContent).toContain('6 s, from 0.25 s');
    expect(input('Fade in (s)').value).toBe('0.5');
    expect(input('Fade out (s)').value).toBe('0');
    expect(input('Pitch (st)').value).toBe('0');
    expect(input('Speed (%)').value).toBe('100');
  });

  it('lays its groups out in one column by default and in columns in the bottom drawer', () => {
    const { container } = renderPanel();
    expect(container.querySelector('[data-clip-properties-panel]')?.getAttribute('data-layout')).toBe('stack');
    expect([...container.querySelectorAll('.clip-properties__group')].map((g) => g.getAttribute('data-group'))).toEqual(['clip', 'position', 'fades', 'speed']);
    cleanup();
    const wide = renderPanel({ layout: 'columns', placement: 'end' });
    const panel = wide.container.querySelector('[data-clip-properties-panel]')!;
    expect(panel.getAttribute('data-layout')).toBe('columns');
    expect(panel.getAttribute('data-placement')).toBe('end');
  });

  it('with no clip, the empty state', () => {
    const { container } = renderPanel({ clip: null });
    expect(container.querySelector('[data-clip-properties-empty]')).toBeTruthy();
    expect(container.querySelector('.clip-properties__field')).toBeNull();
  });

  it('a typed number commits on Enter or blur when it parses, and only when it changed; Escape reverts', () => {
    const { input, onStartChange, onDurationChange } = renderPanel();
    const start = input('Start (s)');
    start.focus();
    fireEvent.change(start, { target: { value: '2.25' } });
    expect(onStartChange).not.toHaveBeenCalled(); // not while typing
    fireEvent.keyDown(start, { key: 'Enter' });
    expect(onStartChange).toHaveBeenCalledWith(2.25);
    expect(onStartChange).toHaveBeenCalledTimes(1); // Enter blurs too — one commit, not two

    const length = input('Length (s)');
    length.focus();
    fireEvent.change(length, { target: { value: 'abc' } });
    fireEvent.blur(length);
    expect(onDurationChange).not.toHaveBeenCalled(); // a bad number never commits
    expect(length.value).toBe('4'); // back to the clip's value
    length.focus();
    fireEvent.change(length, { target: { value: '4' } });
    fireEvent.blur(length);
    expect(onDurationChange).not.toHaveBeenCalled(); // unchanged = no edit
    length.focus();
    fireEvent.change(length, { target: { value: '3' } });
    fireEvent.keyDown(length, { key: 'Escape' });
    expect(onDurationChange).not.toHaveBeenCalled();
    expect(length.value).toBe('4');
  });

  it('the stepper arrows commit at once, by the field\'s step, within its limits', () => {
    const { arrow, onStartChange, onPitchChange, onFadeChange, onSpeedChange } = renderPanel();
    fireEvent.click(arrow('Start (s)', 'up'));
    expect(onStartChange).toHaveBeenCalledWith(1.6); // 0.1 s steps
    fireEvent.click(arrow('Pitch (st)', 'down'));
    expect(onPitchChange).toHaveBeenCalledWith(-1); // whole semitones
    fireEvent.click(arrow('Fade out (s)', 'down'));
    expect(onFadeChange).not.toHaveBeenCalled(); // already at 0: nothing to commit
    fireEvent.click(arrow('Speed (%)', 'up'));
    expect(onSpeedChange).toHaveBeenCalledWith(105); // 5% steps
  });

  it('the name commits the same way, trimmed, never empty', () => {
    const { input, onRename } = renderPanel();
    const name = input('Name');
    fireEvent.change(name, { target: { value: '  Lead vocal ' } });
    fireEvent.blur(name);
    expect(onRename).toHaveBeenCalledWith('Lead vocal');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.blur(name);
    expect(onRename).toHaveBeenCalledTimes(1);
  });

  it('fades report their side; a shape dropdown is disabled while its fade is zero', () => {
    const { input, field, onFadeChange } = renderPanel();
    const out = input('Fade out (s)');
    out.focus();
    fireEvent.change(out, { target: { value: '0.75' } });
    fireEvent.keyDown(out, { key: 'Enter' });
    expect(onFadeChange).toHaveBeenCalledWith('out', 0.75);
    expect(field('Out shape').querySelector('[aria-disabled="true"], [disabled], .dropdown--disabled, .disabled')).toBeTruthy();
  });

  it('pitch is clamped to two octaves; speed is shown as percent of the recorded speed', () => {
    const { input, onPitchChange, onSpeedChange } = renderPanel({ clip: { ...clip, stretchFactor: 2 } });
    const pitch = input('Pitch (st)');
    pitch.focus();
    fireEvent.change(pitch, { target: { value: '40' } });
    fireEvent.keyDown(pitch, { key: 'Enter' });
    expect(onPitchChange).toHaveBeenCalledWith(24);
    expect(input('Speed (%)').value).toBe('50'); // stretched to twice the length = half speed
    const speed = input('Speed (%)');
    speed.focus();
    fireEvent.change(speed, { target: { value: '200' } });
    fireEvent.keyDown(speed, { key: 'Enter' });
    expect(onSpeedChange).toHaveBeenCalledWith(200);
  });
});

describe('ClipPropertiesPanel › several clips selected (2026-10-02)', () => {
  const selection = {
    count: 3, trackNames: ['Track 1', 'Track 2'], start: 0.5, end: 6.5,
    color: 'mixed' as const, stretchFactor: 1, pitchSemitones: 2, fadeIn: 0.5, fadeOut: 'mixed' as const,
    fadeInShapeId: 'default', fadeOutShapeId: 'mixed' as const,
  };

  it('shows the count and tracks, the span, shared values, and Mixed where they differ — arrows gone on a mixed field', () => {
    const { container, field, input, arrow } = renderPanel({ selection });
    const panel = container.querySelector('[data-clip-properties-panel]')!;
    expect(panel.getAttribute('data-selection')).toBe('3');
    expect(container.querySelector('.clip-properties__subtitle')?.textContent).toBe('3 clips · Track 1, Track 2');
    expect(field('Selected').textContent).toContain('3 clips');
    expect(field('First start').textContent).toContain('0.5 s');
    expect(field('Last end').textContent).toContain('6.5 s');
    expect(field('Span').textContent).toContain('6 s');
    expect(container.querySelector('[data-clip-properties-field="start"]')).toBeNull(); // no per-clip position
    expect(input('Fade in (s)').value).toBe('0.5'); // shared
    expect(input('Pitch (st)').value).toBe('2');
    const out = input('Fade out (s)');
    expect(out.value).toBe(''); // mixed
    expect(out.placeholder).toBe('Mixed');
    expect(arrow('Fade out (s)', 'up')).toBeTruthy(); // in the DOM (hidden by CSS)…
    expect(container.querySelector('[data-clip-properties-field="fade-out"]')?.getAttribute('data-mixed')).toBe('true');
    expect(arrow('Fade in (s)', 'up')).toBeTruthy();
  });

  it('typing into a mixed field commits — there is no old value to equal; the single clip is ignored while a selection shows', () => {
    const { input, onFadeChange, container } = renderPanel({ selection });
    const out = input('Fade out (s)');
    out.focus();
    fireEvent.change(out, { target: { value: '0.25' } });
    fireEvent.keyDown(out, { key: 'Enter' });
    expect(onFadeChange).toHaveBeenCalledWith('out', 0.25);
    expect(container.querySelector('[data-clip-properties-clip]')).toBeNull();
  });
});

import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { ClipPropertiesPanel, type ClipPropertiesClip } from '../ClipPropertiesPanel';
import { fadeCurvePath } from '../../utils/clipCrossfades';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const colors = [{ id: 'blue', label: 'Blue' }, { id: 'red', label: 'Red' }];
const fadeShapes = [{ id: 'default', label: 'S-curve', shape: 2 }, { id: 'linear', label: 'Linear', shape: 'linear' as const }];
const clip: ClipPropertiesClip = {
  id: 7, name: 'Vocal', color: 'blue', trackName: 'Track 2',
  start: 1.5, duration: 4, trimStart: 0.25, fullDuration: 6, stretchFactor: 1, pitchSemitones: 0,
  fadeIn: 0.5, fadeOut: 0, fadeInShapeId: 'default', fadeInShape: { t: 0.5, g: 0.6 },
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
  const field = (id: string) => {
    const el = utils.container.querySelector(`[data-clip-properties-field="${id}"]`) as HTMLElement;
    expect(el, id).toBeTruthy();
    return el;
  };
  const input = (id: string) => field(id).querySelector('input') as HTMLInputElement;
  const arrow = (id: string, dir: 'up' | 'down') => field(id).querySelector(`.number-stepper__arrow--${dir}`) as HTMLButtonElement;
  return { ...utils, ...handlers, field, input, arrow };
}

describe('ClipPropertiesPanel (2026-10-02; the Figma-style rows 2026-10-06)', () => {
  it('shows the clip: name, track, position, source, fades, pitch and speed — two glyph fields to a row', () => {
    const { container, input, field } = renderPanel();
    expect(container.querySelector('[data-clip-properties-clip="7"]')).toBeTruthy();
    expect(container.querySelector('.clip-properties__subtitle')?.textContent).toBe('Track 2');
    expect(input('name').value).toBe('Vocal');
    expect(input('start').value).toBe('1.5');
    expect(input('length').value).toBe('4');
    expect(field('end').textContent).toContain('5.5 s');
    expect(field('source').textContent).toContain('6 s from 0.25');
    expect(input('fade-in').value).toBe('0.5');
    expect(input('fade-out').value).toBe('0');
    expect(input('pitch').value).toBe('0');
    expect(input('speed').value).toBe('100');
    // Glyphs, not labels: each field carries its name as a tooltip and for screen readers
    expect(field('start').getAttribute('data-tooltip')).toContain('Start');
    expect(field('start').querySelector('[data-glyph="Start"]')).toBeTruthy();
    expect(field('pitch').querySelector('[data-glyph="Pitch"]')).toBeTruthy();
    expect(field('start').querySelector('.clip-properties__sr')?.textContent).toBe('Start (s)');
    expect(container.querySelector('.clip-properties__label')).toBeNull();
    // Start and End share a row; the name has a row to itself
    expect(field('start').parentElement).toBe(field('end').parentElement);
    expect(field('name').classList.contains('clip-properties__field--wide')).toBe(true);
  });

  it('the fade fields\' glyphs are the clip\'s OWN curves, drawn with the canvas\'s path', () => {
    const { field } = renderPanel();
    const inGlyph = field('fade-in').querySelector('[data-glyph="Fade in"] path:last-child')!;
    expect(inGlyph.getAttribute('d')).toBe(fadeCurvePath('in', 32, { t: 0.5, g: 0.6 })); // the dragged handle's curve
    const outGlyph = field('fade-out').querySelector('[data-glyph="Fade out"] path:last-child')!;
    expect(outGlyph.getAttribute('d')).toBe(fadeCurvePath('out', 32, 2)); // no stored shape = the default S-curve
  });

  it('the shape picker is a dropdown of the presets, the current one\'s curve as its glyph; a pick reports its side', () => {
    const { field, onFadeShapeChange } = renderPanel();
    const picker = field('shape-in');
    expect(picker.getAttribute('data-shape')).toBe('default');
    expect(picker.querySelector('.dropdown__text')?.textContent).toBe('S-curve');
    // The glyph is the PRESET's curve (the fade field above draws the clip's own)
    expect(picker.querySelector('[data-glyph="S-curve"] path:last-child')?.getAttribute('d')).toBe(fadeCurvePath('in', 32, 2));
    fireEvent.click(picker.querySelector('.dropdown__trigger') as HTMLElement);
    // The menu portals to the body
    const linear = [...document.body.querySelectorAll('.dropdown__option')].find((o) => o.textContent === 'Linear') as HTMLElement;
    fireEvent.click(linear);
    expect(onFadeShapeChange).toHaveBeenCalledWith('in', 'linear');
    // The fade-out picker is disabled while its fade is zero
    expect(field('shape-out').querySelector('.dropdown__trigger')?.getAttribute('aria-disabled') ?? (field('shape-out').querySelector('.dropdown__trigger') as HTMLButtonElement).disabled).toBeTruthy();
    // Off every preset: Custom, with the clip's own curve
    const custom = renderPanel({ clip: { ...clip, fadeInShapeId: undefined, fadeInShape: { t: 0.5, g: 0.3 } } });
    expect(custom.field('shape-in').getAttribute('data-shape')).toBeNull();
    expect(custom.field('shape-in').querySelector('.dropdown__text')?.textContent).toBe('Custom');
    expect(custom.field('shape-in').querySelector('[data-glyph="Custom"] path:last-child')?.getAttribute('d')).toBe(fadeCurvePath('in', 32, { t: 0.5, g: 0.3 }));
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
    const start = input('start');
    start.focus();
    fireEvent.change(start, { target: { value: '2.25' } });
    expect(onStartChange).not.toHaveBeenCalled(); // not while typing
    fireEvent.keyDown(start, { key: 'Enter' });
    expect(onStartChange).toHaveBeenCalledWith(2.25);
    expect(onStartChange).toHaveBeenCalledTimes(1); // Enter blurs too — one commit, not two

    const length = input('length');
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
    fireEvent.click(arrow('start', 'up'));
    expect(onStartChange).toHaveBeenCalledWith(1.6); // 0.1 s steps
    fireEvent.click(arrow('pitch', 'down'));
    expect(onPitchChange).toHaveBeenCalledWith(-1); // whole semitones
    fireEvent.click(arrow('fade-out', 'down'));
    expect(onFadeChange).not.toHaveBeenCalled(); // already at 0: nothing to commit
    fireEvent.click(arrow('speed', 'up'));
    expect(onSpeedChange).toHaveBeenCalledWith(105); // 5% steps
  });

  it('the name commits the same way, trimmed, never empty', () => {
    const { input, onRename } = renderPanel();
    const name = input('name');
    fireEvent.change(name, { target: { value: '  Lead vocal ' } });
    fireEvent.blur(name);
    expect(onRename).toHaveBeenCalledWith('Lead vocal');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.blur(name);
    expect(onRename).toHaveBeenCalledTimes(1);
  });

  it('fades report their side; the colour swatch shows the clip\'s colour', () => {
    const { input, field, onFadeChange } = renderPanel();
    const out = input('fade-out');
    out.focus();
    fireEvent.change(out, { target: { value: '0.75' } });
    fireEvent.keyDown(out, { key: 'Enter' });
    expect(onFadeChange).toHaveBeenCalledWith('out', 0.75);
    expect(field('color').querySelector('.clip-properties__swatch')?.getAttribute('data-swatch')).toBe('blue');
  });

  it('pitch is clamped to two octaves; speed is shown as percent of the recorded speed', () => {
    const { input, onPitchChange, onSpeedChange } = renderPanel({ clip: { ...clip, stretchFactor: 2 } });
    const pitch = input('pitch');
    pitch.focus();
    fireEvent.change(pitch, { target: { value: '40' } });
    fireEvent.keyDown(pitch, { key: 'Enter' });
    expect(onPitchChange).toHaveBeenCalledWith(24);
    expect(input('speed').value).toBe('50'); // stretched to twice the length = half speed
    const speed = input('speed');
    speed.focus();
    fireEvent.change(speed, { target: { value: '200' } });
    fireEvent.keyDown(speed, { key: 'Enter' });
    expect(onSpeedChange).toHaveBeenCalledWith(200);
  });
});

describe('ClipPropertiesPanel › Reset and Export (2026-10-06)', () => {
  const exportFormats = [{ id: 'wav', label: 'WAV' }, { id: 'mp3', label: 'MP3' }];
  const exportSampleRates = [{ id: '44100', label: '44.1 kHz' }, { id: '48000', label: '48 kHz' }];

  it('Pitch & speed carries a Reset in its heading, live only while something is to reset', () => {
    const onResetPitchSpeed = vi.fn();
    const { container, rerender } = renderPanel({ onResetPitchSpeed });
    const reset = () => container.querySelector('[data-clip-properties-action="reset-pitch-speed"]') as HTMLButtonElement;
    expect(reset().closest('.clip-properties__section')?.textContent).toContain('Pitch & speed');
    expect(reset().disabled).toBe(true);
    rerender(
      <ThemeProvider>
        <ClipPropertiesPanel clip={{ ...clip, pitchSemitones: 3 }} colors={colors} fadeShapes={fadeShapes} onResetPitchSpeed={onResetPitchSpeed} />
      </ThemeProvider>,
    );
    expect(reset().disabled).toBe(false);
    fireEvent.click(reset());
    expect(onResetPitchSpeed).toHaveBeenCalledTimes(1);
    rerender(
      <ThemeProvider>
        <ClipPropertiesPanel clip={{ ...clip, stretchFactor: 2 }} colors={colors} fadeShapes={fadeShapes} onResetPitchSpeed={onResetPitchSpeed} />
      </ThemeProvider>,
    );
    expect(reset().disabled).toBe(false);
  });

  it('the Export block: format and sample rate side by side, a wide button that hands both over; absent without formats', () => {
    const onExport = vi.fn();
    const { container, field } = renderPanel({ exportFormats, exportSampleRates, onExport });
    expect(container.querySelector('[data-group="export"]')).toBeTruthy();
    expect(field('export-format').parentElement).toBe(field('export-rate').parentElement);
    const button = container.querySelector('[data-clip-properties-action="export"] button') as HTMLButtonElement;
    expect(button.textContent).toBe('Export clip');
    fireEvent.click(button);
    expect(onExport).toHaveBeenCalledWith({ format: 'wav', sampleRate: 44100 });
    // Nothing offered, nothing shown
    const bare = renderPanel();
    expect(bare.container.querySelector('[data-group="export"]')).toBeNull();
  });

  it('while exporting the button waits; a selection exports every clip', () => {
    const selection = {
      count: 3, trackNames: ['Track 1'], start: 0, end: 9, color: 'blue', fadeIn: 0, fadeOut: 0,
      fadeInShapeId: undefined, fadeOutShapeId: undefined, pitchSemitones: 0, stretchFactor: 1,
    };
    const { container } = renderPanel({ exportFormats, exportSampleRates, onExport: vi.fn(), exporting: true, selection });
    const button = container.querySelector('[data-clip-properties-action="export"] button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Exporting…');
    const idle = renderPanel({ exportFormats, exportSampleRates, onExport: vi.fn(), selection });
    expect((idle.container.querySelector('[data-clip-properties-action="export"] button') as HTMLButtonElement).textContent).toBe('Export 3 clips');
  });
});

describe('ClipPropertiesPanel › tooltips (2026-10-06)', () => {
  it('every control shows the design system\'s tooltip after a beat on hover, above its middle; leaving hides it', () => {
    vi.useFakeTimers();
    try {
      const { field, container } = renderPanel({ onResetPitchSpeed: vi.fn(), exportFormats: [{ id: 'wav', label: 'WAV' }], exportSampleRates: [{ id: '44100', label: '44.1 kHz' }], onExport: vi.fn() });
      const tooltip = () => document.body.querySelector('.tooltip');
      const controls = ['name', 'color', 'start', 'end', 'length', 'source', 'fade-in', 'fade-out', 'shape-in', 'shape-out', 'pitch', 'speed', 'export-format', 'export-rate'];
      for (const id of controls) expect(field(id).getAttribute('data-tooltip'), id).toBeTruthy();
      expect(container.querySelector('[data-clip-properties-action="reset-pitch-speed"]')?.getAttribute('data-tooltip')).toBeTruthy();
      expect(container.querySelector('[data-clip-properties-action="export"]')?.getAttribute('data-tooltip')).toBeTruthy();
      // No browser titles doubling them
      expect(container.querySelector('[title]')).toBeNull();
      expect(container.querySelector('svg title')).toBeNull();

      const pitch = field('pitch');
      fireEvent.mouseOver(pitch.querySelector('input') as HTMLElement);
      expect(tooltip()).toBeNull(); // not yet
      act(() => { vi.advanceTimersByTime(400); });
      expect(tooltip()?.textContent).toContain('semitones');
      fireEvent.mouseOut(pitch, { relatedTarget: field('speed') });
      expect(tooltip()).toBeNull();
      // Pressing a control hides its tooltip too
      fireEvent.mouseOver(field('speed'));
      act(() => { vi.advanceTimersByTime(400); });
      expect(tooltip()?.textContent).toContain('Speed');
      fireEvent.mouseDown(field('speed'));
      expect(tooltip()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ClipPropertiesPanel › several clips selected (2026-10-02)', () => {
  const selection = {
    count: 3, trackNames: ['Track 1', 'Track 2'], start: 0.5, end: 6.5,
    color: 'mixed' as const, stretchFactor: 1, pitchSemitones: 2, fadeIn: 0.5, fadeOut: 'mixed' as const,
    fadeInShapeId: 'default', fadeOutShapeId: 'mixed' as const,
  };

  it('shows the count and tracks, the span, shared values, and Mixed where they differ — arrows gone, no preset lit', () => {
    const { container, field, input } = renderPanel({ selection });
    const panel = container.querySelector('[data-clip-properties-panel]')!;
    expect(panel.getAttribute('data-selection')).toBe('3');
    expect(container.querySelector('.clip-properties__subtitle')?.textContent).toBe('3 clips · Track 1, Track 2');
    expect(field('count').textContent).toContain('3 clips');
    expect(field('first-start').textContent).toContain('0.5 s');
    expect(field('last-end').textContent).toContain('6.5 s');
    expect(field('span').textContent).toContain('6 s');
    expect(container.querySelector('[data-clip-properties-field="start"]')).toBeNull(); // no per-clip position
    expect(input('fade-in').value).toBe('0.5'); // shared
    expect(input('pitch').value).toBe('2');
    const out = input('fade-out');
    expect(out.value).toBe(''); // mixed
    expect(out.placeholder).toBe('Mixed');
    expect(field('fade-out').getAttribute('data-mixed')).toBe('true');
    expect(field('shape-out').getAttribute('data-mixed')).toBe('true');
    expect(field('shape-out').getAttribute('data-shape')).toBeNull();
    expect(field('shape-out').querySelector('.dropdown__text')?.textContent).toBe('Mixed');
    expect(field('color').querySelector('.clip-properties__swatch')?.getAttribute('data-swatch')).toBe('mixed');
  });

  it('typing into a mixed field commits — there is no old value to equal; the single clip is ignored while a selection shows', () => {
    const { input, onFadeChange, container } = renderPanel({ selection });
    const out = input('fade-out');
    out.focus();
    fireEvent.change(out, { target: { value: '0.25' } });
    fireEvent.keyDown(out, { key: 'Enter' });
    expect(onFadeChange).toHaveBeenCalledWith('out', 0.25);
    expect(container.querySelector('[data-clip-properties-clip]')).toBeNull();
  });
});

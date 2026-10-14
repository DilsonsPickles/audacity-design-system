import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { ThemeProvider } from '@audacity-ui/components';
import { FadeDialog, FADE_MIXED, type FadeDialogValues } from '../FadeDialog';

afterEach(cleanup);

const PRESETS = [
  { id: 'default', label: 'S-curve' },
  { id: 'linear', label: 'Linear' },
  { id: 'equal-power', label: 'Equal power' },
];

function setup(values: FadeDialogValues, extra: Partial<React.ComponentProps<typeof FadeDialog>> = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <ThemeProvider>
      <FadeDialog
        isOpen
        targetCount={1}
        values={values}
        maxSeconds={4}
        presets={PRESETS}
        focusSide="in"
        onApply={onApply}
        onClose={onClose}
        {...extra}
      />
    </ThemeProvider>,
  );
  const length = (side: 'in' | 'out') => document.body.querySelector<HTMLInputElement>(`[data-fade-dialog-length="${side}"] input`)!;
  const shape = (side: 'in' | 'out') => document.body.querySelector<HTMLElement>(`[data-fade-dialog-shape="${side}"]`)!;
  const applyButton = () => screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement;
  return { ...utils, onApply, onClose, length, shape, applyButton };
}

const single: FadeDialogValues = { in: { seconds: 1, shape: 'default' }, out: { seconds: 0.5, shape: 'linear' } };

describe('the fades dialog (2026-10-13)', () => {
  it('prefills both fades, focuses the side it was opened for, and applies only what changed', async () => {
    const { length, shape, applyButton, onApply, onClose } = setup(single, { focusSide: 'out' });
    expect(length('in').value).toBe('1');
    expect(length('out').value).toBe('0.5');
    expect(shape('in').getAttribute('data-shape')).toBe('default');
    expect(shape('out').getAttribute('data-shape')).toBe('linear');
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(length('out'));
    // Nothing changed yet: nothing to apply
    expect(applyButton().disabled).toBe(true);
    fireEvent.change(length('in'), { target: { value: '2' } });
    expect(applyButton().disabled).toBe(false);
    fireEvent.click(applyButton());
    expect(onApply).toHaveBeenCalledWith({ fadeIn: 2 });
    expect(onClose).toHaveBeenCalled();
  });

  it('Enter in a length field applies, clamped to the shortest target; a shape pick goes through the dropdown', () => {
    const { length, shape, onApply } = setup(single);
    fireEvent.change(length('out'), { target: { value: '9' } });
    fireEvent.click(shape('in').querySelector('.dropdown__trigger') as HTMLElement);
    const linear = [...document.body.querySelectorAll('.dropdown__option')].find((o) => o.textContent === 'Linear') as HTMLElement;
    fireEvent.click(linear);
    expect(shape('in').getAttribute('data-shape')).toBe('linear');
    fireEvent.keyDown(length('out'), { key: 'Enter' });
    expect(onApply).toHaveBeenCalledWith({ fadeOut: 4, fadeInShape: 'linear' });
  });

  it('a mixed selection shows blank "Mixed" fields; left alone they stay out of the edits, typed they apply to all', () => {
    const mixed: FadeDialogValues = { in: { seconds: FADE_MIXED, shape: FADE_MIXED }, out: { seconds: 0.5, shape: undefined } };
    const { length, shape, applyButton, onApply } = setup(mixed, { targetCount: 3 });
    expect(screen.getByText('Fades — 3 clips')).toBeTruthy();
    expect(length('in').value).toBe('');
    expect(length('in').placeholder).toBe('Mixed');
    expect(shape('in').querySelector('.dropdown__text')?.textContent).toBe('Mixed');
    // A shape between presets reads Custom
    expect(shape('out').querySelector('.dropdown__text')?.textContent).toBe('Custom');
    // Blank mixed fields are valid as "leave them"; only the typed one applies
    fireEvent.change(length('out'), { target: { value: '1' } });
    fireEvent.click(applyButton());
    expect(onApply).toHaveBeenCalledWith({ fadeOut: 1 });
  });

  it('a non-number in a changed length disables Apply; Escape cancels', () => {
    const { length, applyButton, onApply, onClose } = setup(single);
    fireEvent.change(length('in'), { target: { value: '-1' } });
    expect(applyButton().disabled).toBe(true);
    fireEvent.keyDown(length('in'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe('live preview (2026-10-14)', () => {
  it('every valid change goes out through onPreview as the edits so far; nothing on open; a field typed back sends an empty edit', async () => {
    const onPreview = vi.fn();
    const { length } = setup(single, { onPreview });
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(onPreview).not.toHaveBeenCalled();
    fireEvent.change(length('in'), { target: { value: '2' } });
    expect(onPreview).toHaveBeenLastCalledWith({ fadeIn: 2 });
    fireEvent.change(length('out'), { target: { value: '0.25' } });
    expect(onPreview).toHaveBeenLastCalledWith({ fadeIn: 2, fadeOut: 0.25 });
    fireEvent.change(length('in'), { target: { value: String(single.in.seconds) } });
    expect(onPreview).toHaveBeenLastCalledWith({ fadeOut: 0.25 });
    fireEvent.change(length('out'), { target: { value: 'x' } }); // invalid: no preview
    const calls = onPreview.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    fireEvent.change(length('out'), { target: { value: 'xy' } });
    expect(onPreview.mock.calls.length).toBe(calls);
  });
});

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { LabeledCheckbox } from '../LabeledCheckbox';
import { LabeledRadio } from '../../LabeledRadio/LabeledRadio';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('disabled dims the whole control, label included (2026-10-19)', () => {
  it('a disabled labelled checkbox and radio carry the disabled class on the pair, not the box alone', () => {
    const { container } = render(
      <ThemeProvider>
        <LabeledCheckbox label="Quit Audacity" disabled />
        <LabeledCheckbox label="Save project" />
        <LabeledRadio label="Until a time" disabled />
      </ThemeProvider>,
    );
    const boxes = container.querySelectorAll('.labeled-checkbox');
    expect(boxes[0].classList.contains('labeled-checkbox--disabled')).toBe(true);
    expect(boxes[0].getAttribute('data-disabled')).toBe('true');
    expect(boxes[1].classList.contains('labeled-checkbox--disabled')).toBe(false);
    expect(container.querySelector('.labeled-radio')?.classList.contains('labeled-radio--disabled')).toBe(true);
  });
});

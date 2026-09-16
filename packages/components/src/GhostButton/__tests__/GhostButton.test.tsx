import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { GhostButton } from '../GhostButton';

afterEach(cleanup);

function renderButton(props: React.ComponentProps<typeof GhostButton> = {}) {
  return render(
    <ThemeProvider>
      <GhostButton ariaLabel="probe" {...props} />
    </ThemeProvider>,
  );
}

describe('GhostButton variants (Figma kebab rule)', () => {
  it('defaults to the ghost variant', () => {
    const { container } = renderButton();
    const button = container.querySelector('button')!;
    expect(button.className).toContain('ghost-button--variant-ghost');
  });

  it('the solid variant swaps in the secondary-button surface tokens', () => {
    const { container: ghost } = renderButton();
    const { container: solid } = renderButton({ variant: 'solid' });
    const ghostButton = ghost.querySelector('button')!;
    const solidButton = solid.querySelector('button')!;
    expect(solidButton.className).toContain('ghost-button--variant-solid');
    // Same custom property, different token family behind it
    const ghostIdle = ghostButton.style.getPropertyValue('--ghost-bg-idle');
    const solidIdle = solidButton.style.getPropertyValue('--ghost-bg-idle');
    expect(solidIdle).not.toBe('');
    expect(solidIdle).not.toBe(ghostIdle);
  });

  it('the compact size renders at 24px to pair with Button size="small"', () => {
    const { container } = renderButton({ size: 'compact', variant: 'solid' });
    expect(container.querySelector('button')!.className).toContain('ghost-button--compact');
  });
});

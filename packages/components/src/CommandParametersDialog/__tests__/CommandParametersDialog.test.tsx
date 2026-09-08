import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { CommandParametersDialog, type CommandParameter } from '../CommandParametersDialog';
import { parseMacroParameters, serializeMacroParameters } from '../macroParams';

afterEach(cleanup);

const PARAMS: CommandParameter[] = [
  { key: 'Start', label: 'Start time', type: 'number', defaultValue: '0' },
  { key: 'End', label: 'End time', type: 'number', defaultValue: '0' },
  {
    key: 'RelativeTo', label: 'Relative to', type: 'enum', defaultValue: 'ProjectStart',
    options: [
      { value: 'ProjectStart', label: 'Project start' },
      { value: 'ProjectEnd', label: 'Project end' },
    ],
  },
  {
    key: 'Mode', label: 'Mode', type: 'enum', defaultValue: 'Set', optional: false,
    options: [{ value: 'Set', label: 'Set' }, { value: 'Add', label: 'Add' }],
  },
];

function renderDialog(props: Partial<React.ComponentProps<typeof CommandParametersDialog>> = {}) {
  return render(
    <ThemeProvider>
      <CommandParametersDialog
        isOpen
        commandName="Select"
        parameters={PARAMS}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('macroParams', () => {
  it('round-trips a parameters string', () => {
    const str = 'Start="1", End="2.5", RelativeTo="ProjectStart"';
    const parsed = parseMacroParameters(str);
    expect(parsed).toEqual({ Start: '1', End: '2.5', RelativeTo: 'ProjectStart' });
    expect(serializeMacroParameters(Object.entries(parsed))).toBe(str);
  });

  it('handles empty and missing input', () => {
    expect(parseMacroParameters('')).toEqual({});
    expect(parseMacroParameters(undefined)).toEqual({});
    expect(serializeMacroParameters([])).toBe('');
  });
});

describe('CommandParametersDialog', () => {
  it('renders a checkbox-gated row per optional parameter and the required control', () => {
    const { container, getByText } = renderDialog();
    expect(container.querySelectorAll('.command-parameters__row')).toHaveLength(3);
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(3);
    expect(getByText('Mode')).not.toBeNull();
    // Required params get no checkbox
    expect(container.querySelector('.command-parameters__required [role="checkbox"]')).toBeNull();
  });

  it('serializes all defaults for a fresh step (everything checked)', () => {
    const onSubmit = vi.fn();
    const { getByText } = renderDialog({ onSubmit, initialParameters: '' });
    fireEvent.click(getByText('OK'));
    expect(onSubmit).toHaveBeenCalledWith('Start="0", End="0", RelativeTo="ProjectStart", Mode="Set"');
  });

  it('seeds values from the step and unchecks parameters absent from it', () => {
    const onSubmit = vi.fn();
    const { getByText } = renderDialog({
      onSubmit,
      initialParameters: 'Start="3", Mode="Add"',
    });
    fireEvent.click(getByText('OK'));
    // End and RelativeTo were absent → unchecked → omitted; Mode is required
    expect(onSubmit).toHaveBeenCalledWith('Start="3", Mode="Add"');
  });

  it('unchecking a parameter omits it; editing a value serializes it', () => {
    const onSubmit = vi.fn();
    const { container, getByText } = renderDialog({ onSubmit, initialParameters: '' });
    const startInput = container.querySelector<HTMLInputElement>('input[aria-label="Start time"]');
    fireEvent.change(startInput!, { target: { value: '42' } });
    fireEvent.click(container.querySelector('[role="checkbox"][aria-label="End time"]')!);
    fireEvent.click(getByText('OK'));
    expect(onSubmit).toHaveBeenCalledWith('Start="42", RelativeTo="ProjectStart", Mode="Set"');
  });

  it('disables the control of an unchecked parameter', () => {
    const { container } = renderDialog({ initialParameters: 'Start="1", Mode="Set"' });
    const endInput = container.querySelector<HTMLInputElement>('input[aria-label="End time"]');
    expect(endInput?.disabled).toBe(true);
    const startInput = container.querySelector<HTMLInputElement>('input[aria-label="Start time"]');
    expect(startInput?.disabled).toBe(false);
  });

  it('shows the empty state for a command without parameters', () => {
    const { container } = renderDialog({ parameters: [] });
    expect(container.querySelector('.command-parameters__empty')?.textContent)
      .toContain('no adjustable parameters');
  });

  it('Cancel closes without submitting', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const { getByText } = renderDialog({ onSubmit, onClose });
    fireEvent.click(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

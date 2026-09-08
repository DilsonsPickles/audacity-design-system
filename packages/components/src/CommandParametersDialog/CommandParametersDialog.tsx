import React from 'react';
import { Dialog } from '../Dialog';
import { Footer } from '../Footer/Footer';
import { LabeledCheckbox } from '../LabeledCheckbox';
import { Dropdown, type DropdownOption } from '../Dropdown';
import { parseMacroParameters, serializeMacroParameters } from './macroParams';
import './CommandParametersDialog.css';

export interface CommandParameter {
  /** Serialized parameter name, e.g. "Start" */
  key: string;
  /** Display label, e.g. "Start time" */
  label: string;
  /** Control type. 'enum' renders a Dropdown of `options`. */
  type: 'number' | 'text' | 'enum';
  /** Default value (string form, as it would be serialized) */
  defaultValue: string;
  /** Options for 'enum' parameters */
  options?: DropdownOption[];
  /**
   * Optional parameters render as a checkbox-gated row and are omitted from
   * the serialized string when unchecked. Non-optional parameters (e.g. a
   * command's Mode) render as a full-width labeled control and are always
   * serialized. @default true
   */
  optional?: boolean;
}

export interface CommandParametersDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Command name shown as the dialog title */
  commandName: string;
  /** The command's parameter schema (empty = command takes no parameters) */
  parameters: CommandParameter[];
  /** The step's current serialized parameters string — parsed for initial
   *  values; keys absent from it start unchecked (unless it is empty, in
   *  which case every parameter starts checked with its default). */
  initialParameters?: string;
  /** Called with the new serialized parameters string when OK is clicked */
  onSubmit?: (parameters: string) => void;
  /** Called when the dialog should close without applying */
  onClose?: () => void;
  /** Operating system for platform-specific header controls */
  os?: 'macos' | 'windows';
}

/**
 * CommandParametersDialog — parameter-editing window for one macro step's
 * command. Optional parameters are checkbox-gated (unchecked = omitted from
 * the serialized string); required ones always serialize. OK reports the
 * whole parameters string rebuilt in schema order.
 */
export function CommandParametersDialog({
  isOpen,
  commandName,
  parameters,
  initialParameters,
  onSubmit,
  onClose,
  os = 'macos',
}: CommandParametersDialogProps) {
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({});
  const [values, setValues] = React.useState<Record<string, string>>({});

  // Seed state from the step's current parameters each time the dialog opens
  React.useEffect(() => {
    if (!isOpen) return;
    const parsed = parseMacroParameters(initialParameters);
    const hasExisting = Object.keys(parsed).length > 0;
    const nextEnabled: Record<string, boolean> = {};
    const nextValues: Record<string, string> = {};
    for (const param of parameters) {
      nextValues[param.key] = parsed[param.key] ?? param.defaultValue;
      nextEnabled[param.key] = param.optional === false
        || !hasExisting
        || param.key in parsed;
    }
    setEnabled(nextEnabled);
    setValues(nextValues);
  }, [isOpen, initialParameters, parameters]);

  const handleOk = () => {
    const entries: Array<[string, string]> = [];
    for (const param of parameters) {
      if (param.optional === false || enabled[param.key]) {
        entries.push([param.key, values[param.key] ?? param.defaultValue]);
      }
    }
    onSubmit?.(serializeMacroParameters(entries));
    onClose?.();
  };

  const renderControl = (param: CommandParameter, isEnabled: boolean) => {
    if (param.type === 'enum') {
      return (
        <Dropdown
          options={param.options ?? []}
          value={values[param.key] ?? param.defaultValue}
          disabled={!isEnabled}
          onChange={(value) => setValues((prev) => ({ ...prev, [param.key]: value }))}
        />
      );
    }
    return (
      <input
        className="command-parameters__input"
        type="text"
        inputMode={param.type === 'number' ? 'decimal' : undefined}
        value={values[param.key] ?? param.defaultValue}
        disabled={!isEnabled}
        aria-label={param.label}
        onChange={(e) => setValues((prev) => ({ ...prev, [param.key]: e.target.value }))}
      />
    );
  };

  const optionalParams = parameters.filter((p) => p.optional !== false);
  const requiredParams = parameters.filter((p) => p.optional === false);

  return (
    <Dialog
      isOpen={isOpen}
      title={commandName}
      onClose={onClose}
      os={os}
      width={480}
      minHeight={0}
      footer={
        <Footer
          primaryText="OK"
          secondaryText="Cancel"
          onPrimaryClick={handleOk}
          onSecondaryClick={onClose}
        />
      }
    >
      <div className="command-parameters">
        {parameters.length === 0 && (
          <div className="command-parameters__empty">
            This command has no adjustable parameters.
          </div>
        )}

        {optionalParams.map((param) => (
          <div key={param.key} className="command-parameters__row">
            <LabeledCheckbox
              label={param.label}
              checked={enabled[param.key] ?? true}
              onChange={(checked) => setEnabled((prev) => ({ ...prev, [param.key]: checked }))}
            />
            <div className="command-parameters__control">
              {renderControl(param, enabled[param.key] ?? true)}
            </div>
          </div>
        ))}

        {requiredParams.map((param) => (
          <div key={param.key} className="command-parameters__required">
            <span className="command-parameters__required-label">{param.label}</span>
            {renderControl(param, true)}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

export default CommandParametersDialog;

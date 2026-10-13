import React from 'react';
import { useTheme } from '../ThemeProvider';
import './SearchField.css';

export interface SearchFieldProps {
  /**
   * Current value of the search field
   */
  value?: string;
  /**
   * Placeholder text
   * @default "Search"
   */
  placeholder?: string;
  /**
   * Whether the field is disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Callback when value changes
   */
  onChange?: (value: string) => void;
  /**
   * Callback when the clear button is clicked
   */
  onClear?: () => void;
  /**
   * Callback when Enter key is pressed
   */
  onSubmit?: (value: string) => void;
  /**
   * Width of the search field
   * @default 162
   */
  width?: number;
  /**
   * Optional className for custom styling
   */
  className?: string;
  /** 'large' is the command palette's field: 40px, 13px text (2026-10-13) */
  size?: 'default' | 'large';
  /** Fill the container instead of the fixed `width` */
  fullWidth?: boolean;
  /** Attributes for the input itself — a role, aria-*, data-* (the
   *  palette's combobox wiring); never value, onChange or placeholder */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'placeholder' | 'disabled' | 'type'>;
}

/**
 * SearchField component
 * - Height: 28px
 * - Border: 1px solid
 * - States: Idle, Hover, Active, Disabled
 * - Shows clear button when value is present
 */
export function SearchField({
  value = '',
  placeholder = 'Search',
  disabled = false,
  onChange,
  onClear,
  onSubmit,
  width = 162,
  className = '',
  size = 'default',
  fullWidth = false,
  inputProps,
}: SearchFieldProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const style = {
    // Themed input surface, not a hardcoded white: light value is #FFFFFF
    // (unchanged) while dark mode gets the dark input background.
    '--search-field-bg': theme.background.control.input.idle,
    '--search-field-border': theme.border.input.idle,
    '--search-field-border-hover': theme.border.input.hover,
    '--search-field-border-focus': theme.border.focus,
    '--search-field-icon': theme.foreground.icon.primary,
    '--search-field-text': theme.foreground.text.primary,
    '--search-field-placeholder': theme.foreground.text.secondary,
    '--search-field-clear-hover': theme.background.surface.hover,
    '--search-field-clear-active': theme.background.surface.subtle,
  } as React.CSSProperties;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    onChange?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit?.(value);
    }
  };

  const hasValue = value.length > 0;

  return (
    <div
      className={`search-field ${isFocused ? 'search-field--focused' : ''} ${disabled ? 'search-field--disabled' : ''} ${size === 'large' ? 'search-field--large' : ''} ${className}`}
      style={{ width: fullWidth ? '100%' : `${width}px`, ...style }}
    >
      <span className="search-field__icon">
        {/* Zoom/Search icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 10.5L14 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        className="search-field__input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={(e) => { setIsFocused(true); inputProps?.onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); inputProps?.onBlur?.(e); }}
        onKeyDown={(e) => { handleKeyDown(e); inputProps?.onKeyDown?.(e); }}
      />
      {hasValue && !disabled && (
        <button
          className="search-field__clear"
          onClick={handleClear}
          tabIndex={-1}
          type="button"
        >
          {/* Times/X icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

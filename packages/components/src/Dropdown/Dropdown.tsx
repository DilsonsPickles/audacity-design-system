import React, { useState, useRef, useEffect } from 'react';
import '../assets/fonts/musescore-icon.css';
import './Dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  /**
   * Available options
   */
  options: DropdownOption[];
  /**
   * Current value
   */
  value?: string;
  /**
   * Placeholder text when no value selected
   */
  placeholder?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Change handler
   */
  onChange?: (value: string) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Width of the dropdown (CSS value)
   */
  width?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = 'Select option',
  disabled = false,
  onChange,
  className = '',
  width = '162px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setHoveredIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setHoveredIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };

  const getStateClass = () => {
    if (disabled) return 'dropdown--disabled';
    if (isOpen) return 'dropdown--active';
    return '';
  };

  return (
    <div
      ref={dropdownRef}
      className={`dropdown ${className}`}
      style={{ width }}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`dropdown__trigger ${getStateClass()}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="dropdown__text">{displayText}</span>
        <span className="dropdown__icon musescore-icon">{'\uEF12'}</span>
      </button>

      {isOpen && !disabled && (
        <div className="dropdown__menu" role="listbox">
          {options.map((option, index) => (
            <div
              key={option.value}
              className={`dropdown__option ${
                option.value === value ? 'dropdown__option--selected' : ''
              } ${hoveredIndex === index ? 'dropdown__option--hover' : ''}`}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(-1)}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

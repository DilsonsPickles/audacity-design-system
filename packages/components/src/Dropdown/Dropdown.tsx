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
  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = 'Select option',
  disabled = false,
  onChange,
  className = '',
  width,
  tabIndex,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);
      if (newIsOpen) {
        // Set initial hovered index to the first item when opening
        setHoveredIndex(0);
      }
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setHoveredIndex(-1);
    // Return focus to trigger button after selection
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen) {
        // If dropdown is open and an item is hovered, select it
        if (hoveredIndex >= 0 && hoveredIndex < options.length) {
          handleSelect(options[hoveredIndex].value);
        }
      } else {
        // If dropdown is closed, open it
        handleToggle();
      }
    } else if (e.key === 'Escape' && isOpen) {
      // Only handle Escape if dropdown is open
      e.preventDefault();
      e.stopPropagation(); // Prevent Dialog from closing
      setIsOpen(false);
      setHoveredIndex(-1);
      // Return focus to the trigger button
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    } else if (e.key === 'ArrowDown' && isOpen) {
      // Only handle arrow keys when dropdown is already open
      e.preventDefault();
      setHoveredIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp' && isOpen) {
      // Only handle arrow keys when dropdown is already open
      e.preventDefault();
      setHoveredIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
    // When dropdown is closed, arrow keys will be handled by parent (TabGroupField)
  };

  // Focus management: when dropdown opens, focus the menu
  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus();
    }
  }, [isOpen]);

  const getStateClass = () => {
    if (disabled) return 'dropdown--disabled';
    if (isOpen) return 'dropdown--active';
    return '';
  };

  return (
    <div
      ref={dropdownRef}
      className={`dropdown ${className}`}
      style={width ? { width } : undefined}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`dropdown__trigger ${getStateClass()}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        tabIndex={tabIndex}
      >
        <span className="dropdown__text">{displayText}</span>
        <span className="dropdown__icon musescore-icon">{'\uEF12'}</span>
      </button>

      {isOpen && !disabled && (
        <div
          ref={menuRef}
          className="dropdown__menu"
          role="listbox"
          tabIndex={-1}
        >
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

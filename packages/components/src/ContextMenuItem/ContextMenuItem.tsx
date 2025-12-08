import React, { useState, useRef, useEffect } from 'react';
import './ContextMenuItem.css';

export interface ContextMenuItemProps {
  /**
   * Label text for the menu item
   */
  label: string;

  /**
   * Click handler for the menu item
   */
  onClick?: () => void;

  /**
   * Whether the item is disabled
   */
  disabled?: boolean;

  /**
   * Child menu items for submenu
   */
  children?: React.ReactNode;

  /**
   * Whether this item has a submenu
   */
  hasSubmenu?: boolean;

  /**
   * Icon to display before the label
   */
  icon?: React.ReactNode;

  /**
   * Callback when submenu should close
   */
  onClose?: () => void;
}

/**
 * ContextMenuItem - A single item in a context menu
 * Supports nested submenus via children prop
 */
export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  label,
  onClick,
  disabled = false,
  children,
  hasSubmenu = false,
  icon,
  onClose,
}) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;

    if (hasSubmenu || children) {
      e.stopPropagation();
      setSubmenuOpen(!submenuOpen);
    } else {
      onClick?.();
      onClose?.();
    }
  };

  const handleMouseEnter = () => {
    if (hasSubmenu || children) {
      setSubmenuOpen(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Check if mouse is moving to submenu
    if (submenuRef.current && e.relatedTarget instanceof Node) {
      if (submenuRef.current.contains(e.relatedTarget)) {
        return;
      }
    }
    setSubmenuOpen(false);
  };

  // Close submenu when clicking outside
  useEffect(() => {
    if (!submenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [submenuOpen]);

  return (
    <div
      ref={itemRef}
      className={`context-menu-item ${disabled ? 'disabled' : ''} ${submenuOpen ? 'submenu-open' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="context-menu-item-content">
        {icon && <span className="context-menu-item-icon">{icon}</span>}
        <span className="context-menu-item-label">{label}</span>
        {(hasSubmenu || children) && (
          <span className="context-menu-item-arrow">▸</span>
        )}
      </div>

      {(hasSubmenu || children) && submenuOpen && (
        <div ref={submenuRef} className="context-menu-submenu">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { onClose } as any);
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
};

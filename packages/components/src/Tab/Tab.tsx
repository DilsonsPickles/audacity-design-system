import React from 'react';
import './Tab.css';

export interface TabProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Tab({
  label,
  isActive = false,
  onClick,
  className = '',
}: TabProps) {
  return (
    <button
      className={`tab ${isActive ? 'tab--active' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      <span className="tab__label">{label}</span>
    </button>
  );
}

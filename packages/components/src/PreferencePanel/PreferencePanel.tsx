import React from 'react';
import './PreferencePanel.css';

export interface PreferencePanelProps {
  /**
   * Title text for the panel
   */
  title?: string;
  /**
   * Child content (typically radio buttons or other form elements)
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const PreferencePanel: React.FC<PreferencePanelProps> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <div className={`preference-panel ${className}`}>
      {title && <h4 className="preference-panel__title">{title}</h4>}
      <div className="preference-panel__content">
        {children}
      </div>
    </div>
  );
};

export default PreferencePanel;

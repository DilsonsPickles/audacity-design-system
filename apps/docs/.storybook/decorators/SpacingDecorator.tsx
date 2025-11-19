import React, { useEffect, useState } from 'react';
import type { Decorator } from '@storybook/react';

// Styles for the spacing overlay
const overlayStyles = `
  .spacing-overlay * {
    position: relative;
  }

  .spacing-overlay *::before,
  .spacing-overlay *::after {
    pointer-events: none;
    z-index: 10000;
  }

  /* Padding overlay (green) */
  .spacing-overlay.show-padding *::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 255, 0, 0.15);
    border: 1px dashed rgba(0, 200, 0, 0.6);
  }

  /* Margin overlay (orange) */
  .spacing-overlay.show-margins *::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 165, 0, 0.15);
    border: 1px dashed rgba(255, 140, 0, 0.6);
    box-shadow:
      0 0 0 var(--margin-top, 0px) rgba(255, 165, 0, 0.2),
      0 0 0 var(--margin-right, 0px) rgba(255, 165, 0, 0.2),
      0 0 0 var(--margin-bottom, 0px) rgba(255, 165, 0, 0.2),
      0 0 0 var(--margin-left, 0px) rgba(255, 165, 0, 0.2);
  }

  /* Spacing measurements */
  .spacing-overlay.show-measurements [data-spacing]::before {
    content: attr(data-spacing);
    position: absolute;
    top: -20px;
    left: 0;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-family: monospace;
    white-space: nowrap;
    z-index: 10001;
  }

  /* Legend */
  .spacing-legend {
    position: fixed;
    top: 10px;
    right: 10px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 10002;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .spacing-legend h4 {
    margin: 0 0 8px 0;
    font-size: 13px;
    font-weight: 600;
  }

  .spacing-legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .spacing-legend-color {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    border: 1px dashed;
  }

  .spacing-legend-color.padding {
    background: rgba(0, 255, 0, 0.15);
    border-color: rgba(0, 200, 0, 0.6);
  }

  .spacing-legend-color.margin {
    background: rgba(255, 165, 0, 0.15);
    border-color: rgba(255, 140, 0, 0.6);
  }
`;

export const withSpacing: Decorator = (Story, context) => {
  const [showPadding, setShowPadding] = useState(false);
  const [showMargins, setShowMargins] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);

  // Add spacing data attributes for measurements
  useEffect(() => {
    if (showMeasurements) {
      const elements = document.querySelectorAll('.spacing-overlay *');
      elements.forEach((el) => {
        const computed = window.getComputedStyle(el as Element);
        const padding = `P: ${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`;
        const margin = `M: ${computed.marginTop} ${computed.marginRight} ${computed.marginBottom} ${computed.marginLeft}`;
        (el as HTMLElement).setAttribute('data-spacing', `${padding} | ${margin}`);
      });
    }
  }, [showMeasurements]);

  // Get toolbar state from global args
  useEffect(() => {
    const updateFromGlobals = () => {
      const globals = (context as any).globals;
      if (globals) {
        setShowPadding(globals.showPadding === true);
        setShowMargins(globals.showMargins === true);
        setShowMeasurements(globals.showMeasurements === true);
      }
    };

    updateFromGlobals();
  }, [(context as any).globals]);

  const overlayClasses = [
    'spacing-overlay',
    showPadding && 'show-padding',
    showMargins && 'show-margins',
    showMeasurements && 'show-measurements',
  ].filter(Boolean).join(' ');

  return (
    <>
      <style>{overlayStyles}</style>
      <div className={overlayClasses}>
        <Story />
      </div>
      {(showPadding || showMargins) && (
        <div className="spacing-legend">
          <h4>Spacing Guide</h4>
          {showPadding && (
            <div className="spacing-legend-item">
              <div className="spacing-legend-color padding" />
              <span>Padding</span>
            </div>
          )}
          {showMargins && (
            <div className="spacing-legend-item">
              <div className="spacing-legend-color margin" />
              <span>Margin</span>
            </div>
          )}
          {showMeasurements && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
              Hover over elements to see measurements
            </div>
          )}
        </div>
      )}
    </>
  );
};

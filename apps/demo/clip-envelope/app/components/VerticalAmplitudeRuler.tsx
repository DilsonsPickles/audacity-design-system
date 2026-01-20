/**
 * VerticalAmplitudeRuler - Shows linear amplitude scale on the right side of tracks
 */

import { theme } from '../theme';

export interface VerticalAmplitudeRulerProps {
  height: number;
  selected?: boolean;
}

export default function VerticalAmplitudeRuler({ height, selected = false }: VerticalAmplitudeRulerProps) {
  // Calculate tick positions for linear amplitude scale (-1.0 to 1.0)
  const majorTicks = [
    { value: 1.0, position: 0, label: '1.0' },
    { value: 0.5, position: 0.2, label: '0.5' },
    { value: 0.0, position: 0.5, label: '0.0', isCenter: true },
    { value: -0.5, position: 0.8, label: '-0.5' },
    { value: -1.0, position: 1.0, label: '-1.0' },
  ];

  const minorTickPositions = [0.1, 0.15, 0.25, 0.3, 0.35, 0.45, 0.55, 0.6, 0.65, 0.75, 0.85, 0.9, 0.95];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        backgroundColor: selected
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(251, 251, 253, 0.05)',
        borderTop: selected ? '2px solid #677ce4' : 'none',
        borderBottom: selected ? '2px solid #677ce4' : 'none',
      }}
    >
      {/* Header overlay (20px) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '20px',
          backgroundColor: 'black',
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />

      {/* Major ticks with labels */}
      {majorTicks.map((tick, index) => {
        const y = tick.position * height;
        return (
          <div key={`major-${index}`}>
            {/* Grid line at 0.0 */}
            {tick.isCenter && (
              <div
                style={{
                  position: 'absolute',
                  left: '8px',
                  right: 0,
                  top: `${y}px`,
                  height: '1px',
                  backgroundColor: '#4f5157',
                  transform: 'translateY(-50%)',
                }}
              />
            )}

            {/* Tick mark */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: `${y}px`,
                width: '8px',
                height: '1px',
                backgroundColor: '#F2F4F7',
                transform: 'translateY(-50%)',
              }}
            />

            {/* Label */}
            <div
              style={{
                position: 'absolute',
                right: '4px',
                top: tick.isCenter ? `${y + 3}px` : `${y}px`,
                fontSize: '10px',
                lineHeight: '9px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                color: '#F9F9FA',
                textAlign: 'right',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            >
              {tick.label}
            </div>
          </div>
        );
      })}

      {/* Minor ticks */}
      {minorTickPositions.map((position, index) => {
        const y = position * height;
        return (
          <div
            key={`minor-${index}`}
            style={{
              position: 'absolute',
              left: 0,
              top: `${y}px`,
              width: '4px',
              height: '1px',
              backgroundColor: '#A9B0BD',
              transform: 'translateY(-50%)',
            }}
          />
        );
      })}
    </div>
  );
}

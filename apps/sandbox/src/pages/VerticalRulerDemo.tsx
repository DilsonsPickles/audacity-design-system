import React, { useState } from 'react';
import { VerticalRuler } from '@audacity-ui/components';

/**
 * VerticalRuler component demo
 *
 * Shows different variations of the linear amplitude ruler
 */
export const VerticalRulerDemo: React.FC = () => {
  const [trackHeight, setTrackHeight] = useState(114);

  return (
    <div style={{ padding: '20px', backgroundColor: '#252837' }}>
      <h1 style={{ color: '#fff', marginBottom: '20px' }}>
        Vertical Ruler Component
      </h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ color: '#fff', marginRight: '10px' }}>
          Track Height: {trackHeight}px
        </label>
        <input
          type="range"
          min="44"
          max="342"
          value={trackHeight}
          onChange={(e) => setTrackHeight(Number(e.target.value))}
          style={{ width: '300px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        {/* Standard ruler (right-aligned) */}
        <div>
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>
            Right-aligned (default)
          </h3>
          <VerticalRuler
            height={trackHeight}
            min={-1.0}
            max={1.0}
            majorDivisions={5}
            minorDivisions={4}
            position="right"
          />
        </div>

        {/* Left-aligned ruler */}
        <div>
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>
            Left-aligned
          </h3>
          <VerticalRuler
            height={trackHeight}
            min={-1.0}
            max={1.0}
            majorDivisions={5}
            minorDivisions={4}
            position="left"
          />
        </div>

        {/* With header */}
        <div>
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>
            With header (20px)
          </h3>
          <VerticalRuler
            height={trackHeight}
            min={-1.0}
            max={1.0}
            majorDivisions={5}
            minorDivisions={4}
            position="right"
            headerHeight={20}
          />
        </div>

        {/* Custom range */}
        <div>
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>
            Custom range (0 to 1)
          </h3>
          <VerticalRuler
            height={trackHeight}
            min={0}
            max={1}
            majorDivisions={3}
            minorDivisions={4}
            position="right"
          />
        </div>
      </div>

      <div style={{ marginTop: '40px', color: '#ccc' }}>
        <h3>Component Features:</h3>
        <ul>
          <li>Linear amplitude scale (-1.0 to 1.0 by default)</li>
          <li>Major ticks (bold, 8px wide) with labels</li>
          <li>Minor ticks (4px wide, secondary color)</li>
          <li>Grid line at 0.0 (center)</li>
          <li>Configurable height, range, and divisions</li>
          <li>Left or right alignment</li>
          <li>Optional header overlay</li>
          <li>Theme-aware colors</li>
        </ul>
      </div>
    </div>
  );
};

export default VerticalRulerDemo;

import React, { useState } from 'react';
import { VerticalSpectralRuler } from '@audacity-ui/components';

export const SpectralRulerDemo: React.FC = () => {
  const [height, setHeight] = useState(600);

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <h1 style={{ color: 'white', marginBottom: '20px' }}>Spectral Ruler Demo</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
          Height: {height}px
        </label>
        <input
          type="range"
          min="44"
          max="2000"
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          style={{ width: '400px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ color: 'white', marginBottom: '10px' }}>Left Position</h3>
          <VerticalSpectralRuler
            height={height}
            minFreq={20}
            maxFreq={20000}
            position="left"
          />
        </div>

        <div>
          <h3 style={{ color: 'white', marginBottom: '10px' }}>Right Position</h3>
          <VerticalSpectralRuler
            height={height}
            minFreq={20}
            maxFreq={20000}
            position="right"
          />
        </div>
      </div>

      <div style={{ marginTop: '40px', color: 'white' }}>
        <h3>Features:</h3>
        <ul>
          <li>Mel scale positioning for perceptually uniform spacing</li>
          <li>Uniform "nice" frequency values (20, 100, 500, 1k, 2k, etc.)</li>
          <li>Adaptive tiers based on available space (6 tiers)</li>
          <li>Smart formatting (kHz notation for values ≥ 1000 Hz)</li>
        </ul>
      </div>
    </div>
  );
};

export default SpectralRulerDemo;

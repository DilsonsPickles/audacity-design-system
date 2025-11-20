import { useState } from 'react';
import { PanKnob, Slider } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

function App() {
  const [pan, setPan] = useState(0);
  const [volume, setVolume] = useState(75);

  return (
    <div style={{
      padding: '40px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>Component Playground</h1>

      <div style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        display: 'inline-block'
      }}>
        <h2>PanKnob</h2>
        <PanKnob value={pan} onChange={setPan} />
        <p style={{ marginTop: '20px' }}>Value: {pan}</p>
      </div>

      <div style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '400px'
      }}>
        <h2>Slider</h2>
        <Slider value={volume} onChange={setVolume} />
        <p style={{ marginTop: '20px' }}>Value: {volume}</p>
      </div>
    </div>
  );
}

export default App;

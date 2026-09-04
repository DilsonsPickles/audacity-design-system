// Minimal consumer page — exercises every priority surface from the
// package with no providers wrapping the tree. If a future hook starts
// requiring a provider, `vite build` here will fail at runtime in a
// browser preview, and the standalone-mode smoke test on the package
// will fail in CI before publish.

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Icon,
  Toolbar,
  ToolbarDivider,
  ToolbarButtonGroup,
  TransportButton,
  ToolButton,
} from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 14, margin: '0 0 12px', color: '#333' }}>
        @audacity-ui/components — standalone smoke
      </h1>
      <Toolbar>
        <ToolbarButtonGroup gap={2}>
          <TransportButton icon="skip-back" />
          <TransportButton icon="play" />
          <TransportButton icon="stop" />
          <TransportButton icon="record" />
          <TransportButton icon="skip-forward" />
          <TransportButton icon="loop" />
        </ToolbarButtonGroup>
        <ToolbarDivider />
        <ToolbarButtonGroup gap={4}>
          <ToolButton icon="cog" ariaLabel="Settings" />
          <ToolButton icon="trim" ariaLabel="Trim" />
          <ToolButton icon="cut" ariaLabel="Cut" />
        </ToolbarButtonGroup>
      </Toolbar>
      <p style={{ fontSize: 12, color: '#666', marginTop: 16 }}>
        Inline icon test — the record glyph should appear here:{' '}
        <Icon name="record" size={14} />. If it renders as the MusescoreIcon
        font character (a filled circle) instead of a blank square, the
        bundled <code>@font-face</code> and font file are wired up correctly.
      </p>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

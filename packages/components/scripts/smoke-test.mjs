// Standalone-mode smoke test for @dilsonspickles/components.
//
// Renders the public surface that external consumers rely on (marketing
// site, manual, future Storybook standalone examples) without wrapping in
// any provider. Catches regressions where a hook throws when used outside
// its provider — exactly the class of bug that slipped through before 0.2.0.
//
// Runs against `./dist/index.mjs` so the test reflects what users actually
// import after `npm install`. Run with: `pnpm --filter @dilsonspickles/components test:smoke`

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const here = path.dirname(fileURLToPath(import.meta.url));
const distEntry = path.resolve(here, '..', 'dist', 'index.mjs');

const pkg = await import(distEntry);

const required = [
  'Icon',
  'Toolbar',
  'ToolbarDivider',
  'ToolbarButtonGroup',
  'TransportButton',
  'ToolButton',
  'ThemeProvider',
  'AccessibilityProfileProvider',
  'lightTheme',
  'darkTheme',
];

let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed += 1;
  }
}

console.log('\n[1/3] Required exports present');
for (const name of required) {
  check(name, pkg[name] !== undefined);
}

console.log('\n[2/3] Standalone render — no providers');
try {
  const tree = React.createElement(
    pkg.Toolbar,
    null,
    React.createElement(
      pkg.ToolbarButtonGroup,
      { gap: 2 },
      React.createElement(pkg.TransportButton, { icon: 'play', key: 'play' }),
      React.createElement(pkg.TransportButton, { icon: 'stop', key: 'stop' }),
    ),
    React.createElement(pkg.ToolbarDivider, { key: 'div' }),
    React.createElement(pkg.ToolButton, { icon: 'cog', ariaLabel: 'Settings', key: 'cog' }),
    React.createElement(pkg.Icon, { name: 'record', size: 16, key: 'icon' }),
  );
  const html = renderToStaticMarkup(tree);
  check('renderToStaticMarkup did not throw', true);
  check('output non-empty', html.length > 0, `${html.length} chars`);
  check('html contains a toolbar element', html.toLowerCase().includes('toolbar'));
} catch (err) {
  check('renderToStaticMarkup did not throw', false, err.message);
}

console.log('\n[3/3] Render inside providers — still works');
try {
  const tree = React.createElement(
    pkg.ThemeProvider,
    { theme: pkg.darkTheme },
    React.createElement(
      pkg.AccessibilityProfileProvider,
      { initialProfileId: 'au4' },
      React.createElement(
        pkg.Toolbar,
        null,
        React.createElement(pkg.TransportButton, { icon: 'record' }),
      ),
    ),
  );
  const html = renderToStaticMarkup(tree);
  check('renderToStaticMarkup did not throw', true);
  check('output non-empty', html.length > 0, `${html.length} chars`);
} catch (err) {
  check('renderToStaticMarkup did not throw', false, err.message);
}

if (failed > 0) {
  console.error(`\n✗ ${failed} smoke test assertion${failed === 1 ? '' : 's'} failed`);
  process.exit(1);
}

console.log('\n✓ All smoke tests passed');

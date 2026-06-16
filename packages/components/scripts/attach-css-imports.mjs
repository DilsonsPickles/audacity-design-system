// Post-build: re-attach CSS imports that tsup stripped from the compiled JS.
//
// tsup emits per-entry CSS sidecars (dist/Button.css, dist/Footer.css, …) but
// removes the original `import './Foo.css'` from the JS output. That means
// consumers who import a single component get the JS but *not* its styles —
// they'd have to manually `import '@dilsonspickles/components/Button.css'`
// alongside every component, or fall back to the full bundle.
//
// This script walks dist/, finds each `<Name>.mjs` / `<Name>.js` that has a
// matching `<Name>.css` sidecar, and prepends an import/require so the
// consumer's bundler picks the CSS up automatically. Combined with
// `sideEffects: ["**/*.css"]` in package.json, tree-shaking still drops
// unused components — including their CSS — while used ones get their styles
// attached without ceremony.
//
// Idempotent: if the marker comment is already at the top of a file, the
// script no-ops. Safe to run repeatedly (e.g. during `tsup --watch`).
//
// Skipped: chunk-*.{mjs,js} (CSS is aggregated at the entry level, not in
// shared chunks) and the root index.{mjs,js} barrel (re-attaching its CSS
// would defeat tree-shaking — barrel consumers get CSS via the per-component
// entries the barrel re-exports from).

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '..', 'dist');
const MARKER = '/* attach-css-imports: managed */';

if (!existsSync(distDir)) {
  console.log('[attach-css-imports] dist/ missing — skipping (build probably failed)');
  process.exit(0);
}

let touched = 0;
for (const entry of readdirSync(distDir)) {
  // Only top-level entry files. Skip chunks (shared code; no matching CSS)
  // and the barrel index (would re-bundle everything).
  if (entry.startsWith('chunk-')) continue;
  if (entry === 'index.mjs' || entry === 'index.js') continue;

  const isMjs = entry.endsWith('.mjs');
  const isCjs = entry.endsWith('.js');
  if (!isMjs && !isCjs) continue;

  const base = entry.replace(/\.(mjs|js)$/, '');
  const cssPath = join(distDir, `${base}.css`);
  if (!existsSync(cssPath)) continue;

  const jsPath = join(distDir, entry);
  const source = readFileSync(jsPath, 'utf8');
  if (source.startsWith(MARKER)) continue;

  const importLine = isMjs ? `import './${base}.css';` : `require('./${base}.css');`;
  writeFileSync(jsPath, `${MARKER}\n${importLine}\n${source}`);
  touched += 1;
}

console.log(`[attach-css-imports] rewrote ${touched} file(s)`);

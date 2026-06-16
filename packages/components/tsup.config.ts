import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

// Every top-level component directory with its own index.ts becomes a
// separate tsup entry. That way each component compiles to its own
// `dist/<Name>.mjs` (which imports its own CSS), and consumer bundlers
// can tree-shake unused components — including their CSS — when
// `sideEffects: ["**/*.css"]` is set in package.json.
//
// The root `src/index.ts` stays as the `index` entry so the existing
// barrel import (`import { Button } from '@dilsonspickles/components'`)
// keeps working; tree-shaking through the barrel still drops unused
// components.
const srcDir = path.resolve(__dirname, 'src');
const componentEntries: Record<string, string> = { index: 'src/index.ts' };
for (const dirent of fs.readdirSync(srcDir, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const indexPath = path.join(srcDir, dirent.name, 'index.ts');
  if (!fs.existsSync(indexPath)) continue;
  componentEntries[dirent.name] = `src/${dirent.name}/index.ts`;
}

export default defineConfig({
  entry: componentEntries,
  format: ['cjs', 'esm'],
  dts: true,
  // ESM splitting lets shared modules become chunks instead of being
  // duplicated across every entry — important when we have ~115 entries
  // that all pull in ThemeProvider, hooks, etc.
  splitting: true,
  // Only React stays external — the workspace siblings (@audacity-ui/core,
  // @audacity-ui/tokens) get bundled into dist so external consumers don't
  // need to install them separately.
  external: ['react', 'react-dom'],
  loader: {
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.jpeg': 'dataurl',
    '.gif': 'dataurl',
    '.svg': 'dataurl',
    '.webp': 'dataurl',
    // Emit font files into dist/ and rewrite the @font-face URL to a hashed
    // filename. Required so consumers can ship the MusescoreIcon font.
    '.ttf': 'file',
    '.woff': 'file',
    '.woff2': 'file',
  },
  publicDir: false,
  // tsup strips `import './Foo.css'` from JS output and emits the CSS as a
  // sidecar. That breaks per-component imports for consumers because the
  // JS no longer triggers CSS loading. The post-build script walks dist/
  // and re-prepends the CSS import for each entry that has a matching
  // sidecar, so consumer bundlers pick the CSS up automatically.
  onSuccess: 'node scripts/attach-css-imports.mjs',
});

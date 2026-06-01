import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
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
    // filename. Required so consumers can ship the MusescoreIcon font by
    // just importing `@dilsonspickles/components/style.css`.
    '.ttf': 'file',
    '.woff': 'file',
    '.woff2': 'file',
  },
  publicDir: false,
});

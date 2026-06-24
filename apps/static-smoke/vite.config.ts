import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep off the sandbox's default 5173 (the Electron desktop dev wiring
  // expects the sandbox on 5173). strictPort: false lets it fall forward to
  // 5181, 5182... if a stale smoke server hasn't been cleaned up yet, instead
  // of killing the whole `pnpm --parallel dev` run.
  server: { port: 5180, strictPort: false },
  build: {
    outDir: 'dist',
    // Keep the build fast — this is a smoke check, not a production app.
    target: 'es2020',
    sourcemap: false,
  },
});

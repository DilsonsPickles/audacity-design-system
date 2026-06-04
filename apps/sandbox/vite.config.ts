import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  server: {
    // 5173 matches moose-hub's OAuth allowlist for audacity-web-demo
    // (3000 collides with moose-hub itself).
    port: 5173,
    strictPort: true,
  },
});

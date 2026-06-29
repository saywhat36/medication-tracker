import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env['VITE_API_PROXY_TARGET'] ?? 'http://localhost:3000';

export default defineConfig({
  // '/' for local dev; the Pages build sets VITE_BASE=/medication-tracker/ so
  // assets resolve under the project-pages subpath.
  base: process.env['VITE_BASE'] ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // bind to 0.0.0.0 so it's reachable inside Docker
    proxy: {
      '/login': apiTarget,
      '/medications': apiTarget,
      '/doses': apiTarget,
      '/refill-status': apiTarget,
      '/sweep': apiTarget,
    },
  },
});

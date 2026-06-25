import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/medications': 'http://localhost:3000',
      '/doses': 'http://localhost:3000',
      '/refill-status': 'http://localhost:3000',
      '/sweep': 'http://localhost:3000',
    },
  },
});

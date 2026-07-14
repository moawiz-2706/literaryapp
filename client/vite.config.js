import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/books': 'http://localhost:3001',
      '/print-jobs': 'http://localhost:3001',
      '/webhooks': 'http://localhost:3001',
      '/quotes': 'http://localhost:3001',
      '/stripe': 'http://localhost:3001',
      '/oauth': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/royalties': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});

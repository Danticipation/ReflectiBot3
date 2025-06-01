// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '/shared'
    }
  },
  build: {
    outDir: '../dist/client',  // ✅ This is critical
    emptyOutDir: true
  }
});

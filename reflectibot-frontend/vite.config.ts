// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,            // ✅ Required for expect, describe, it
    environment: 'jsdom',     // ✅ Required for React components
    setupFiles: './vitest.setup.ts', // ✅ Optional: jest-dom or global mocks
  },
});

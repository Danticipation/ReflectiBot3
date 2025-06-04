import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  splitting: false,
  clean: true,
  target: 'es2020',
  external: ['dotenv', 'fs', 'path', 'url']  // this avoids bundling core + problematic stuff
});

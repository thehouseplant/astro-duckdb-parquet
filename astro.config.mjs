// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Configure the build output
  output: 'static',

  // Add Vite configuration to handle DuckDB WASM files
  vite: {
    build: {
      // Increase the max chunk size to accommodate large WASM files
      chunkSizeWarningLimit: 2000,
    },
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'],
    },
  },
});

import { defineConfig } from 'vite';

// Served from https://bladejhs.github.io/beast-performance/
export default defineConfig({
  base: '/beast-performance/',
  build: { target: 'es2022', assetsInlineLimit: 0 },
  define: { __BUILD__: JSON.stringify(process.env['GITHUB_SHA']?.slice(0, 7) ?? 'local') },
});

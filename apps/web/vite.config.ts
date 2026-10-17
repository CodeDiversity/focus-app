import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // The backend serves routes without an /api prefix, so strip it here.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Browser requests retain /api, so its refresh-cookie path must match.
        cookiePathRewrite: { '/auth': '/api/auth' },
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});

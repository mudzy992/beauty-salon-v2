import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 10000,
    fs: { allow: [repositoryRoot] },
    proxy: {
      '/api': {
        target: 'http://localhost:10001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:10001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:10001',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:10001',
        changeOrigin: true,
      },
    },
  },
});

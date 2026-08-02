import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const pages = ['index', 'record', 'chat', 'atlas', 'library', 'detail', 'settings', 'notes', 'calendar'];

export default defineConfig({
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  build: {
    chunkSizeWarningLimit: 550,
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page, resolve(import.meta.dirname, page + '.html')]))
    }
  }
});

import { defineConfig } from 'vite';
import { attachLanDuelServer } from './server/duel-server.js';

export default defineConfig({
  appType: 'spa',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: 'index.html',
        hdArena: 'hd-arena.html'
      }
    }
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  plugins: [{
    name: 'lan-duel-server',
    configureServer(server) {
      attachLanDuelServer(server.httpServer);
    }
  }]
});

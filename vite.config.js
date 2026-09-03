import { defineConfig } from 'vite';
import { attachLanDuelServer } from './server/duel-server.js';

export default defineConfig({
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  build: {
    chunkSizeWarningLimit: 550
  },
  plugins: [{
    name: 'lan-duel-server',
    configureServer(server) {
      attachLanDuelServer(server.httpServer);
    }
  }]
});

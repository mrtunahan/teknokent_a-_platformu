import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend (Express API) varsayılan olarak 4000 portunda çalışır.
// Geliştirmede /api, /files ve /socket.io istekleri API'ye yönlendirilir.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/files': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});

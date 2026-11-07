import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend (Express API) varsayılan olarak 4000 portunda çalışır.
// VITE_DATA_SOURCE=http ile canlı API'ye bağlanıldığında istekler buraya yönlenir.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:4000',
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

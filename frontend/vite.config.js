import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Geliştirmede API ayrı portta (4000) çalışır; üretimde Express derlenmiş arayüzü aynı origin'den servis eder.
const target = process.env.VITE_API_PROXY || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': target,
      '/files': target,
      '/socket.io': { target, ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});

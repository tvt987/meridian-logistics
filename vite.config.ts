import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (id.includes('node_modules/qrcode')) {
            return 'qrcode';
          }
          if (
            id.includes('/src/engines/') &&
            !id.includes('vietQr') &&
            !id.includes('maritimePort3dEngine') &&
            !id.includes('__tests__')
          ) {
            return 'engines';
          }
          return undefined;
        },
      },
    },
  },
});

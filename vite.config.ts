import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(rootDirectory, 'index.html'),
        check: resolve(rootDirectory, 'check/index.html'),
        methodology: resolve(rootDirectory, 'methodology/index.html'),
        notFound: resolve(rootDirectory, '404.html'),
      },
    },
  },
});

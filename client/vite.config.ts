import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Saída diretamente na pasta que o Express serve como estático
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    // Em desenvolvimento: proxy da API e WS para o servidor Node
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws':  { target: 'ws://localhost:3000', ws: true },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      // Pacifica API → avoids CORS in dev
      '/proxy/pacifica': {
        target: 'https://api.pacifica.fi',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/pacifica/, '/api/v1'),
      },
      // Anthropic API → keeps key server-side in dev
      '/proxy/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/anthropic/, ''),
      },
      '/proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openai/, ''),
      },
    },
  },
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createAiMiddleware } from './server/aiMiddleware';

function mythosAiPlugin(): Plugin {
  return {
    name: 'mythos-ai-bridge',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      server.middlewares.use(createAiMiddleware(env));
    },
    configurePreviewServer(server) {
      const env = loadEnv('production', process.cwd(), '');
      server.middlewares.use(createAiMiddleware(env));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), mythosAiPlugin()],
});

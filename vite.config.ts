import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.POSTHOG_API_KEY': JSON.stringify(env.POSTHOG_API_KEY),
        'process.env.POSTHOG_API_HOST': JSON.stringify(env.POSTHOG_API_HOST || 'https://app.posthog.com')
      },
      envPrefix: ['VITE_', 'POSTHOG_', 'GEMINI_'],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        hmr: false,  // Disable HMR to eliminate WebSocket errors
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path
          }
        }
      }
    };
});

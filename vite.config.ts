import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/replicate': {
            target: 'https://api.replicate.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/api\/replicate/, ''),
            headers: {
              'Authorization': `Bearer ${env.VITE_REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        }
      },
      plugins: [react()],
      define: {
        // Map VITE_ variables to process.env for compatibility
        'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

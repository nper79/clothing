import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const MAX_BODY_SIZE = 35 * 1024 * 1024; // 35MB safety limit for data URLs

const readJsonBody = (req: IncomingMessage): Promise<any> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString() || '{}';
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });

const createDevBackendPlugin = (enabled: boolean): Plugin | null => {
  if (!enabled) {
    return null;
  }

  return {
    name: 'personal-styling-dev-backend',
    configureServer(server) {
      server.middlewares.use('/api/personalized-looks', async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        try {
          const body = await readJsonBody(req);
          const normalizedLimit = typeof body.limit === 'number' ? body.limit : undefined;
          const normalizedLookIds = Array.isArray(body.lookIds) ? body.lookIds.map((value: unknown) => String(value)) : undefined;

          const { generatePersonalizedLooks } = await import('./server/personalStylingWorkflow');
          const looks = await generatePersonalizedLooks({
            ...body,
            limit: normalizedLimit,
            lookIds: normalizedLookIds
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ looks }));
        } catch (error) {
          console.error('[vite dev backend] Failed to handle /api/personalized-looks', error);
          const statusCode = (error instanceof Error && error.message === 'Payload too large') ? 413 : 500;
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });
    }
  };
};

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', '');

  // Ensure server-side code can access the Replicate token when running via Vite
  if (!process.env.REPLICATE_API_TOKEN && env.REPLICATE_API_TOKEN) {
    process.env.REPLICATE_API_TOKEN = env.REPLICATE_API_TOKEN;
  }

  const backendTarget = env.VITE_PERSONAL_STYLING_API_URL || 'http://localhost:4000';
  const enableDevBackend = command === 'serve' && env.VITE_DISABLE_DEV_BACKEND !== 'true';

  const devBackendPlugin = createDevBackendPlugin(enableDevBackend);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: enableDevBackend
        ? undefined
        : {
            '/api': {
              target: backendTarget,
              changeOrigin: true,
              secure: false
            }
          }
    },
    plugins: ([react(), devBackendPlugin].filter(Boolean) as Plugin[]),
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

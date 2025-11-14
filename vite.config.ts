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
      const handleJsonPost = async (
        req: IncomingMessage,
        res: ServerResponse,
        handler: (body: any) => Promise<unknown>,
        errorLabel: string
      ) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        try {
          const body = await readJsonBody(req);
          const data = await handler(body);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (error) {
          console.error(`[vite dev backend] Failed to handle ${errorLabel}`, error);
          const statusCode = (error instanceof Error && error.message === 'Payload too large') ? 413 : 500;
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      };

      server.middlewares.use('/api/personalized-looks', async (req: IncomingMessage, res: ServerResponse) => {
        await handleJsonPost(
          req,
          res,
          async (body) => {
            const normalizedLimit = typeof body.limit === 'number' ? body.limit : undefined;
            const normalizedLookIds = Array.isArray(body.lookIds) ? body.lookIds.map((value: unknown) => String(value)) : undefined;

            const { generatePersonalizedLooks } = await import('./server/personalStylingWorkflow');
            const looks = await generatePersonalizedLooks({
              ...body,
              limit: normalizedLimit,
              lookIds: normalizedLookIds
            });
            return { looks };
          },
          '/api/personalized-looks'
        );
      });

      server.middlewares.use('/api/remix-look', async (req: IncomingMessage, res: ServerResponse) => {
        await handleJsonPost(
          req,
          res,
          async (body) => {
            const { remixLookWithPrompt } = await import('./server/personalStylingWorkflow');
            const referenceImage = typeof body.referenceImage === 'string' ? body.referenceImage : undefined;
            const result = await remixLookWithPrompt(body.userPhoto, body.prompt, referenceImage);
            return result;
          },
          '/api/remix-look'
        );
      });

      server.middlewares.use('/api/remix-image', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        try {
          const requestUrl = new URL(req.url ?? '', 'http://localhost');
          const pathParam = requestUrl.searchParams.get('path');
          if (!pathParam) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing remix image path' }));
            return;
          }

          const { getRemixSignedUrl } = await import('./server/imageStorage');
          const url = await getRemixSignedUrl(pathParam);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ url }));
        } catch (error) {
          console.error('[vite dev backend] Failed to generate remix signed URL', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Failed to generate signed URL'
          }));
        }
      });

      server.middlewares.use('/api/explore/prompts', async (req: IncomingMessage, res: ServerResponse) => {
        await handleJsonPost(
          req,
          res,
          async (body) => {
            const { generateExplorePrompts } = await import('./server/personalStylingWorkflow');
            const looks = await generateExplorePrompts(body.gender, body.count);
            return { looks };
          },
          '/api/explore/prompts'
        );
      });

      server.middlewares.use('/api/explore/generate', async (req: IncomingMessage, res: ServerResponse) => {
        await handleJsonPost(
          req,
          res,
          async (body) => {
            const { generateExploreLooks } = await import('./server/personalStylingWorkflow');
            const looks = await generateExploreLooks(body.gender, body.count, body.styleTag);
            return { looks };
          },
          '/api/explore/generate'
        );
      });

      server.middlewares.use('/api/explore/inspire', async (req: IncomingMessage, res: ServerResponse) => {
        await handleJsonPost(
          req,
          res,
          async (body) => {
            const { generateExploreLooksFromReferences } = await import('./server/personalStylingWorkflow');
            const looks = await generateExploreLooksFromReferences({
              gender: body.gender,
              referenceImages: Array.isArray(body.images) ? body.images : [],
              count: body.count,
              styleTag: body.styleTag,
            });
            return { looks };
          },
          '/api/explore/inspire'
        );
      });

      server.middlewares.use('/api/explore/clear', async (req: IncomingMessage, res: ServerResponse) => {
        await handleJsonPost(
          req,
          res,
          async (body) => {
            const { readExploreDataset, writeExploreDataset } = await import('./server/exploreDatasetStore');
            const dataset = await readExploreDataset();
            const gender = body.gender;

            if (gender === 'male' || gender === 'female') {
              dataset[gender] = [];
              await writeExploreDataset(dataset);
              return { looks: [] };
            }

            dataset.male = [];
            dataset.female = [];
            await writeExploreDataset(dataset);
            return { male: [], female: [] };
          },
          '/api/explore/clear'
        );
      });

      server.middlewares.use('/api/explore/delete', async (req: IncomingMessage, res: ServerResponse) => {
        await handleJsonPost(
          req,
          res,
          async (body) => {
            const { readExploreDataset, writeExploreDataset } = await import('./server/exploreDatasetStore');
            const dataset = await readExploreDataset();
            const gender = body.gender;
            const id = body.id;

            if (gender !== 'male' && gender !== 'female') {
              throw new Error('gender must be "male" or "female".');
            }

            if (!id || typeof id !== 'string') {
              throw new Error('Missing look id.');
            }

            const nextLooks = dataset[gender].filter((look) => look.id !== id);
            if (nextLooks.length === dataset[gender].length) {
              throw new Error('Look not found.');
            }

            dataset[gender] = nextLooks;
            await writeExploreDataset(dataset);
            return { looks: dataset[gender] };
          },
          '/api/explore/delete'
        );
      });

      server.middlewares.use('/api/explore/dataset', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        try {
          const { readExploreDataset } = await import('./server/exploreDatasetStore');
          const dataset = await readExploreDataset();
          const requestUrl = new URL(req.url ?? '', 'http://localhost');
          const gender = requestUrl.searchParams.get('gender');

          if (gender === 'male' || gender === 'female') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ looks: dataset[gender] }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(dataset));
        } catch (error) {
          console.error('[vite dev backend] Failed to read explore dataset', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Failed to load explore dataset'
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
  if (!process.env.SUPABASE_URL && env.SUPABASE_URL) {
    process.env.SUPABASE_URL = env.SUPABASE_URL;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (!process.env.SUPABASE_EXPLORE_BUCKET && env.SUPABASE_EXPLORE_BUCKET) {
    process.env.SUPABASE_EXPLORE_BUCKET = env.SUPABASE_EXPLORE_BUCKET;
  }
  if (!process.env.SUPABASE_REMIX_BUCKET && env.SUPABASE_REMIX_BUCKET) {
    process.env.SUPABASE_REMIX_BUCKET = env.SUPABASE_REMIX_BUCKET;
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

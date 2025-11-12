import cors from 'cors';
import express from 'express';
import { generatePersonalizedLooks } from './personalStylingWorkflow';

const app = express();
const port = Number(process.env.PORT || 4000);

// Allow frontend origins (development ports)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'http://localhost:3007'
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '30mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/personalized-looks', async (req, res) => {
  const { userPhoto, gender, userPreferences, limit, lookIds } = req.body ?? {};

  if (!userPhoto || typeof userPhoto !== 'string') {
    return res.status(400).json({ error: 'Missing userPhoto. Provide a base64 data URL or a remote URL.' });
  }

  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }

  const normalizedLimit = typeof limit === 'number' ? limit : undefined;
  const normalizedLookIds = Array.isArray(lookIds) ? lookIds.map((id) => String(id)) : undefined;

  try {
    const looks = await generatePersonalizedLooks({
      userPhoto,
      gender,
      userPreferences,
      limit: normalizedLimit,
      lookIds: normalizedLookIds,
    });

    res.json({ looks });
  } catch (error) {
    console.error('[server] Failed to generate looks', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate personalized looks',
    });
  }
});

app.listen(port, () => {
  console.log(`[server] Personal styling API listening on http://localhost:${port}`);
});

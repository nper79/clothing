import cors from 'cors';
import express from 'express';
import {
  generatePersonalizedLooks,
  remixLookWithPrompt,
  generateExplorePrompts,
  generateExploreLooks,
} from './personalStylingWorkflow';
import { readExploreDataset, writeExploreDataset } from './exploreDatasetStore';

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

app.post('/api/remix-look', async (req, res) => {
  const { userPhoto, prompt, referenceImage } = req.body ?? {};

  if (!userPhoto || typeof userPhoto !== 'string') {
    return res.status(400).json({ error: 'Missing userPhoto. Provide a base64 data URL or a remote URL.' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt.' });
  }

  try {
    const result = await remixLookWithPrompt(userPhoto, prompt, typeof referenceImage === 'string' ? referenceImage : undefined);
    res.json(result);
  } catch (error) {
    console.error('[server] Failed to remix look', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remix look'
    });
  }
});

app.post('/api/explore/prompts', async (req, res) => {
  const { gender, count } = req.body ?? {};

  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }

  const desiredCount = Math.min(Math.max(Number(count) || 10, 1), 50);

  try {
    const looks = await generateExplorePrompts(gender, desiredCount);
    res.json({ looks });
  } catch (error) {
    console.error('[server] Failed to generate explore prompts', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate explore prompts'
    });
  }
});

app.post('/api/explore/generate', async (req, res) => {
  const { gender, count } = req.body ?? {};

  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }

  const desiredCount = Math.min(Math.max(Number(count) || 10, 1), 50);

  try {
    const looks = await generateExploreLooks(gender, desiredCount);
    res.json({ looks });
  } catch (error) {
    console.error('[server] Failed to generate explore looks', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate explore looks'
    });
  }
});

app.get('/api/explore/dataset', async (req, res) => {
  try {
    const dataset = await readExploreDataset();
    const gender = req.query.gender;

    if (gender === 'male' || gender === 'female') {
      return res.json({ looks: dataset[gender] });
    }

    res.json(dataset);
  } catch (error) {
    console.error('[server] Failed to load explore dataset', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load explore dataset'
    });
  }
});

app.post('/api/explore/clear', async (req, res) => {
  const { gender } = req.body ?? {};

  if (gender && gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female" when provided.' });
  }

  try {
    const dataset = await readExploreDataset();

    if (!gender) {
      dataset.male = [];
      dataset.female = [];
      await writeExploreDataset(dataset);
      return res.json({ male: [], female: [] });
    }

    dataset[gender] = [];
    await writeExploreDataset(dataset);
    res.json({ looks: dataset[gender] });
  } catch (error) {
    console.error('[server] Failed to clear explore dataset', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to clear explore dataset'
    });
  }
});

app.post('/api/explore/delete', async (req, res) => {
  const { gender, id } = req.body ?? {};

  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing look id.' });
  }

  try {
    const dataset = await readExploreDataset();
    const nextLooks = dataset[gender].filter((look) => look.id !== id);

    if (nextLooks.length === dataset[gender].length) {
      return res.status(404).json({ error: 'Look not found.' });
    }

    dataset[gender] = nextLooks;
    await writeExploreDataset(dataset);
    res.json({ looks: dataset[gender] });
  } catch (error) {
    console.error('[server] Failed to delete explore look', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete explore look'
    });
  }
});

app.listen(port, () => {
  console.log(`[server] Personal styling API listening on http://localhost:${port}`);
});

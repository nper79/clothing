import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  generatePersonalizedLooks,
  remixLookWithPrompt,
  generateExplorePrompts,
  generateExploreLooks,
  sanitizeExploreLook,
  generateExploreLooksFromReferences,
  enrichLookItems,
  regenerateLookGrid,
  regenerateAllLookGrids,
  runFalGridDebug,
} from './personalStylingWorkflow';
import { getRemixSignedUrl } from './imageStorage';
import { readExploreDataset, writeExploreDataset } from './exploreDatasetStore';
import { searchShoppingByImage } from './serperClient';
import {
  chargeForPersonalizedLooks,
  chargeForRemix,
  CreditError,
  getCreditBalance,
  getCreditPacks,
  purchaseCreditPack,
} from './creditsStore';

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
  const { userId, userPhoto, gender, userPreferences, limit, lookIds } = req.body ?? {};

  if (!userPhoto || typeof userPhoto !== 'string') {
    return res.status(400).json({ error: 'Missing userPhoto. Provide a base64 data URL or a remote URL.' });
  }

  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing user id.' });
  }

  const normalizedLimit = typeof limit === 'number' ? limit : undefined;
  const normalizedLookIds = Array.isArray(lookIds) ? lookIds.map((id) => String(id)) : undefined;

  try {
    await chargeForPersonalizedLooks(userId, normalizedLimit ?? 1);
    const looks = await generatePersonalizedLooks({
      userPhoto,
      gender,
      userPreferences,
      limit: normalizedLimit,
      lookIds: normalizedLookIds,
    });

    res.json({ looks });
  } catch (error) {
    if (error instanceof CreditError) {
      return res.status(error.status).json({ error: error.message, code: 'INSUFFICIENT_CREDITS' });
    }
    console.error('[server] Failed to generate looks', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate personalized looks',
    });
  }
});

app.post('/api/remix-look', async (req, res) => {
  const { userId, userPhoto, prompt, referenceImage, itemImages } = req.body ?? {};

  if (!userPhoto || typeof userPhoto !== 'string') {
    return res.status(400).json({ error: 'Missing userPhoto. Provide a base64 data URL or a remote URL.' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt.' });
  }

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing user id.' });
  }

  try {
    await chargeForRemix(userId);
    const normalizedItemImages =
      Array.isArray(itemImages) ? itemImages.filter((url) => typeof url === 'string') : undefined;
    const result = await remixLookWithPrompt(
      userPhoto,
      prompt,
      typeof referenceImage === 'string' ? referenceImage : undefined,
      normalizedItemImages
    );
    res.json(result);
  } catch (error) {
    if (error instanceof CreditError) {
      return res.status(error.status).json({ error: error.message, code: 'INSUFFICIENT_CREDITS' });
    }
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
  const { gender, count, styleTag } = req.body ?? {};

  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }

  const desiredCount = Math.min(Math.max(Number(count) || 10, 1), 50);

  try {
    const looks = await generateExploreLooks(gender, desiredCount, typeof styleTag === 'string' ? styleTag : undefined);
    res.json({ looks });
  } catch (error) {
    console.error('[server] Failed to generate explore looks', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate explore looks'
    });
  }
});

app.post('/api/explore/inspire', async (req, res) => {
  const { gender, images, count, styleTag } = req.body ?? {};

  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Provide at least one reference image.' });
  }

  const normalizedImages = images
    .filter((value): value is string => typeof value === 'string' && value.startsWith('data:'))
    .slice(0, 8);

  if (normalizedImages.length === 0) {
    return res.status(400).json({ error: 'Reference images must be base64 data URLs.' });
  }

  const desiredCount = Math.min(Math.max(Number(count) || 10, 1), 50);

  try {
    const looks = await generateExploreLooksFromReferences({
      gender,
      referenceImages: normalizedImages,
      count: desiredCount,
      styleTag: typeof styleTag === 'string' ? styleTag : undefined,
    });
    res.json({ looks });
  } catch (error) {
    console.error('[server] Failed to generate reference-inspired looks', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate reference-inspired looks'
    });
  }
});

app.post('/api/explore/regenerate-grid', async (req, res) => {
  const { gender, lookId } = req.body ?? {};
  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be "male" or "female".' });
  }
  try {
    if (typeof lookId === 'string' && lookId.trim().length > 0) {
      const look = await regenerateLookGrid(gender, lookId);
      res.json({ look });
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.write('{"status":"running"}');
      await regenerateAllLookGrids(gender, progress => {
        res.write(`\n{"progress":${progress}}`);
      });
      res.write('\n{"status":"completed"}');
      res.end();
    }
  } catch (error) {
    console.error('[server] Failed to regenerate grid', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to regenerate grid',
    });
  }
});

app.post('/api/shop-search', async (req, res) => {
  const { imageUrl, query, country = 'us', language = 'en' } = req.body ?? {};
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Missing image URL.' });
  }

  try {
    const result = await searchShoppingByImage({ imageUrl, query, country, language });
    res.json({ result });
  } catch (error) {
    console.error('[server] Failed to query Scrapingdog Lens', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to search shopping items',
    });
  }
});

app.post('/api/explore/itemize', async (req, res) => {
  const { lookId } = req.body ?? {};
  if (!lookId || typeof lookId !== 'string') {
    return res.status(400).json({ error: 'Missing look id.' });
  }
  try {
    const look = await enrichLookItems(lookId);
    res.json({ look: sanitizeExploreLook(look) });
  } catch (error) {
    console.error('[server] Failed to enrich look items', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to enrich look items',
    });
  }
});

app.get('/api/explore/dataset', async (req, res) => {
  try {
    const dataset = await readExploreDataset();
    const sanitized = {
      male: dataset.male.map(sanitizeExploreLook),
      female: dataset.female.map(sanitizeExploreLook),
    };

    if (
      JSON.stringify(dataset.male) !== JSON.stringify(sanitized.male) ||
      JSON.stringify(dataset.female) !== JSON.stringify(sanitized.female)
    ) {
      await writeExploreDataset(sanitized);
    }

    const gender = req.query.gender;

    if (gender === 'male' || gender === 'female') {
      return res.json({ looks: sanitized[gender] });
    }

    res.json(sanitized);
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

app.get('/api/remix-image', async (req, res) => {
  const path = req.query.path;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing remix image path' });
  }
  try {
    const url = await getRemixSignedUrl(path);
    res.json({ url });
  } catch (error) {
    console.error('[server] Failed to generate remix signed URL', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate signed URL'
    });
  }
});

app.get('/api/credits/packs', (_req, res) => {
  res.json({ packs: getCreditPacks() });
});

app.get('/api/credits/balance', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  if (!userId) {
    return res.status(400).json({ error: 'Missing user id.' });
  }

  try {
    const balance = await getCreditBalance(userId);
    res.json({ balance });
  } catch (error) {
    console.error('[server] Failed to load credits', error);
    res.status(500).json({ error: 'Failed to load credits' });
  }
});

app.post('/api/credits/purchase', async (req, res) => {
  const { userId, packId } = req.body ?? {};
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing user id.' });
  }
  if (!packId || typeof packId !== 'string') {
    return res.status(400).json({ error: 'Missing credit pack id.' });
  }

  try {
    const purchase = await purchaseCreditPack(userId, packId);
    res.json(purchase);
  } catch (error) {
    if (error instanceof CreditError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('[server] Failed to purchase credits', error);
    res.status(500).json({ error: 'Failed to purchase credits' });
  }
});

app.post('/api/dev/fal-grid-test', async (req, res) => {
  const { prompt, imageUrl } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt.' });
  }

  const inputs = typeof imageUrl === 'string' && imageUrl.length > 0 ? [imageUrl] : [];

  try {
    const gridUrl = await runFalGridDebug(prompt, inputs);
    res.json({ imageUrl: gridUrl });
  } catch (error) {
    console.error('[server] fal grid test failed', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run fal grid test',
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

// Style profile endpoint
app.post('/api/style-profile', async (req, res) => {
  try {
    const profile = req.body;
    console.log('[server] Received style profile:', JSON.stringify(profile, null, 2));

    // TODO: Save to database (Supabase, MongoDB, etc.)
    // For now, we'll simulate saving with an in-memory store
    const profileId = Date.now().toString();
    const savedProfile = {
      id: profileId,
      ...profile,
      createdAt: new Date().toISOString()
    };

    // Generate a style analysis
    console.log('[server] Style profile saved with ID:', profileId);

    res.json({
      success: true,
      message: 'Style profile saved successfully',
      profileId: profileId,
      profile: savedProfile
    });
  } catch (error) {
    console.error('[server] Failed to save style profile:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save style profile',
    });
  }
});

// Get style profile
app.get('/api/style-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[server] Fetching style profile for user:', userId);

    // TODO: Fetch from database
    // For now, return mock data if user has completed quiz
    const mockProfile = {
      perceptionStyle: ['Modern', 'Confident', 'Elegant'],
      wearPlaces: ['Work', 'Dates', 'Nights out'],
      currentStyle: ['Basic casual'],
      desiredStyle: ['Clean girl / clean fit', 'Modern chic'],
      outfitGoals: ['Make me look more put-together', 'Make me look more confident'],
      colorPreferences: ['Neutral tones', 'Monochrome'],
      dislikedColors: 'Orange, Brown',
      outfitComplexity: 'I like balanced but interesting outfits',
      neverWearItems: ['Crop tops', 'Leather']
    };

    res.json({
      success: true,
      profile: mockProfile
    });
  } catch (error) {
    console.error('[server] Failed to fetch style profile:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch style profile',
    });
  }
});

// Get style profile analysis
app.get('/api/style-analysis/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Here you would fetch the user's profile from database
    // For now, return a placeholder

    res.json({
      userId,
      analysis: "Your style is evolving towards modern elegance with a focus on confident, sophisticated looks.",
      recommendations: [
        "Focus on clean lines and neutral tones",
        "Add statement pieces for visual interest",
        "Balance casual and formal elements"
      ]
    });
  } catch (error) {
    console.error('[server] Failed to fetch style analysis:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch style analysis',
    });
  }
});

app.listen(port, () => {
  console.log(`[server] Personal styling API listening on http://localhost:${port}`);
});

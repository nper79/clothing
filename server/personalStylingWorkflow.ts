import Replicate from 'replicate';
import Replicate from 'replicate';
import fetch from 'node-fetch';
import { fal } from '@fal-ai/client';
import type { PersonalLook, UserPreferences } from '../types/personalStyling';
import type { ExploreLook, ShopItem, CachedShoppingProduct } from '../types/explore';
import { ComprehensivePromptLibrary, type ComprehensiveLook } from '../services/comprehensivePromptLibrary';
import { ExploreLookLibrary } from '../services/exploreLookLibrary';
import { readExploreDataset, writeExploreDataset } from './exploreDatasetStore';
import { persistExploreImage, persistRemixImage, getRemixSignedUrl, persistReferenceImage, persistExploreAssetBuffer } from './imageStorage';
import { searchShoppingByImage, type ShoppingProduct } from './serperClient.js';
import sharp, { type OverlayOptions } from 'sharp';

const GPT5_MODEL = 'openai/gpt-5';
const REVE_MODEL = 'reve/edit-fast:f0253eb7b26cc2416ad98c20492fbe4b842e09d808318fdf9e7caeffa9ae78f5';
const NANO_BANANA_MODEL = 'google/nano-banana';
const FAL_GRID_ENDPOINT = 'fal-ai/nano-banana-pro/edit';
const FAL_GRID_CREDENTIALS = process.env.FAL_KEY
  || (process.env.FAL_KEY_ID && process.env.FAL_KEY_SECRET
    ? `${process.env.FAL_KEY_ID}:${process.env.FAL_KEY_SECRET}`
    : undefined);
const FAL_GRID_ENABLED = Boolean(FAL_GRID_CREDENTIALS);

if (FAL_GRID_CREDENTIALS) {
  fal.config({ credentials: FAL_GRID_CREDENTIALS });
} else {
  console.warn('[grid] FAL_KEY not set. Grid generation will fall back to Replicate nano-banana.');
}
const DEFAULT_LOOK_LIMIT = 1;
const GRID_TEMPLATE_WIDTH = 1344;
const GRID_TEMPLATE_HEIGHT = 2048;
const GRID_TEMPLATE_BACKGROUND = '#b3b3b3';
const GRID_TEMPLATE_LINE_COLOR = '#f4f4f4';
const GRID_TEMPLATE_LINE_THICKNESS = 8;
const GRID_TEMPLATE_URL = process.env.GRID_TEMPLATE_URL;
const TRUSTED_MERCHANT_KEYWORDS = [
  'amazon',
  'shopbop',
  'uniqlo',
  'macys',
  'macy',
  'nordstrom',
  'nordstrom rack',
  'bloomingdale',
  'zara',
  'h&m',
  'hm.com',
  'cos',
  'cosstores',
  'everlane',
  'aritzia',
  'anthropologie',
  'urban outfitters',
  'banana republic',
  'gap',
  'j.crew',
  'madewell',
];
const MAX_CACHED_PRODUCTS = 6;

const SCENE_PRESETS = {
  female: [
    'shot inside a monochrome cyclorama studio with sculptural light gradients',
    'sunset rooftop lounge bathed in neon tube lighting with skyline backdrop',
    'windswept Mediterranean pier with terracotta planters and sea mist',
    'rain-soaked neon alley with puddle reflections and haze',
    'mirror-studded desert salt flat at golden hour',
    'brutalist concrete stairwell washed in magenta gels',
    'lush botanical greenhouse filled with humidity haze and backlit palms',
    'nighttime city street with reflective asphalt and blurred headlights',
    'art gallery cube with floating plinths and diffused spotlights',
    'stormy coastline boardwalk with matte sky and dramatic waves'
  ],
  male: [
    'steel warehouse with volumetric light shafts cutting through dust',
    'futuristic transit hub lined with LED strips and chrome panels',
    'misty mountain overlook with basalt pillars and low clouds',
    'underground parking deck with cyan edge lights',
    'sunrise desert dunes casting long shadows across sand',
    'retro theater corridor with velvet drapes and sconces',
    'cyberpunk tunnel glowing with holographic signage',
    'minimalist marble studio with floating blocks',
    'storm-lit rooftop helipad with aviation beacons',
    'botanical conservatory with geometric glass walls'
  ]
} as const;

const ALL_SCENE_REFERENCES = Array.from(
  new Set([...SCENE_PRESETS.female, ...SCENE_PRESETS.male])
);

const gridTemplateDataUriPromise: Promise<string | null> = GRID_TEMPLATE_URL
  ? Promise.resolve(GRID_TEMPLATE_URL)
  : createGridTemplateDataUri().catch((error) => {
      console.error('[server] Failed to build grid template overlay', error);
      return null;
    });

const FRAMING_REQUIREMENTS =
  'Full body portrait, vertical 9:16 composition (tall), camera at waist height, editorial lighting, footwear fully visible, confident pose captured mid-motion.';

const GLOBAL_TRENDS = [
  'Reference current runways like Loewe, Ferragamo, The Row, Coperni, Khaite, and Prada for silhouette inspiration.',
  'Blend quiet luxury tailoring with dopamine dressing pops of color or metallic accents.',
  'Incorporate trending accessories: sculptural earrings, oversized totes, ballet flats, chunky runners, or moto belts.',
  'Use modern denim shapes (barrel, pleated wide-leg, puddle hem) instead of skinny cuts.',
  'Nod to viral TikTok aesthetics (mob wife, clean-girl athleisure, tomato girl summer) without sounding dated.',
  'Layer technical outerwear with soft tailoring for a high-low mix that feels 2025-ready.',
] as const;

const STYLE_DIRECTIVES = [
  {
    id: 'preppy',
    label: 'Preppy',
    instructions:
      'Channel collegiate heritage: crisp oxford shirts, striped knit polos, pleated minis, tennis sweaters draped over shoulders, loafers or Mary Jane heels, crest embroidery, rugby stripes. Settings should feel like Ivy League campuses, libraries, or manicured town squares.',
  },
  {
    id: 'work',
    label: 'Work',
    instructions:
      'Every look must read as office-appropriate. Think tailored suits, structured blazers, polished knit shells, silk blouses, pencil skirts, pressed trousers, trench or wrap coats, leather pumps or loafers. Accessories stay understated. Place subjects in modern office lobbies, boardrooms, or clean city sidewalks during commute.',
  },
  {
    id: 'winter',
    label: 'Winter',
    instructions:
      'Lean into true cold-weather layering: wool or puffer coats, shearling parkas, chunky scarves, knit beanies, thermal leggings, leather gloves, weatherproof boots. Add visible texture (tweed, cable knits, faux fur) and show frosty breath, snowflakes, or overcast twilight to make it unmistakably winter.',
  },
  {
    id: 'street',
    label: 'Street',
    instructions:
      'Highlight contemporary streetwear: oversized bombers, utility vests, hoodies, cargos, tech shells, statement sneakers, caps, and layered accessories. Backgrounds should feel urban—graffiti alleys, neon districts, subway platforms, or industrial rooftops with depth of field effects.',
  },
] as const;

const replicateToken = process.env.VITE_REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN;

if (!replicateToken) {
  throw new Error('Missing REPLICATE_API_TOKEN environment variable.');
}

const replicate = new Replicate({
  auth: replicateToken,
  fileEncodingStrategy: 'upload',
  useFileOutput: false,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runWithRetry<T>(executor: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await executor();
  } catch (error) {
    const status = (error as any)?.status ?? (error as any)?.response?.status;
    if (status === 429 && attempt < 4) {
      const retryAfterSeconds =
        Number((error as any)?.retry_after) ||
        Number((error as any)?.response?.headers?.get?.('retry-after')) ||
        8;
      const waitMs = Math.max(retryAfterSeconds, 8) * 1000;
      console.warn(`[server] Replicate rate limit hit. Retrying in ${waitMs}ms (attempt ${attempt + 1})`);
      await delay(waitMs);
      return runWithRetry(executor, attempt + 1);
    }
    throw error;
  }
}

async function runReplicateModel(model: string, input: Record<string, unknown>) {
  return runWithRetry(() => replicate.run(model, { input }));
}
const dataUriRegex = /^data:(?<mime>.+);base64,(?<data>.+)$/;

const PROTECTED_SHORT_WORDS = new Set([
  'a',
  'i',
  'of',
  'to',
  'in',
  'on',
  'at',
  'by',
  'an',
  'or',
  'is',
  'it',
  'be',
  'me',
  'we',
  'us',
  'am',
  'do',
  'go',
  'no',
  'so',
  'up',
  'as',
  'he',
  'she',
]);
const SUFFIX_JOINERS = [
  'ed',
  'ing',
  'er',
  'ers',
  'ized',
  'ally',
  'ation',
  'ations',
  'ous',
  'less',
  'ness',
  'ment',
  'ments',
  'able',
  'ible',
  'hood',
  'ship',
  'ful',
  'tion',
  'sion',
];

const isAlpha = (value: string) => /^[a-z]+$/i.test(value);

const splitToken = (token: string) => {
  const leading = token.match(/^[^\w]+/)?.[0] ?? '';
  const trailing = token.match(/[^\w]+$/)?.[0] ?? '';
  const core = token.substring(leading.length, token.length - trailing.length);
  return { leading, core, trailing };
};

const shouldJoinWords = (prevWord: string, nextWord: string): boolean => {
  if (!prevWord || !nextWord) return false;
  const prevLower = prevWord.toLowerCase();
  const nextLower = nextWord.toLowerCase();
  if (!isAlpha(prevLower) || !isAlpha(nextLower)) return false;

  if (!PROTECTED_SHORT_WORDS.has(prevLower) && prevLower.length <= 2) return true;

  if (SUFFIX_JOINERS.some((suffix) => nextLower.startsWith(suffix))) return true;

  return false;
};

const repairBrokenWords = (input: string): string => {
  const tokens = input.split(' ').filter(Boolean);
  if (tokens.length <= 1) return input.trim();

  const result: string[] = [];

  for (const token of tokens) {
    const prevToken = result[result.length - 1];
    if (!prevToken) {
      result.push(token);
      continue;
    }

    const prevParts = splitToken(prevToken);
    const currentParts = splitToken(token);

    if (
      !prevParts.trailing &&
      !currentParts.leading &&
      shouldJoinWords(prevParts.core, currentParts.core)
    ) {
      const combinedWord = prevParts.core + currentParts.core;
      const combinedToken = `${prevParts.leading}${combinedWord}${currentParts.trailing ?? ''}`;
      result[result.length - 1] = combinedToken;
    } else {
      result.push(token);
    }
  }

  return result.join(' ');
};

export const sanitizeText = (text: string): string => {
  if (!text) return '';

  let normalized = text
    .replace(/([A-Za-z])[\r\n]+([A-Za-z])/g, '$1 $2')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+([?!.,;:])/g, '$1')
    .replace(/\s*-\s*/g, '-')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();

  normalized = repairBrokenWords(normalized);
  return normalized.trim();
};

const sanitizeCachedProduct = (product: CachedShoppingProduct): CachedShoppingProduct => ({
  title: sanitizeText(product.title),
  link: typeof product.link === 'string' ? product.link.trim() : '',
  price: product.price ? sanitizeText(product.price) : undefined,
  source: product.source ? sanitizeText(product.source) : undefined,
  imageUrl: typeof product.imageUrl === 'string' ? product.imageUrl.trim() : undefined,
  rating: typeof product.rating === 'number' ? product.rating : undefined,
  ratingCount: typeof product.ratingCount === 'number' ? product.ratingCount : undefined,
  position: typeof product.position === 'number' ? product.position : undefined,
});

const sanitizeShopItem = (item: ShopItem): ShopItem => ({
  id: sanitizeText(item.id),
  label: sanitizeText(item.label),
  searchQuery: sanitizeText(item.searchQuery),
  category: sanitizeText(item.category),
  gender: item.gender === 'male' ? 'male' : 'female',
  gridCellUrl: typeof item.gridCellUrl === 'string' ? item.gridCellUrl : undefined,
  cachedProducts: Array.isArray(item.cachedProducts)
    ? item.cachedProducts
        .map((product) => sanitizeCachedProduct(product))
        .filter((product) => Boolean(product.title && product.link))
    : undefined,
  cachedAt: item.cachedAt ? new Date(item.cachedAt).toISOString() : undefined,
});

export const sanitizeExploreLook = (look: ExploreLook): ExploreLook => ({
  ...look,
  title: sanitizeText(look.title),
  description: sanitizeText(look.description),
  prompt: sanitizeText(look.prompt),
  imagePrompt: look.imagePrompt ? sanitizeText(look.imagePrompt) : undefined,
  items: Array.isArray(look.items) ? look.items.map(sanitizeShopItem) : undefined,
  vibe: sanitizeText(look.vibe),
  styleTag: look.styleTag ? sanitizeText(look.styleTag) : undefined,
});

const uniquenessKey = (look: ExploreLook): string =>
  sanitizeText(`${look.title} ${look.description}`.toLowerCase()).replace(/\s+/g, '');

const getStyleDirective = (styleTag?: string) =>
  STYLE_DIRECTIVES.find((style) => style.id === styleTag);

const stripSceneClauses = (value: string): string =>
  value.replace(/Scene:[^\.!?]*(?:[\.!?])/gi, ' ').replace(/\s+/g, ' ').trim();

const extractHost = (link?: string): string => {
  if (!link) return '';
  try {
    return new URL(link).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isTrustedProduct = (product: ShoppingProduct): boolean => {
  const source = (product.source ?? '').toLowerCase();
  const host = extractHost(product.link);
  return TRUSTED_MERCHANT_KEYWORDS.some((keyword) => {
    const normalized = keyword.toLowerCase();
    return source.includes(normalized) || host.includes(normalized.replace(/\s+/g, ''));
  });
};

const mapToCachedProduct = (product: ShoppingProduct): CachedShoppingProduct => ({
  title: product.title ?? '',
  link: product.link ?? '',
  price: product.price ?? undefined,
  source: product.source ?? undefined,
  imageUrl: product.imageUrl ?? undefined,
  rating: typeof product.rating === 'number' ? product.rating : undefined,
  ratingCount: typeof product.ratingCount === 'number' ? product.ratingCount : undefined,
  position: typeof product.position === 'number' ? product.position : undefined,
});

async function cacheLookShoppingResults(look: ExploreLook): Promise<ExploreLook> {
  if (!look.items?.length) {
    return look;
  }
  const updatedItems: ShopItem[] = [];
  for (const item of look.items) {
    if (!item.gridCellUrl) {
      updatedItems.push(item);
      continue;
    }
    try {
      const response = await searchShoppingByImage({
        imageUrl: item.gridCellUrl,
        query: item.searchQuery || item.label,
        country: 'us',
        language: 'en',
      });
      const trusted = (response.shopping ?? [])
        .filter((product) => Boolean(product?.title && product?.link))
        .filter(isTrustedProduct)
        .slice(0, MAX_CACHED_PRODUCTS)
        .map((product) => sanitizeCachedProduct(mapToCachedProduct(product)));

      if (trusted.length > 0) {
        updatedItems.push({
          ...item,
          cachedProducts: trusted,
          cachedAt: new Date().toISOString(),
        });
      } else {
        updatedItems.push(item);
      }
    } catch (error) {
      console.warn(`[server] Failed to cache shopping results for ${item.label}`, error);
      updatedItems.push(item);
    }
  }
  look.items = updatedItems;
  return look;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomItems<T>(items: readonly T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function prepareImageInput(source: string): Buffer | string {
  if (!source.startsWith('data:')) {
    return source;
  }

  const match = source.match(dataUriRegex);
  if (!match || !match.groups?.data) {
    throw new Error('Invalid data URI for user photo.');
  }

  return Buffer.from(match.groups.data, 'base64');
}

function extractImageUrl(output: unknown): string {
  if (!output) {
    return '';
  }

  if (Array.isArray(output)) {
    for (const entry of output) {
      const fromArray = extractImageUrl(entry);
      if (fromArray) {
        return fromArray;
      }
    }
    return '';
  }

  if (typeof output === 'string') {
    return output;
  }

  if (typeof output === 'object') {
    const candidate = output as Record<string, unknown>;
    if (typeof candidate.url === 'string') {
      return candidate.url;
    }
    if (typeof candidate.path === 'string') {
      return candidate.path;
    }
    if (Array.isArray(candidate.output)) {
      return extractImageUrl(candidate.output);
    }
  }

  return '';
}

function buildPreferencesContext(preferences?: UserPreferences): string {
  if (!preferences) {
    return '';
  }

  return `
User Preferences to Consider:
- Preferred Styles: ${preferences.preferredStyles.join(', ') || 'None provided'}
- Disliked Items: ${preferences.dislikedItems.join(', ') || 'None provided'}
- Preferred Colors: ${preferences.preferredColors.join(', ') || 'None provided'}
- Preferred Fit: ${preferences.preferredFit.join(', ') || 'None provided'}
- Previously Liked Looks: ${preferences.likedLooks.length}
- Previously Disliked Looks: ${preferences.dislikedLooks.length}

Please adapt the style to avoid disliked items and emphasize preferred elements.
`;
}

function extractPromptText(raw: unknown): string {
  if (!raw) {
    return '';
  }

  if (typeof raw === 'string') {
    return sanitizeText(raw);
  }

  if (Array.isArray(raw)) {
    return sanitizeText(raw.join(''));
  }

  if (typeof raw === 'object') {
    const candidate = raw as Record<string, unknown>;
    if (typeof candidate.text === 'string') {
      return sanitizeText(candidate.text);
    }
    if (typeof candidate.response === 'string') {
      return sanitizeText(candidate.response);
    }
    if (typeof candidate.content === 'string') {
      return sanitizeText(candidate.content);
    }
  }

  return '';
}

async function generateFalGridImage(prompt: string, imageInputs: FalImageSource[], fallbackLabelBase = 'input'): Promise<string> {
  if (!FAL_GRID_ENABLED) {
    throw new Error('fal grid is not configured (FAL_KEY missing).');
  }

  const filteredImages = imageInputs.filter((item) => Boolean(item?.source));
  const preparedImages = await Promise.all(
    filteredImages.map((value, index) => prepareFalImageInput(value, `${fallbackLabelBase}-${index}`))
  );
  const input: Record<string, unknown> = {
    prompt,
    num_images: 1,
    aspect_ratio: '9:16',
    output_format: 'jpeg',
    resolution: '1K',
  };

  if (preparedImages.length) {
    input.image_urls = preparedImages;
  }

  const response = await fal.run(FAL_GRID_ENDPOINT, { input });
  const extractUrl = (payload: unknown): string | null => {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) {
      for (const entry of payload) {
        const found = extractUrl(entry);
        if (found) return found;
      }
      return null;
    }
    if (typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      if (typeof obj.url === 'string') {
        return obj.url;
      }
      if (Array.isArray(obj.images)) {
        const found = extractUrl(obj.images);
        if (found) return found;
      }
      if (obj.output) return extractUrl(obj.output);
      if (obj.result) return extractUrl(obj.result);
      if (obj.data) return extractUrl(obj.data);
    }
    return null;
  };

  const imageUrl = extractUrl(response);
  if (imageUrl) {
    return imageUrl;
  }

  console.error('[fal] Unexpected response payload:', response);
  throw new Error('fal-ai nano-banana-pro did not return an image URL.');
}

async function normalizeImageInput(value: string): Promise<string | Buffer> {
  if (!value) {
    throw new Error('Invalid image input.');
  }
  if (value.startsWith('data:')) {
    const match = value.match(dataUriRegex);
    if (!match || !match.groups?.data) {
      throw new Error('Invalid data URI input.');
    }
    return Buffer.from(match.groups.data, 'base64');
  }
  return value;
}

async function generateNanoBananaImage(
  prompt: string,
  imageInputs: string[] = [],
  options?: { aspectRatio?: string }
): Promise<string> {
  const filteredImages = imageInputs.filter((value): value is string => Boolean(value));
  const preparedImages = await Promise.all(filteredImages.map((value) => normalizeImageInput(value)));
  const aspectRatio =
    options?.aspectRatio ?? (preparedImages.length > 0 ? 'match_input_image' : '9:16');
  const output = await runReplicateModel(NANO_BANANA_MODEL, {
    prompt,
    output_format: 'jpg',
    aspect_ratio: aspectRatio,
    image_input: preparedImages,
  });

  const imageUrl = extractImageUrl(output);
  if (!imageUrl) {
    throw new Error('nano-banana did not return an image URL.');
  }
  return imageUrl;
}

type FalImageSource = {
  source: string;
  label?: string;
};

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

async function prepareFalImageInput(descriptor: FalImageSource, fallbackLabel: string): Promise<File> {
  const { source, label } = descriptor;
  if (!source) {
    throw new Error('Invalid image input.');
  }
  const fileLabel = label ?? fallbackLabel;
  if (source.startsWith('data:')) {
    const match = source.match(dataUriRegex);
    if (!match?.groups?.data || !match.groups.mime) {
      throw new Error('Invalid data URI input.');
    }
    const mime = normalizeFalMime(match.groups.mime);
    const fileName = ensureFileName(fileLabel, mime);
    return new File([Buffer.from(match.groups.data, 'base64')], fileName, { type: mime });
  }
  if (isRemoteUrl(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download image for fal (${response.status})`);
    }
    const mime = normalizeFalMime(response.headers.get('content-type') || 'image/jpeg');
    const arrayBuffer = await response.arrayBuffer();
    const fileName = ensureFileName(fileLabel, mime);
    return new File([Buffer.from(arrayBuffer)], fileName, { type: mime });
  }
  return new File([Buffer.from(source)], ensureFileName(fileLabel, 'image/jpeg'), { type: 'image/jpeg' });
}

async function createGridTemplateDataUri(): Promise<string> {
  const base = sharp({
    create: {
      width: GRID_TEMPLATE_WIDTH,
      height: GRID_TEMPLATE_HEIGHT,
      channels: 3,
      background: GRID_TEMPLATE_BACKGROUND,
    },
  });

  const verticalLine = await sharp({
    create: {
      width: GRID_TEMPLATE_LINE_THICKNESS,
      height: GRID_TEMPLATE_HEIGHT,
      channels: 3,
      background: GRID_TEMPLATE_LINE_COLOR,
    },
  })
    .png()
    .toBuffer();

  const horizontalLine = await sharp({
    create: {
      width: GRID_TEMPLATE_WIDTH,
      height: GRID_TEMPLATE_LINE_THICKNESS,
      channels: 3,
      background: GRID_TEMPLATE_LINE_COLOR,
    },
  })
    .png()
    .toBuffer();

  const overlays: OverlayOptions[] = [
    {
      input: verticalLine,
      left: Math.round(GRID_TEMPLATE_WIDTH / 2 - GRID_TEMPLATE_LINE_THICKNESS / 2),
      top: 0,
    },
    {
      input: horizontalLine,
      left: 0,
      top: Math.round(GRID_TEMPLATE_HEIGHT / 4 - GRID_TEMPLATE_LINE_THICKNESS / 2),
    },
    {
      input: horizontalLine,
      left: 0,
      top: Math.round(GRID_TEMPLATE_HEIGHT / 2 - GRID_TEMPLATE_LINE_THICKNESS / 2),
    },
    {
      input: horizontalLine,
      left: 0,
      top: Math.round((GRID_TEMPLATE_HEIGHT * 3) / 4 - GRID_TEMPLATE_LINE_THICKNESS / 2),
    },
  ];

  const buffer = await base.composite(overlays).png().toBuffer();
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

const getGridTemplateDataUri = async (): Promise<string | null> => gridTemplateDataUriPromise;

const buildGridSlotBlock = (look: ExploreLook): string => {
  const items = Array.isArray(look.items) ? look.items : [];
  const slots = Array.from({ length: 8 }, (_, index) => items[index]);
  const rows: string[] = [];

  for (let row = 0; row < 4; row++) {
    rows.push(`Row ${row + 1}`);
    for (let col = 0; col < 2; col++) {
      const idx = row * 2 + col;
      const item = slots[idx];
      if (item) {
        rows.push(`${idx + 1}. ${sanitizeText(item.label)} – ${sanitizeText(item.searchQuery)}`);
      } else {
        rows.push(`${idx + 1}. Leave this cell completely empty with only the neutral grey background.`);
      }
    }
    rows.push('');
  }

  return rows.join('\n').trim();
};

const buildGridPrompt = (look: ExploreLook): string => {
  const slotBlock = buildGridSlotBlock(look);
  const summaryPieces = [look.title, look.description, look.vibe]
    .map((text) => sanitizeText(text ?? ''))
    .filter(Boolean)
    .join(' · ');

  return `You will receive a reference outfit photo as the ONLY visual input. Do not render the person or any background.
Reference outfit summary: ${summaryPieces || 'modern outfit'}.

Create a clean 2×4 fashion flat-lay grid on a neutral grey background.
Each cell must contain ONE item, centered, evenly spaced, with soft shadow, shot as high-quality product photography. No model, no hands, no background elements.

IMPORTANT: Show complete, full garments - NO CUTS! Ensure each clothing item is fully visible with proper margins.
- For tops: Show entire neckline, sleeves, and hem
- For bottoms: Show full waistband to hem
- For dresses: Show complete garment from top to bottom
- For outerwear: Display entire jacket/coat with all details
- For shoes: Show complete pair, not cut off
- CRITICAL: Make sure ALL items fit PROPERLY and FULLY inside each cell - do NOT let items touch or cross cell borders
- IMPORTANT: Scale items SMALLER to ensure they fit completely - leave significant empty space around each item
- FIRST COLUMN items (positions 1, 3, 5, 7): Make them especially smaller to guarantee they fit within their cells
- Each item must be scaled appropriately to fit completely within its allocated space

Use this exact order:

${slotBlock}

Strict rules:
– The layout must be exactly 2×4.
– All items must match the descriptions precisely.
– Show COMPLETE items - no cropping or cutting off any part of the garments
– IMPORTANT: Make items SMALLER rather than larger - better to have too much empty space than cut off items
– Leave EXTRA padding around each item (at least 15% of cell size for safety)
– CRITICAL: Ensure items fit COMPLETELY inside their cells without touching borders
– FIRST COLUMN: Scale these items even smaller to prevent overflow
– Scale items appropriately to fit fully within each individual cell space
– Identical camera angle, fixed scale, consistent lighting.
– No people, no mannequins, no props.
– If a slot specifies leaving it empty, leave that cell blank with only the neutral grey background.`;
};

async function sliceGridCells(buffer: Buffer, gender: 'male' | 'female', lookId: string): Promise<string[]> {
  const verticalGap = GRID_TEMPLATE_LINE_THICKNESS;
  const horizontalGap = GRID_TEMPLATE_LINE_THICKNESS;

  const usableWidth = GRID_TEMPLATE_WIDTH - verticalGap;
  const firstColumnWidth = Math.floor(usableWidth / 2);
  const secondColumnWidth = GRID_TEMPLATE_WIDTH - firstColumnWidth - verticalGap;
  const columnWidths = [firstColumnWidth, secondColumnWidth];
  const columnLefts = [0, firstColumnWidth + verticalGap];

  const usableHeight = GRID_TEMPLATE_HEIGHT - horizontalGap * 3;
  const baseRowHeight = Math.floor(usableHeight / 4);
  const rowHeights = [
    baseRowHeight,
    baseRowHeight,
    baseRowHeight,
    GRID_TEMPLATE_HEIGHT - (baseRowHeight * 3 + horizontalGap * 3),
  ];
  const rowTops = rowHeights.map((_, index) => {
    const gapCount = index === 0 ? 0 : index;
    const previousHeights = rowHeights.slice(0, index).reduce((sum, value) => sum + value, 0);
    return previousHeights + gapCount * horizontalGap;
  });

  const cells: string[] = [];

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const left = columnLefts[col];
      const top = rowTops[row];
      const width = columnWidths[col];
      const height = rowHeights[row];

      // Add padding to avoid cutting items at cell borders
      const padding = Math.min(width, height) * 0.05; // 5% padding
      const paddedLeft = Math.round(left + padding);
      const paddedTop = Math.round(top + padding);
      const paddedWidth = Math.round(width - padding * 2);
      const paddedHeight = Math.round(height - padding * 2);

      const cellBuffer = await sharp(buffer)
        .extract({ left: paddedLeft, top: paddedTop, width: paddedWidth, height: paddedHeight })
        .jpeg({ quality: 92 })
        .toBuffer();
      const url = await persistExploreAssetBuffer(cellBuffer, gender, lookId, `grid-cell-${row * 2 + col + 1}`, 'image/jpeg');
      cells.push(url);
    }
  }

  return cells;
}

async function generateLookGridAssets(look: ExploreLook): Promise<{ gridImageUrl: string; gridCellUrls: string[] } | null> {
  if (!look.imageUrl) {
    return null;
  }

  const template = await getGridTemplateDataUri();
  const baseInputs: FalImageSource[] = [
    { source: look.imageUrl, label: `${look.id}.jpg` },
  ];
  if (template) {
    baseInputs.push({ source: template, label: 'grid-template.png' });
  }
  const gridPrompt = buildGridPrompt(look);

  try {
    const gridUrl = await generateFalGridImage(gridPrompt, baseInputs, look.id);
    const response = await fetch(gridUrl);
    if (!response.ok) {
      throw new Error(`Failed to download grid image (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const baseBuffer = Buffer.from(arrayBuffer);
    const normalizedBuffer = await sharp(baseBuffer)
      .resize(GRID_TEMPLATE_WIDTH, GRID_TEMPLATE_HEIGHT, { fit: 'contain', background: { r: 179, g: 179, b: 179 } })
      .jpeg({ quality: 94 })
      .toBuffer();
    const gridImageUrl = await persistExploreAssetBuffer(
      normalizedBuffer,
      look.gender,
      look.id,
      'grid',
      'image/jpeg'
    );
    const gridCellUrls = await sliceGridCells(normalizedBuffer, look.gender, look.id);
    return { gridImageUrl, gridCellUrls };
  } catch (error) {
    console.error(`[server] Failed to generate grid assets for ${look.id}`, error);
    throw error;
  }
}

async function generateEditPrompt(basePrompt: string, preferences?: UserPreferences): Promise<string> {
  const gptPrompt = `You are a professional fashion stylist and AI image editing expert.

You need to create a detailed edit prompt for the AI image editing model "reve/edit-fast" to transform a person's uploaded photo into a specific fashion style.

Base Style Description: ${basePrompt}
${buildPreferencesContext(preferences)}

Requirements for the edit prompt:
1. Apply the style to the person in the uploaded photo
2. Be specific about clothing items, colors, patterns, and textures
3. Include accessories, shoes, and overall aesthetic
4. Ensure the result shows only the person from the original photo
5. Make sure all clothing items are clearly visible and well-defined
6. Maintain the person's approximate body shape and features
7. Use fashion terminology that works well with AI image editing
8. If user has preferences, adapt the style accordingly (avoid disliked items)

CRITICAL REQUIREMENTS:
- Must be FULL BODY IMAGE from head to toe
- Must clearly show FOOTWEAR/SHOES
- No cropped images, no close-ups
- Complete outfit must be visible including shoes

Output format:
Generate ONLY the optimized edit prompt (no explanations). The prompt should be direct and clear for image editing.`;

  const output = await runReplicateModel(GPT5_MODEL, {
    prompt: gptPrompt,
    max_tokens: 1024,
    temperature: 0.7,
  });

  const extracted = extractPromptText(output).trim();
  if (extracted) {
    return extracted;
  }

  return `Make the person wear ${basePrompt}. FULL BODY IMAGE from head to toe, INCLUDING FOOTWEAR/SHOES clearly visible. Maintain natural features. Single person only, solo portrait. Complete outfit must be shown including shoes.`;
}

async function editPhotoWithReve(userPhoto: string, prompt: string): Promise<string> {
  const imageInput = await prepareImageInput(userPhoto);
  const output = await runReplicateModel(REVE_MODEL, {
    image: imageInput,
    prompt,
  });

  return extractImageUrl(output);
}

function selectLooks(gender: 'male' | 'female', limit = DEFAULT_LOOK_LIMIT, lookIds?: string[]): ComprehensiveLook[] {
  const pool = ComprehensivePromptLibrary.getBalancedSelection(gender);
  let selected = pool;

  if (lookIds?.length) {
    selected = pool.filter((look) => lookIds.includes(look.id));
  }

  return selected.slice(0, limit);
}

export interface GenerateLooksOptions {
  userPhoto: string;
  gender: 'male' | 'female';
  userPreferences?: UserPreferences;
  limit?: number;
  lookIds?: string[];
}

export async function generatePersonalizedLooks(options: GenerateLooksOptions): Promise<PersonalLook[]> {
  const { userPhoto, gender, userPreferences, limit = DEFAULT_LOOK_LIMIT, lookIds } = options;

  const looksToGenerate = selectLooks(gender, limit, lookIds);
  const results: PersonalLook[] = [];

  for (const look of looksToGenerate) {
    console.log(`[server] Generating look "${look.name}"`);
    try {
      const editPrompt = await generateEditPrompt(look.prompt, userPreferences);
      const styledPhotoUrl = await editPhotoWithReve(userPhoto, editPrompt);

      results.push({
        id: `personal_${look.id}_${Date.now()}`,
        lookId: look.id,
        name: look.name,
        category: look.category,
        level: look.level,
        originalPrompt: look.prompt,
        editPrompt,
        originalPhotoUrl: userPhoto,
        styledPhotoUrl,
        isGenerated: Boolean(styledPhotoUrl),
        generatedAt: new Date(),
      });
    } catch (error) {
      console.error(`[server] Failed to generate look "${look.name}"`, error);
      results.push({
        id: `personal_${look.id}_${Date.now()}`,
        lookId: look.id,
        name: look.name,
        category: look.category,
        level: look.level,
        originalPrompt: look.prompt,
        editPrompt: '',
        originalPhotoUrl: userPhoto,
        styledPhotoUrl: undefined,
        isGenerated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generatedAt: new Date(),
      });
    }
  }

  return results;
}

type ExplorePrompt = {
  title: string;
  description: string;
  vibe: string;
  prompt: string;
  imagePrompt?: string;
  items?: ShopItem[];
  styleTag?: string;
};

const normalizeShopItems = (
  rawItems: unknown,
  defaultGender: 'male' | 'female'
): ShopItem[] | undefined => {
  if (!Array.isArray(rawItems)) return undefined;
  const normalized: ShopItem[] = rawItems
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const idSource = candidate.id ?? candidate.category ?? `item_${index}`;
      const labelSource = candidate.label ?? candidate.name ?? candidate.title;
      const searchSource = candidate.search_query ?? candidate.searchQuery ?? candidate.query;
      const categorySource = candidate.category ?? candidate.type ?? `item_${index}`;
      if (typeof labelSource !== 'string' || typeof searchSource !== 'string') {
        return null;
      }
      const genderSource = candidate.gender === 'male' || candidate.gender === 'female'
        ? candidate.gender
        : defaultGender;
      return {
        id: sanitizeText(String(idSource)),
        label: sanitizeText(labelSource),
        searchQuery: sanitizeText(searchSource),
        category: sanitizeText(String(categorySource)),
        gender: genderSource,
      };
    })
    .filter((value): value is ShopItem => Boolean(value));
  return normalized.length ? normalized : undefined;
};

const normalizePromptSpec = (
  spec: any,
  gender: 'male' | 'female',
  styleTag?: string
): ExplorePrompt => {
  const basePrompt =
    typeof spec?.image_prompt === 'string'
      ? spec.image_prompt
      : typeof spec?.prompt === 'string'
        ? spec.prompt
        : '';

  return {
    title: sanitizeText(spec?.title ?? 'Untitled Look'),
    description: sanitizeText(spec?.description ?? ''),
    vibe: sanitizeText(spec?.vibe ?? 'concept'),
    prompt: sanitizeText(basePrompt || spec?.prompt || ''),
    imagePrompt: basePrompt ? sanitizeText(basePrompt) : undefined,
    items: normalizeShopItems(spec?.items, gender),
    styleTag,
  };
};

function getFallbackExplorePrompts(
  gender: 'male' | 'female',
  count: number,
  styleTag?: string
): ExplorePrompt[] {
  const libraryLooks = ExploreLookLibrary.getLooks(gender);
  if (libraryLooks.length === 0) {
    throw new Error('No fallback explore looks available.');
  }

  const prompts: ExplorePrompt[] = [];
  for (let i = 0; i < count; i++) {
    const look = libraryLooks[i % libraryLooks.length];
    prompts.push({
      title: sanitizeText(look.title),
      description: sanitizeText(look.description),
      vibe: sanitizeText(look.vibe),
      prompt: sanitizeText(look.prompt),
      imagePrompt: sanitizeText(look.prompt),
      styleTag,
    });
  }

  return prompts;
}

export async function generateExplorePrompts(
  gender: 'male' | 'female',
  count: number,
  styleTag?: string
): Promise<ExplorePrompt[]> {
  const vibeList = gender === 'female'
    ? ['weekend chic', 'minimal luxe', 'sporty', 'boho', 'evening glamour', 'streetwear', 'resort']
    : ['smart casual', 'minimal street', 'athleisure', 'tailored', 'utility', 'retro sport', 'creative studio'];

  const sceneSample = ALL_SCENE_REFERENCES.slice(0, 8).join('; ');
  const styleDirective = getStyleDirective(styleTag);

  const trendNotes = pickRandomItems(GLOBAL_TRENDS, 2).join(' ');

  const gptPrompt = `You are styling an Instagram Explore feed that mixes wearable everyday outfits with occasional statement looks for a ${gender} audience.
Design ${count} unique looks spanning relaxed daywear, polished smart casual, sporty sets, night-out energy, and only a few futuristic moments.

Rules:
1. At least half of the looks should feel approachable / real-world (linen tailoring, denim, athleisure, elevated basics). The rest can introduce bolder textures or silhouettes, but keep everything tasteful.
2. "description" stays under 14 words and highlights the standout pieces.
3. "prompt" must describe clothing layers, fabrics, footwear, hair/makeup, pose energy, and a unique environment (use scenes like: ${sceneSample}). Explicitly mention that the shot is full-body, vertical 9:16, shoes visible.
4. Every garment reference must include a clear color adjective (e.g., "charcoal pressed trousers" instead of just "pressed trousers"). Apply this both in the narrative prompt and in each item entry.
5. Every look must be meaningfully different from the others. Avoid repeating the same clothing combination or palette; vary silhouettes, footwear, fabrics, and environments. Reference previously mentioned looks in your planning to prevent duplicates.
${styleDirective ? `6. Apply this specific aesthetic throughout: ${styleDirective.instructions}` : '6. Ensure the set includes realistic seasonal dressing (e.g., outerwear for cold months, breezy fabrics for summer) and believable environments for each look.'}

Trend inspiration to weave into the outfits: ${trendNotes}

Return ONLY a valid JSON array (no surrounding prose). The response MUST begin with "[" and end with "]". Each entry must follow this shape:
{
  "title": "2-4 word catchy name",
  "description": "max 14 words describing outfit pieces",
  "vibe": "one of these: ${vibeList.join(', ')}",
  "image_prompt": "text we will send to an image model (include silhouette, colors, lighting, setting)",
  "items": [
    {
      "id": "jacket",
      "label": "Olive MA-1 bomber jacket",
      "search_query": "women's olive MA-1 bomber jacket matte nylon ribbed cuffs",
      "category": "jacket",
      "gender": "${gender}"
    },
    ...
  ]
}
Guidelines for items: include 4-6 entries covering the full outfit (tops, bottoms, footwear, outer layers, hero accessories). Make "search_query" 6-10 words describing gender, color (mandatory), fabric, and vibe so we can plug it into shopping search.
Use precise fashion language, highlight footwear, and ensure full-body framing.`;

  const output = await runReplicateModel(GPT5_MODEL, {
    prompt: gptPrompt,
    max_tokens: 1024,
    temperature: 0.7,
  });

  const raw = extractPromptText(output);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('[server] GPT-5 explore prompt response was not JSON. Falling back to local library.');
    return getFallbackExplorePrompts(gender, count, styleTag);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty array');
    }
    return parsed.map((spec) => normalizePromptSpec(spec, gender, styleTag));
  } catch (error) {
    console.error('[server] Failed to parse GPT-5 explore prompts, using fallback library.', error);
    return getFallbackExplorePrompts(gender, count, styleTag);
  }
}

export async function remixLookWithPrompt(
  userPhoto: string,
  prompt: string,
  referenceImage?: string,
  itemImages: string[] = []
) {
  const imageInputs = [userPhoto, referenceImage, ...itemImages];
  const cleanedPrompt = stripSceneClauses(prompt.trim());
  const finalPrompt = `${cleanedPrompt} Apply this outfit to the provided person while keeping their exact face, pose, and body proportions unchanged. Do not introduce any new people or backgrounds. ${FRAMING_REQUIREMENTS}`;
  const styledPhotoUrl = await generateNanoBananaImage(finalPrompt, imageInputs);
  const storagePath = await persistRemixImage(styledPhotoUrl);
  const signedUrl = await getRemixSignedUrl(storagePath);
  return {
    styledPhotoUrl: signedUrl,
    storagePath
  };
}

export async function generateExploreLooks(
  gender: 'male' | 'female',
  count: number,
  styleTag?: string
): Promise<ExploreLook[]> {
  const dataset = await readExploreDataset();
  const prompts = await generateExplorePrompts(gender, count * 2, styleTag);
  const generated: ExploreLook[] = [];
  const scenes = SCENE_PRESETS[gender];
  const seenKeys = new Set<string>(
    dataset[gender].map((look) => uniquenessKey(sanitizeExploreLook(look)))
  );

  for (let i = 0; i < prompts.length && generated.length < count; i++) {
    const prompt = prompts[i];
    const scene = pickRandom(scenes);
    const baseImagePrompt = prompt.imagePrompt ?? prompt.prompt;
    const cleanedPrompt = stripSceneClauses(baseImagePrompt.trim());
    const finalPrompt = `${cleanedPrompt} Scene: ${scene}. ${FRAMING_REQUIREMENTS}`;
    const styledPhotoUrl = await generateNanoBananaImage(finalPrompt);
    const lookId = `explore_${gender}_${Date.now()}_${i}`;
    const persistentUrl = await persistExploreImage(styledPhotoUrl, gender, lookId);

    const look = sanitizeExploreLook({
      id: lookId,
      gender,
      title: prompt.title,
      description: prompt.description,
      vibe: prompt.vibe,
      prompt: prompt.prompt,
      imagePrompt: finalPrompt,
      items: prompt.items,
      imageUrl: persistentUrl,
      styleTag,
    });

    const gridAssets = await generateLookGridAssets(look);
    if (gridAssets) {
      look.gridImageUrl = gridAssets.gridImageUrl;
      look.gridCellUrls = gridAssets.gridCellUrls;
      if (look.items?.length) {
        look.items = look.items.map((item, index) => ({
          ...item,
          gridCellUrl: gridAssets.gridCellUrls[index] ?? item.gridCellUrl,
        }));
      }
    }

    await cacheLookShoppingResults(look);

    const key = uniquenessKey(look);
    if (seenKeys.has(key)) {
      console.warn('[server] Skipping duplicate explore look', look.title);
      continue;
    }

    seenKeys.add(key);
    generated.push(look);
  }

  if (generated.length < count) {
    console.warn(
      `[server] Only generated ${generated.length}/${count} unique explore looks. Consider increasing prompt diversity.`
    );
  }

  const merged = [...generated, ...dataset[gender]].slice(0, 50);
  dataset[gender] = merged;
  await writeExploreDataset(dataset);
  return merged;
}

interface ReferenceInspiredOptions {
  gender: 'male' | 'female';
  referenceImages: string[];
  count: number;
  styleTag?: string;
}

type StoredReference = {
  url: string;
  prompt: ExplorePrompt;
};

async function storeReferenceImages(
  gender: 'male' | 'female',
  images: string[],
  styleTag?: string
): Promise<StoredReference[]> {
  const stored: StoredReference[] = [];
  for (let i = 0; i < images.length; i++) {
    const label = `ref_${i}`;
    const url = await persistReferenceImage(images[i], gender, label);
    const placeholder: ExploreLook = {
      id: `reference_${Date.now()}_${i}`,
      gender,
      title: `Reference look ${i + 1}`,
      description: 'Uploaded inspiration look',
      prompt: '',
      imageUrl: url,
      vibe: styleTag ? `reference ${styleTag}` : 'reference inspiration',
      styleTag,
    };
    const promptSpec = await generateSingleLookSpec(placeholder, styleTag);
    stored.push({
      url,
      prompt: promptSpec,
    });
  }
  return stored;
}

export async function generateExploreLooksFromReferences(options: ReferenceInspiredOptions): Promise<ExploreLook[]> {
  const { gender, referenceImages, count, styleTag } = options;
  if (!referenceImages?.length) {
    throw new Error('At least one reference image is required.');
  }
  const limitedImages = referenceImages.slice(0, 8);
  let storedReferences: StoredReference[];
  try {
    storedReferences = await storeReferenceImages(gender, limitedImages, styleTag);
  } catch (error) {
    console.error('[server] Failed to persist or describe reference images, using inline data URIs.', error);
    const fallbackPrompts = getFallbackExplorePrompts(gender, limitedImages.length, styleTag);
    storedReferences = limitedImages.map((dataUrl, index) => ({
      url: dataUrl,
      prompt: fallbackPrompts[index % fallbackPrompts.length],
    }));
  }

  const dataset = await readExploreDataset();
  const targetCount = Math.min(limitedImages.length, Math.max(1, Number(count) || limitedImages.length));
  const prompts = storedReferences.map((item) => item.prompt).slice(0, targetCount);
  const generated: ExploreLook[] = [];
  const scenes = SCENE_PRESETS[gender];
  const seenKeys = new Set<string>(
    dataset[gender].map((look) => uniquenessKey(sanitizeExploreLook(look)))
  );

  for (let i = 0; i < prompts.length && generated.length < targetCount; i++) {
    const prompt = prompts[i];
    const scene = pickRandom(scenes);
    const baseImagePrompt = prompt.imagePrompt ?? prompt.prompt;
    const cleanedPrompt = stripSceneClauses(baseImagePrompt.trim());
    const finalPrompt = `${cleanedPrompt} Scene: ${scene}. ${FRAMING_REQUIREMENTS} Use vivid, full-color photography with natural lighting; never black-and-white or monochrome.`;
    const styledPhotoUrl = await generateNanoBananaImage(finalPrompt);
    const lookId = `explore_${gender}_ref_${Date.now()}_${i}`;
    const persistentUrl = await persistExploreImage(styledPhotoUrl, gender, lookId);

    const look = sanitizeExploreLook({
      id: lookId,
      gender,
      title: prompt.title,
      description: prompt.description,
      vibe: prompt.vibe,
      prompt: prompt.prompt,
      imagePrompt: finalPrompt,
      items: prompt.items,
      imageUrl: persistentUrl,
      styleTag,
    });

    const gridAssets = await generateLookGridAssets(look);
    if (gridAssets) {
      look.gridImageUrl = gridAssets.gridImageUrl;
      look.gridCellUrls = gridAssets.gridCellUrls;
      if (look.items?.length) {
        look.items = look.items.map((item, index) => ({
          ...item,
          gridCellUrl: gridAssets.gridCellUrls[index] ?? item.gridCellUrl,
        }));
      }
    }

    await cacheLookShoppingResults(look);

    const key = uniquenessKey(look);
    if (seenKeys.has(key)) {
      console.warn('[server] Skipping duplicate reference-inspired look', look.title);
      continue;
    }
    seenKeys.add(key);
    generated.push(look);
  }

  if (generated.length < targetCount) {
    console.warn(`[server] Only generated ${generated.length}/${targetCount} reference-inspired looks.`);
  }

  const merged = [...generated, ...dataset[gender]].slice(0, 50);
  dataset[gender] = merged;
  await writeExploreDataset(dataset);
  return merged;
}

async function applyGridAssetsToLook(
  look: ExploreLook,
  fallbackGender: 'male' | 'female'
): Promise<ExploreLook> {
  const targetGender = look.gender ?? fallbackGender;
  const assets = await generateLookGridAssets({ ...look, gender: targetGender });
  if (!assets) {
    throw new Error('Failed to generate grid assets.');
  }

  const itemsWithCells = look.items?.map((item, index) => ({
    ...item,
    gridCellUrl: assets.gridCellUrls[index] ?? item.gridCellUrl,
  }));

  const lookWithAssets: ExploreLook = {
    ...look,
    gender: targetGender,
    gridImageUrl: assets.gridImageUrl,
    gridCellUrls: assets.gridCellUrls,
    items: itemsWithCells,
  };

  const cached = await cacheLookShoppingResults(lookWithAssets);
  return sanitizeExploreLook(cached);
}

export async function regenerateLookGrid(
  gender: 'male' | 'female',
  lookId: string
): Promise<ExploreLook> {
  if (!lookId) {
    throw new Error('Look id is required.');
  }
  const dataset = await readExploreDataset();
  const index = dataset[gender].findIndex((look) => look.id === lookId);
  if (index === -1) {
    throw new Error('Look not found.');
  }

  const refreshed = await applyGridAssetsToLook(dataset[gender][index], gender);
  dataset[gender][index] = refreshed;
  await writeExploreDataset(dataset);
  return refreshed;
}

export async function regenerateAllLookGrids(
  gender: 'male' | 'female',
  onProgress?: (progress: number) => void
): Promise<ExploreLook[]> {
  const dataset = await readExploreDataset();
  const updated: ExploreLook[] = [];

  for (let index = 0; index < dataset[gender].length; index++) {
    const look = dataset[gender][index];
    try {
      const refreshed = await applyGridAssetsToLook(look, gender);
      updated.push(refreshed);
    } catch (error) {
      console.error(`[server] Failed to regenerate grid for ${look.id}`, error);
      updated.push(sanitizeExploreLook(look));
    }
    if (onProgress) {
      onProgress(index + 1);
    }
  }

  dataset[gender] = updated;
  await writeExploreDataset(dataset);
  return updated;
}

type SegmentedPiece = Record<string, unknown>;

interface SegmentedLookResponse {
  overall_style?: string;
  top?: Record<string, SegmentedPiece>;
  bottom?: Record<string, SegmentedPiece>;
  accessories?: Record<string, SegmentedPiece>;
  footwear?: Record<string, SegmentedPiece>;
  hair?: Record<string, unknown>;
  makeup?: Record<string, unknown>;
  color_palette?: unknown;
}

const SEGMENT_DETAIL_KEYS = [
  'print',
  'pattern',
  'detail',
  'fit',
  'silhouette',
  'purpose',
  'style',
  'vibe',
  'hem_detail',
  'waist',
  'extra_embellishment',
  'length',
  'placement',
];

const SEGMENT_PROMPT_SUFFIX =
  'Full body fashion photo in rich color, 9:16 framing, entire outfit and shoes clearly visible, natural cinematic lighting.';

const clampTitleLength = (value: string, maxLength = 20): string => {
  if (!value) return '';
  if (value.length <= maxLength) {
    return value;
  }
  const truncated = value.slice(0, Math.max(0, maxLength - 3)).trimEnd();
  return `${truncated}...`;
};

const humanizeSegmentKey = (key: string): string =>
  key
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim() || 'Item';

const segmentValueToText = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    return text.length ? text : undefined;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => (typeof entry === 'string' || typeof entry === 'number' ? String(entry).trim() : undefined))
      .filter((entry): entry is string => Boolean(entry));
    return parts.length ? parts.join(' ') : undefined;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => {
        const normalized = segmentValueToText(entry);
        return normalized ? `${humanizeSegmentKey(key)} ${normalized}` : undefined;
      })
      .filter((entry): entry is string => Boolean(entry));
    return entries.length ? entries.join(', ') : undefined;
  }
  return undefined;
};

const buildSegmentLabel = (pieceKey: string, piece: SegmentedPiece): string | null => {
  const typeText = segmentValueToText(piece.type) ?? humanizeSegmentKey(pieceKey);
  const colorText = segmentValueToText(piece.color ?? (piece as any).colors);
  const materialText = segmentValueToText(piece.material);
  const baseParts = [colorText, materialText, typeText].filter(Boolean);
  if (!baseParts.length) {
    return null;
  }
  return baseParts.join(' ').replace(/\s+/g, ' ').trim();
};

const buildSegmentDetail = (piece: SegmentedPiece): string | undefined => {
  const details = SEGMENT_DETAIL_KEYS.map((key) => segmentValueToText(piece[key as keyof SegmentedPiece])).filter(
    (entry): entry is string => Boolean(entry)
  );
  return details.length ? details.join('; ') : undefined;
};

const buildShopItemFromSegment = (
  idPrefix: string,
  pieceKey: string,
  piece: SegmentedPiece,
  gender: 'male' | 'female'
): ShopItem | null => {
  const label = buildSegmentLabel(pieceKey, piece);
  if (!label) {
    return null;
  }
  const typeText = segmentValueToText(piece.type) ?? humanizeSegmentKey(pieceKey);
  const vibeText = segmentValueToText(piece.vibe ?? piece.style ?? piece.fit);
  const colorText = segmentValueToText(piece.color ?? (piece as any).colors);
  const materialText = segmentValueToText(piece.material);
  const searchParts = [gender, colorText, materialText, typeText, vibeText]
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => entry.replace(/\s+/g, ' ').trim());

  const searchQuery = searchParts.length ? searchParts.join(' ') : `${gender} ${typeText}`;

  return {
    id: sanitizeText(`${idPrefix}_${pieceKey}`),
    label: sanitizeText(label),
    searchQuery: sanitizeText(searchQuery),
    category: sanitizeText(humanizeSegmentKey(pieceKey)),
    gender,
  };
};

const describeSectionPieces = (
  sectionLabel: string,
  section?: Record<string, SegmentedPiece>,
  gender: 'male' | 'female'
): { sentences: string[]; items: ShopItem[] } => {
  if (!section || typeof section !== 'object') {
    return { sentences: [], items: [] };
  }
  const sentences: string[] = [];
  const items: ShopItem[] = [];
  let index = 0;

  for (const [pieceKey, rawPiece] of Object.entries(section)) {
    if (!rawPiece || typeof rawPiece !== 'object') {
      index += 1;
      continue;
    }
    const label = buildSegmentLabel(pieceKey, rawPiece);
    if (!label) {
      index += 1;
      continue;
    }
    const detail = buildSegmentDetail(rawPiece);
    const formatted = detail ? `${sectionLabel} - ${label} (${detail})` : `${sectionLabel} - ${label}`;
    sentences.push(sanitizeText(formatted));
    const item = buildShopItemFromSegment(`${sectionLabel.toLowerCase()}_${index}`, pieceKey, rawPiece, gender);
    if (item) {
      items.push(item);
    }
    index += 1;
  }

  return { sentences, items };
};

const describeFreeformSegment = (label: string, segment?: unknown): string | null => {
  if (!segment) {
    return null;
  }
  const text = segmentValueToText(segment);
  if (!text) {
    return null;
  }
  return `${label}: ${text}`;
};

const convertSegmentedLookToPrompt = (
  spec: SegmentedLookResponse,
  look: ExploreLook,
  styleTag?: string
): ExplorePrompt => {
  const sections = [
    describeSectionPieces('Top', spec.top, look.gender),
    describeSectionPieces('Bottom', spec.bottom, look.gender),
    describeSectionPieces('Accessories', spec.accessories, look.gender),
    describeSectionPieces('Footwear', spec.footwear, look.gender),
  ];
  const sentences = sections.flatMap((section) => section.sentences);
  const items = sections.flatMap((section) => section.items);

  const paletteText =
    Array.isArray(spec.color_palette) && spec.color_palette.length
      ? `Palette focuses on ${spec.color_palette.map((entry) => sanitizeText(String(entry))).join(', ')}.`
      : null;
  const hairText = describeFreeformSegment('Hair', spec.hair);
  const makeupText = describeFreeformSegment('Makeup', spec.makeup);

  const promptParts = [
    spec.overall_style ? `Overall style: ${spec.overall_style}.` : null,
    ...sentences.map((sentence) => `${sentence}.`),
    hairText ? `${hairText}.` : null,
    makeupText ? `${makeupText}.` : null,
    paletteText,
    'Full body fashion photo, vertical 9:16, complete outfit and shoes visible, realistic studio lighting, clean background.',
  ].filter((entry): entry is string => Boolean(entry));

  const prompt = promptParts.join(' ');

  const shortDescription = [spec.overall_style, sentences[0]].filter(Boolean).join(' - ');

  const baseTitle = spec.overall_style ?? look.title ?? 'Reference Look';
  const sanitizedTitle = sanitizeText(baseTitle);
  const title = clampTitleLength(sanitizedTitle);

  return {
    title,
    description: sanitizeText(shortDescription || spec.overall_style || look.description || 'Reference look'),
    vibe: sanitizeText(spec.overall_style ?? look.vibe ?? 'reference inspiration'),
    prompt: sanitizeText(prompt || SEGMENT_PROMPT_SUFFIX),
    imagePrompt: sanitizeText(prompt || SEGMENT_PROMPT_SUFFIX),
    items: items.length ? items : undefined,
    styleTag,
  };
};

const isSegmentedLookResponse = (value: unknown): value is SegmentedLookResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return Boolean(
    typeof candidate.overall_style === 'string' ||
      candidate.top ||
      candidate.bottom ||
      candidate.accessories ||
      candidate.footwear
  );
};

async function generateSingleLookSpec(
  look: ExploreLook,
  styleTag?: string
): Promise<ExplorePrompt> {
  const prompt = `segment this look into a json format like this (fill in as appropriate). Return ONLY valid JSON, no prose, no comments:

{
  "overall_style": "Harajuku-inspired alt-pop mix with punk, Y2K, and kawaii elements. Highly eclectic, layered textures and bold patterns.",
  "top": {
    "base_top": {
      "type": "sleeveless tank top",
      "color": "black",
      "print": "hot pink graphic print with abstract tech/robotic motifs",
      "fit": "tight and fitted",
      "vibe": "Y2K cyber-punk"
    },
    "layer": {
      "type": "tulle bolero / shoulder ruffle piece",
      "color": "bright red",
      "material": "layered tulle",
      "silhouette": "voluminous, exaggerated shoulders",
      "vibe": "theatrical, Harajuku-inspired"
    }
  },
  "bottom": {
    "skirt": {
      "type": "asymmetric mixed-media mini skirt",
      "primary_panel": {
        "pattern": "leopard print",
        "colors": ["brown", "black"]
      },
      "secondary_panel": {
        "color": "pink",
        "detail": "vertical white sporty stripes",
        "vibe": "Y2K trackwear influence"
      },
      "hem_detail": {
        "material": "sheer ruffle",
        "color": "beige",
        "placement": "full hemline"
      },
      "waist": {
        "visible_brand_band": "Calvin Klein",
        "belt": "loose silver chain belt"
      },
      "extra_embellishment": {
        "material": "faux fur",
        "color": "white",
        "location": "side attachment"
      }
    }
  },
  "accessories": {
    "gloves": {
      "type": "fingerless gloves",
      "color": "pink",
      "material": "mesh/perforated",
      "vibe": "punk + Y2K"
    },
    "necklace": {
      "type": "pearl necklace",
      "vibe": "kawaii contrast to punk elements"
    },
    "chains": {
      "location": "skirt area",
      "color": "silver",
      "purpose": "decorative"
    }
  },
  "footwear": {
    "boots": {
      "type": "lace-up combat boots",
      "color": "dark pink",
      "material": "matte leather or suede",
      "sole": "chunky"
    },
    "legwear": {
      "type": "mid-calf sock",
      "color": "black",
      "placement": "one leg only",
      "vibe": "alt-fashion asymmetry"
    }
  },
  "hair": {
    "color": "blonde",
    "length": "long",
    "style": {
      "front": "sleek parted sections",
      "top": "slightly teased volume",
      "details": "small accent braids integrated",
      "overall_vibe": "Harajuku + kawaii"
    }
  },
  "makeup": {
    "eyes": {
      "eyeshadow_color": "pink",
      "style": "heavy application with bold liner"
    },
    "lips": {
      "color": "soft pink",
      "style": "slightly overlined"
    },
    "overall_vibe": "doll-like with alt-punk intensity"
  },
  "color_palette": [
    "hot pink",
    "red",
    "leopard brown/black",
    "beige",
    "black",
    "white"
  ]
}

Use the provided photo (if available) plus this metadata:
Title: ${look.title}
Description: ${look.description}
Vibe: ${look.vibe}
Style tag: ${styleTag ?? 'n/a'}

Be as specific as possible (colors, textiles, cuts, layering, accessories, makeup, hair). If an element is not present, set it to null.`;

  const replicateInput: Record<string, unknown> = {
    prompt,
    max_tokens: 900,
    temperature: 0.4,
  };

  const referenceImage = look.gridImageUrl || look.imageUrl;
  if (referenceImage) {
    replicateInput.image_input = [referenceImage];
  }

  const output = await runReplicateModel(GPT5_MODEL, replicateInput);

  const raw = extractPromptText(output);
  const jsonMatch = raw.match(/\{[\s\S]+\}/);
  if (!jsonMatch) {
    throw new Error('GPT-5 single look response was not JSON.');
  }
  const parsed = JSON.parse(jsonMatch[0]);
  if (isSegmentedLookResponse(parsed)) {
    return convertSegmentedLookToPrompt(parsed, look, styleTag);
  }
  return normalizePromptSpec(parsed, look.gender, styleTag);
}

export async function enrichLookItems(lookId: string): Promise<ExploreLook> {
  const dataset = await readExploreDataset();
  const genders: Array<'male' | 'female'> = ['male', 'female'];

  for (const gender of genders) {
    const index = dataset[gender].findIndex((look) => look.id === lookId);
    if (index === -1) continue;

    const look = dataset[gender][index];
    if (look.items?.length && look.imagePrompt) {
      return look;
    }

    const spec = await generateSingleLookSpec(look, look.styleTag);
    const updated = sanitizeExploreLook({
      ...look,
      imagePrompt: spec.imagePrompt ?? look.imagePrompt ?? look.prompt,
      items: spec.items ?? look.items,
    });
    const cached = await cacheLookShoppingResults(updated);
    dataset[gender][index] = sanitizeExploreLook(cached);
    await writeExploreDataset(dataset);
    return dataset[gender][index];
  }

  throw new Error('Look not found for enrichment.');
}

export async function runFalGridDebug(prompt: string, imageInputs: string[] = []) {
  const descriptors: FalImageSource[] = imageInputs.map((source, index) => ({
    source,
    label: `debug-${index + 1}.png`,
  }));
  return generateFalGridImage(prompt, descriptors, 'debug');
}
const normalizeFalMime = (mime?: string): string => {
  if (!mime) return 'image/jpeg';
  const lower = mime.toLowerCase();
  if (lower.includes('png')) return 'image/png';
  if (lower.includes('webp')) return 'image/webp';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'image/jpeg';
  return 'image/jpeg';
};

const inferExtensionFromMime = (mime: string): string => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
};

const ensureFileName = (label: string, mime: string): string => {
  const ext = inferExtensionFromMime(mime);
  const normalized = label.toLowerCase();
  if (normalized.endsWith(`.${ext}`)) {
    return label;
  }
  return `${label.replace(/\.[a-z0-9]+$/i, '')}.${ext}`;
};

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
import sharp from 'sharp';

const GPT5_MODEL = 'openai/gpt-5';
const REVE_MODEL = 'reve/edit-fast:f0253eb7b26cc2416ad98c20492fbe4b842e09d808318fdf9e7caeffa9ae78f5';
const NANO_BANANA_MODEL = 'google/nano-banana';
const BACKGROUND_REMOVER_MODEL = '851-labs/background-remover:a029dff38972b5fda4ce5d75d71cd25aeff621d2cf4964a1055d7db06b80bc';
const FAL_GRID_ENDPOINT = 'fal-ai/nano-banana-pro/edit';
const FAL_GRID_CREDENTIALS =
  process.env.FAL_KEY ||
  process.env.FAL_AUTH_TOKEN ||
  process.env.FAL_TOKEN ||
  process.env.FAL_API_KEY ||
  (process.env.FAL_KEY_ID && process.env.FAL_KEY_SECRET
    ? `${process.env.FAL_KEY_ID}:${process.env.FAL_KEY_SECRET}`
    : undefined);
const FAL_GRID_ENABLED = Boolean(FAL_GRID_CREDENTIALS);
const FAL_REMIX_TIMEOUT_MS = 25000;

if (FAL_GRID_CREDENTIALS) {
  fal.config({ credentials: FAL_GRID_CREDENTIALS });
} else {
  console.warn('[grid] FAL_KEY not set. Grid generation will fall back to Replicate nano-banana.');
}
const DEFAULT_LOOK_LIMIT = 1;
const GRID_TEMPLATE_WIDTH = 1344;
const GRID_TEMPLATE_HEIGHT = 2048;
const GRID_TEMPLATE_COLUMNS = 2;
const GRID_TEMPLATE_ROWS = 4;
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

const getGridTemplateDataUri = () => gridTemplateDataUriPromise;

const FRAMING_REQUIREMENTS =
  'Full body portrait, vertical 9:16 composition (tall), camera at waist height, editorial lighting, footwear fully visible, confident pose captured mid-motion.';

const FAL_SEGMENT_PROMPT = `You will receive an empty grid image with number on each cell.
The grid already defines the exact positions of all cells.
Do NOT create a new grid. Use the one provided. When creating a new image, dont put the numbers on the grid, remove them. 

Your task is:
1. Extract all clothing items from the reference outfit photo.
2. Arrange the extracted items into the grid cells IN ORDER, following this rule:
   - Fill the grid from top to bottom and left to right.
   - One item per cell.
   - If there are fewer items than cells, leave the remaining cells empty.
3. Always keep each item entirely inside its assigned cell.
4. Never rearrange or sort the items by type or size: the extraction order determines the placement order.
5. Always preserve the layout, proportions, and alignment of the grid cells exactly as in the provided grid image.
6. Items must be centered within their filled cells, with a soft product-photography shadow.
7. Do not place any items outside the cells.
8. Do not merge items or combine them.
9. Empty cells must remain completely blank.

The order rule is strict:
- The first detected item goes into the first cell (top-left).
- The second item goes into the second cell (top-right).
- The third goes into the next cell down the left column.
Continue row by row until all items are placed or all cells are filled.`;

async function createGridTemplateDataUri(): Promise<string> {
  const width = GRID_TEMPLATE_WIDTH;
  const height = GRID_TEMPLATE_HEIGHT;
  const svgLines: string[] = [];
  for (let column = 1; column < GRID_TEMPLATE_COLUMNS; column++) {
    const x = (width / GRID_TEMPLATE_COLUMNS) * column;
    svgLines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${GRID_TEMPLATE_LINE_COLOR}" stroke-width="${GRID_TEMPLATE_LINE_THICKNESS}" />`
    );
  }
  for (let row = 1; row < GRID_TEMPLATE_ROWS; row++) {
    const y = (height / GRID_TEMPLATE_ROWS) * row;
    svgLines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${GRID_TEMPLATE_LINE_COLOR}" stroke-width="${GRID_TEMPLATE_LINE_THICKNESS}" />`
    );
  }
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${GRID_TEMPLATE_BACKGROUND}" />
    ${svgLines.join('\n')}
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

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

type FalImageSource = {
  source?: string | null;
  label?: string;
};

const sanitizeFileLabel = (value: string, fallback: string): string => {
  const base = (value ?? '').trim() || fallback;
  return base.replace(/[^\w.-]+/g, '_');
};

async function prepareFalImageInput(descriptor: FalImageSource, fallbackLabel: string): Promise<string> {
  if (!descriptor?.source) {
    throw new Error('Missing image source for fal grid.');
  }

  const { source } = descriptor;
  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  if (!source.startsWith('data:')) {
    return source;
  }

  const match = source.match(dataUriRegex);
  if (!match?.groups?.data) {
    throw new Error('Invalid data URI for fal grid input.');
  }

  const mime = normalizeFalMime(match.groups.mime);
  const buffer = Buffer.from(match.groups.data, 'base64');
  const safeLabel = sanitizeFileLabel(descriptor.label ?? fallbackLabel, fallbackLabel);
  const fileName = ensureFileName(safeLabel, mime);
  const blobWithName = Object.assign(new Blob([buffer], { type: mime }), { name: fileName });
  return fal.storage.upload(blobWithName as Blob & { name: string });
}

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
  gridPosition:
    typeof item.gridPosition === 'number' && Number.isFinite(item.gridPosition)
      ? Math.max(1, Math.min(GRID_TEMPLATE_COLUMNS * GRID_TEMPLATE_ROWS, Math.round(item.gridPosition)))
      : undefined,
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
  referenceImageUrl: look.referenceImageUrl ? sanitizeText(look.referenceImageUrl) : undefined,
  gridImageUrl: typeof look.gridImageUrl === 'string' ? look.gridImageUrl : undefined,
  gridCellUrls: Array.isArray(look.gridCellUrls)
    ? look.gridCellUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    : undefined,
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

async function generateNanoBananaImage(prompt: string, imageInputs: Array<string | undefined | null> = []): Promise<string> {
  const validInputs = imageInputs.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const preparedImages = await Promise.all(validInputs.map((source) => prepareImageInput(source)));
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: '9:16',
    output_format: 'jpg',
  };

  if (preparedImages.length) {
    input.image_input = preparedImages;
  }

  const output = await runReplicateModel(NANO_BANANA_MODEL, input);
  const imageUrl = extractImageUrl(output);
  if (!imageUrl) {
    throw new Error('nano-banana did not return an image URL.');
  }
  return imageUrl;
}

async function removeBackgroundFromBuffer(buffer: Buffer): Promise<{ buffer: Buffer; mime: string }> {
  try {
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const response = await runReplicateModel(BACKGROUND_REMOVER_MODEL, { image: blob });
    const cleanedUrl = extractImageUrl(response);
    if (!cleanedUrl) {
      throw new Error('background remover did not return an image URL.');
    }
    const cleanedResponse = await fetch(cleanedUrl);
    if (!cleanedResponse.ok) {
      throw new Error(`Failed to download cleaned image (${cleanedResponse.status})`);
    }
    const mime = normalizeFalMime(cleanedResponse.headers.get('content-type') ?? 'image/png');
    const cleanedBuffer = Buffer.from(await cleanedResponse.arrayBuffer());
    return { buffer: cleanedBuffer, mime };
  } catch (error) {
    console.error('[background-remover] Falling back to original cell image', error);
    return { buffer, mime: 'image/jpeg' };
  }
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

async function sliceGridCells(
  gridBuffer: Buffer,
  gender: 'male' | 'female',
  lookId: string
): Promise<string[]> {
  const columns = GRID_TEMPLATE_COLUMNS;
  const rows = GRID_TEMPLATE_ROWS;
  const cellWidth = GRID_TEMPLATE_WIDTH / columns;
  const cellHeight = GRID_TEMPLATE_HEIGHT / rows;
  const padding = Math.max(2, Math.ceil(GRID_TEMPLATE_LINE_THICKNESS * 1.5));
  const urls: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x0 = Math.max(0, Math.round(column * cellWidth + padding));
      const x1 = Math.min(GRID_TEMPLATE_WIDTH, Math.round((column + 1) * cellWidth - padding));
      const y0 = Math.max(0, Math.round(row * cellHeight + padding));
      const y1 = Math.min(GRID_TEMPLATE_HEIGHT, Math.round((row + 1) * cellHeight - padding));
      const width = Math.max(1, x1 - x0);
      const height = Math.max(1, y1 - y0);

      const baseCellBuffer = await sharp(gridBuffer)
        .extract({ left: x0, top: y0, width, height })
        .resize(640, 960, {
          fit: 'contain',
          background: { r: 240, g: 240, b: 240, alpha: 1 },
        })
        .jpeg({ quality: 94 })
        .toBuffer();
      const { buffer: cellBuffer, mime } = await removeBackgroundFromBuffer(baseCellBuffer);
      const label = `grid-cell-${row * columns + column + 1}`;
      const cellUrl = await persistExploreAssetBuffer(cellBuffer, gender, lookId, label, mime);
      urls.push(cellUrl);
    }
  }

  return urls;
}

async function generateReferenceGrid(referenceUrl: string, lookId: string, layoutGuide?: string): Promise<string> {
  const template = await getGridTemplateDataUri();
  const inputs: FalImageSource[] = [{ source: referenceUrl, label: `${lookId}-reference.jpg` }];
  if (template) {
    inputs.push({ source: template, label: 'grid-template.png' });
  }
  const prompt = layoutGuide
    ? `${FAL_SEGMENT_PROMPT}\n\nGrid placement order:\n${layoutGuide}\n\nAlways place each extracted item in the specified numbered cell.`
    : FAL_SEGMENT_PROMPT;
  return generateFalGridImage(prompt, inputs, lookId);
}

type GridAssetOptions = {
  reuseOnly?: boolean;
};

async function generateLookGridAssets(
  look: ExploreLook,
  options: GridAssetOptions = {}
): Promise<{ gridImageUrl: string; gridCellUrls: string[] } | null> {
  const { reuseOnly = false } = options;
  if (!look.imageUrl) {
    return null;
  }

  const processGridSource = async (sourceUrl: string) => {
    let baseBuffer: Buffer;
    if (sourceUrl.startsWith('data:')) {
      const match = sourceUrl.match(dataUriRegex);
      if (!match?.groups?.data) {
        throw new Error('Invalid grid data URI.');
      }
      baseBuffer = Buffer.from(match.groups.data, 'base64');
    } else {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to download grid image (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      baseBuffer = Buffer.from(arrayBuffer);
    }
    const normalizedBuffer = await sharp(baseBuffer)
      .resize(GRID_TEMPLATE_WIDTH, GRID_TEMPLATE_HEIGHT, {
        fit: 'contain',
        background: { r: 179, g: 179, b: 179 },
      })
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
  };

  if (look.gridImageUrl) {
    try {
      return await processGridSource(look.gridImageUrl);
    } catch (error) {
      console.error(`[server] Failed to reuse existing grid for ${look.id}`, error);
    }
  }

  const template = await getGridTemplateDataUri();
  const baseInputs: FalImageSource[] = [
    { source: look.referenceImageUrl ?? look.imageUrl, label: `${look.id}.jpg` },
  ];
  if (template) {
    baseInputs.push({ source: template, label: 'grid-template.png' });
  }

  try {
    const gridUrl = await generateFalGridImage(FAL_SEGMENT_PROMPT, baseInputs, look.id);
    return await processGridSource(gridUrl);
  } catch (error) {
    console.error(`[server] Failed to generate grid assets for ${look.id}`, error);
    throw error;
  }
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
  gridLayoutGuide?: string;
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
      const gridPositionSource =
        candidate.grid_position ??
        candidate.gridPosition ??
        candidate.grid_cell ??
        candidate.gridCell ??
        candidate.cell ??
        candidate.position;
      if (typeof labelSource !== 'string' || typeof searchSource !== 'string') {
        return null;
      }
      const genderSource = candidate.gender === 'male' || candidate.gender === 'female'
        ? candidate.gender
        : defaultGender;
      let gridPosition: number | undefined;
      if (typeof gridPositionSource === 'number') {
        gridPosition = gridPositionSource;
      } else if (typeof gridPositionSource === 'string') {
        const parsed = Number(gridPositionSource.trim());
        if (Number.isFinite(parsed)) {
          gridPosition = parsed;
        }
      }
      return {
        id: sanitizeText(String(idSource)),
        label: sanitizeText(labelSource),
        searchQuery: sanitizeText(searchSource),
        category: sanitizeText(String(categorySource)),
        gender: genderSource,
        gridPosition,
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
  const normalizedImages = [userPhoto, referenceImage, ...itemImages].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const imageInputs = Array.from(new Set(normalizedImages));
  console.log('[remixLookWithPrompt] Sending images:', imageInputs.length, imageInputs);
  const cleanedPrompt = stripSceneClauses(prompt.trim());
  const finalPrompt = `${cleanedPrompt} Apply this outfit to the provided person while keeping their exact face, pose, and body proportions unchanged. Create an appropriate background that matches the vibe of the clothes the person is wearing. ${FRAMING_REQUIREMENTS}`;
  let styledPhotoUrl: string | null = null;
  if (FAL_GRID_ENABLED) {
    const descriptors: FalImageSource[] = imageInputs.map((source, index) => ({
      source,
      label: index === 0 ? 'user-photo.jpg' : `remix-${index}.jpg`,
    }));
    try {
      styledPhotoUrl = await Promise.race([
        generateFalGridImage(finalPrompt, descriptors, 'remix'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('fal remix timeout')), FAL_REMIX_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      console.warn('[remixLookWithPrompt] fal nano-banana-pro failed, falling back to Replicate.', error);
    }
  }

  if (!styledPhotoUrl) {
    styledPhotoUrl = await generateNanoBananaImage(finalPrompt, imageInputs);
  }
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
      referenceImageUrl: undefined,
    });

    const gridAssets = await generateLookGridAssets(look);
    if (gridAssets) {
      look.gridImageUrl = gridAssets.gridImageUrl;
      look.gridCellUrls = gridAssets.gridCellUrls;
      look.items = mapItemsToGridCells(look.items, gridAssets.gridCellUrls);
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
  gridUrl: string;
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
    const placeholderId = `reference_${Date.now()}_${i}`;
    const placeholder: ExploreLook = {
      id: placeholderId,
      gender,
      title: `Reference look ${i + 1}`,
      description: 'Uploaded inspiration look',
      prompt: '',
      imageUrl: url,
      gridImageUrl: undefined,
      vibe: styleTag ? `reference ${styleTag}` : 'reference inspiration',
      styleTag,
      referenceImageUrl: url,
    };
    const promptSpec = await generateSingleLookSpec(placeholder, styleTag);
    const gridUrl = await generateReferenceGrid(url, placeholderId, promptSpec.gridLayoutGuide);
    stored.push({
      url,
      prompt: promptSpec,
      gridUrl,
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
      gridUrl: dataUrl,
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
    const gridReference = storedReferences[i]?.gridUrl;
    const genderLabel = gender === 'female' ? 'woman' : 'man';
    const finalPrompt = `Full body fashion photo of a ${genderLabel}, vertical 9:16, complete outfit and shoes visible, realistic studio lighting, background should match the vibe of the clothes. Full body portrait, vertical 9:16 composition (tall), camera at waist height, editorial lighting, footwear fully visible, confident pose captured mid-motion. Use vivid, full-color photography with natural lighting; never black-and-white or monochrome.`;
    const imageInputs = gridReference ? [gridReference] : [];
    const styledPhotoUrl = await generateNanoBananaImage(finalPrompt, imageInputs);
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
      referenceImageUrl: storedReferences[i]?.url,
      gridImageUrl: storedReferences[i]?.gridUrl,
    });

    const shouldReuseOnly = Boolean(storedReferences[i]?.gridUrl);
    const gridAssets = await generateLookGridAssets(look, { reuseOnly: shouldReuseOnly });
    if (gridAssets) {
      look.gridImageUrl = gridAssets.gridImageUrl;
      look.gridCellUrls = gridAssets.gridCellUrls;
      look.items = mapItemsToGridCells(look.items, gridAssets.gridCellUrls);
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

  const itemsWithCells = mapItemsToGridCells(look.items, assets.gridCellUrls);

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
  grid_layout?: Array<{
    cell?: number;
    label?: string;
    search_query?: string;
    category?: string;
    summary?: string;
  }>;
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

const normalizeGridLayout = (
  layout: unknown,
  gender: 'male' | 'female'
): { items: ShopItem[]; guide: string } | null => {
  if (!Array.isArray(layout)) {
    return null;
  }
  const maxCells = GRID_TEMPLATE_COLUMNS * GRID_TEMPLATE_ROWS;
  const normalized: ShopItem[] = [];
  const guideParts: string[] = [];

  layout.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const candidate = entry as Record<string, unknown>;
    const labelSource = candidate.label ?? candidate.name ?? candidate.summary ?? candidate.description;
    const searchSource = candidate.search_query ?? candidate.searchQuery ?? candidate.label ?? candidate.name;
    if (typeof labelSource !== 'string' || typeof searchSource !== 'string') {
      return;
    }
    const cellRaw = candidate.cell ?? candidate.grid_cell ?? candidate.position ?? index + 1;
    let cellIndex: number | undefined;
    if (typeof cellRaw === 'number') {
      cellIndex = cellRaw;
    } else if (typeof cellRaw === 'string') {
      const parsed = Number(cellRaw.trim());
      if (Number.isFinite(parsed)) {
        cellIndex = parsed;
      }
    }
    const safeCell = Math.max(1, Math.min(maxCells, Math.round(cellIndex ?? index + 1)));
    const categorySource = candidate.category ?? candidate.type ?? `cell_${safeCell}_${index}`;
    const idSource = candidate.id ?? categorySource ?? `cell_${safeCell}_${index}`;
    normalized.push({
      id: sanitizeText(String(idSource)),
      label: sanitizeText(labelSource),
      searchQuery: sanitizeText(searchSource),
      category: sanitizeText(String(categorySource)),
      gender,
      gridPosition: safeCell,
    });
    const summarySource = candidate.summary ?? labelSource;
    guideParts.push(`${safeCell}: ${sanitizeText(String(summarySource))}`);
  });

  if (!normalized.length) {
    return null;
  }

  const seen = new Set<string>();
  const deduped = normalized.filter((item) => {
    if (!item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return {
    items: deduped,
    guide: guideParts.join('\n'),
  };
};

const mapItemsToGridCells = (items: ShopItem[] | undefined, gridCellUrls: string[]): ShopItem[] | undefined => {
  if (!items?.length || !gridCellUrls.length) {
    return items;
  }
  const total = gridCellUrls.length;
  return items.map((item, index) => {
    const targetIndex =
      typeof item.gridPosition === 'number' && Number.isFinite(item.gridPosition)
        ? Math.max(0, Math.min(total - 1, Math.round(item.gridPosition) - 1))
        : index;
    const gridCellUrl = gridCellUrls[targetIndex] ?? item.gridCellUrl;
    return gridCellUrl && gridCellUrl !== item.gridCellUrl ? { ...item, gridCellUrl } : item;
  });
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
  const gridLayout = normalizeGridLayout(spec.grid_layout, look.gender);
  const sections = [
    describeSectionPieces('Top', spec.top, look.gender),
    describeSectionPieces('Bottom', spec.bottom, look.gender),
    describeSectionPieces('Accessories', spec.accessories, look.gender),
    describeSectionPieces('Footwear', spec.footwear, look.gender),
  ];
  const sentences = sections.flatMap((section) => section.sentences);
  const fallbackItems = sections.flatMap((section) => section.items);
  const items = gridLayout?.items ?? fallbackItems;

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
    gridLayoutGuide: gridLayout?.guide,
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
  ],
  "grid_layout": [
    {
      "cell": 1,
      "label": "Red feathered headpiece",
      "category": "Headwear",
      "search_query": "woman red feather fascinator avant garde",
      "summary": "Place the red feathered headpiece in cell 1."
    },
    {
      "cell": 2,
      "label": "Black graphic tank",
      "category": "Top",
      "search_query": "women black graphic tank top cyber y2k",
      "summary": "Cell 2: fitted black tank with neon tech graphic."
    }
  ]
}

Use the provided photo (if available) plus this metadata:
Title: ${look.title}
Description: ${look.description}
Vibe: ${look.vibe}
Style tag: ${styleTag ?? 'n/a'}

Be as specific as possible (colors, textiles, cuts, layering, accessories, makeup, hair). If an element is not present, set it to null.

For "grid_layout":
- Output an array describing up to ${GRID_TEMPLATE_COLUMNS * GRID_TEMPLATE_ROWS} cells (2 columns by 4 rows).
- Follow the top-to-bottom, left-to-right order (cell 1 = top-left, cell 2 = top-right, cell 3 = next row left, etc.).
- Each entry must include: cell (1-8), label, category, search_query (6-10 English keywords), and a short summary explaining what to place there.
- Only include actual garments or accessories shown in the reference. If there are fewer than ${GRID_TEMPLATE_COLUMNS * GRID_TEMPLATE_ROWS} items, omit the remaining cells.
- These summaries will be passed to an image segmentation model, so be explicit about colors, garment type, and distinctive traits.`;

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
function normalizeFalMime(mime?: string): string {
  if (!mime) return 'image/jpeg';
  const lower = mime.toLowerCase();
  if (lower.includes('png')) return 'image/png';
  if (lower.includes('webp')) return 'image/webp';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'image/jpeg';
  return 'image/jpeg';
}

function inferExtensionFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function ensureFileName(label: string, mime: string): string {
  const ext = inferExtensionFromMime(mime);
  const normalized = label.toLowerCase();
  if (normalized.endsWith(`.${ext}`)) {
    return label;
  }
  return `${label.replace(/\.[a-z0-9]+$/i, '')}.${ext}`;
}






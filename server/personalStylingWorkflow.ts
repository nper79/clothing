import Replicate from 'replicate';
import fetch from 'node-fetch';
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
const IMAGE_CAPTION_MODEL = 'nateraw/vit-gpt2-image-captioning';
const VISION_CHAT_MODEL = 'yorickvp/llava-1.5-7b';
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

async function generateNanoBananaImage(prompt: string, imageInputs: string[] = []): Promise<string> {
  const filteredImages = imageInputs.filter((value): value is string => Boolean(value));
  const preparedImages = await Promise.all(filteredImages.map((value) => normalizeImageInput(value)));
  const output = await runReplicateModel(NANO_BANANA_MODEL, {
    prompt,
    output_format: 'jpg',
    aspect_ratio: preparedImages.length > 0 ? 'match_input_image' : '9:16',
    image_input: preparedImages,
  });

  const imageUrl = extractImageUrl(output);
  if (!imageUrl) {
    throw new Error('nano-banana did not return an image URL.');
  }
  return imageUrl;
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

Use this exact order:

${slotBlock}

Strict rules:
– The layout must be exactly 2×4.
– All items must match the descriptions precisely.
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
      const cellBuffer = await sharp(buffer)
        .extract({ left, top, width, height })
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

  try {
    const template = await getGridTemplateDataUri();
    const inputs = [look.imageUrl];
    if (template) {
      inputs.push(template);
    }
    const gridPrompt = buildGridPrompt(look);
    const gridUrl = await generateNanoBananaImage(gridPrompt, inputs);
    const response = await fetch(gridUrl);
    if (!response.ok) {
      throw new Error(`Failed to download grid image (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const baseBuffer = Buffer.from(arrayBuffer);
    const normalizedBuffer = await sharp(baseBuffer)
      .resize(GRID_TEMPLATE_WIDTH, GRID_TEMPLATE_HEIGHT, { fit: 'cover' })
      .jpeg({ quality: 94 })
      .toBuffer();
    const gridImageUrl = await persistExploreAssetBuffer(normalizedBuffer, look.gender, look.id, 'grid', 'image/jpeg');
    const gridCellUrls = await sliceGridCells(normalizedBuffer, look.gender, look.id);
    return { gridImageUrl, gridCellUrls };
  } catch (error) {
    console.error(`[server] Failed to generate grid assets for ${look.id}`, error);
    return null;
  }
}

async function generateRawCaption(imageData: string): Promise<string> {
  try {
    const normalized = await normalizeImageInput(imageData);
    const output = await runReplicateModel(IMAGE_CAPTION_MODEL, {
      image: normalized,
    });
    const text = extractPromptText(output);
    return text || 'fashion look with layered outfit';
  } catch (error) {
    console.error('[server] Failed to caption reference image', error);
    return 'fashion look with layered outfit';
  }
}

async function generateVisionDescription(imageData: string): Promise<string> {
  try {
    const normalized = await normalizeImageInput(imageData);
    const output = await runReplicateModel(VISION_CHAT_MODEL, {
      image: normalized,
      prompt:
        'Describe every clothing item, fabric, color, fit, accessories, and overall vibe in this outfit photo. Mention footwear and environment cues. Keep under 120 words.',
    });
    const text = extractPromptText(output);
    return text || 'fashion outfit with layered streetwear pieces';
  } catch (error) {
    console.error('[server] Failed to run vision description model', error);
    return 'fashion outfit with layered streetwear pieces';
  }
}

async function describeReferenceLook(baseCaption: string): Promise<string> {
  const prompt = `You are a senior fashion editor.

Here is a short machine caption of an outfit photo:
"${baseCaption}"

Expand this into a vivid fashion write-up covering:
- Garment stack from outer layers to shoes (colors, silhouettes, fabrics, fit).
- Styling details (scarves, belts, accessories, hair/makeup, bags).
- Mood / vibe / setting cues (city street, café, office, etc.).
- Who would wear it (demographic / scenario).

Make it precise, full-color, under 180 words.`;

  try {
  const output = await runReplicateModel(GPT5_MODEL, {
    prompt,
    max_tokens: 512,
    temperature: 0.35,
  });
    const text = extractPromptText(output);
    return text || fallbackCaption;
  } catch (error) {
    console.error('[server] Failed to describe reference look with GPT-5', error);
    return fallbackCaption;
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

export async function remixLookWithPrompt(userPhoto: string, prompt: string, _referenceImage?: string) {
  const imageInputs = [userPhoto];
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
  description: string;
};

async function storeReferenceImages(
  gender: 'male' | 'female',
  images: string[]
): Promise<StoredReference[]> {
  const stored: StoredReference[] = [];
  for (let i = 0; i < images.length; i++) {
    const label = `ref_${i}`;
    const url = await persistReferenceImage(images[i], gender, label);
    const [visionDescription, backupCaption] = await Promise.all([
      generateVisionDescription(images[i]),
      generateRawCaption(images[i]),
    ]);
    const combinedCaption = `${visionDescription}. Backup: ${backupCaption}`;
    const detailedDescription = await describeReferenceLook(combinedCaption);
    stored.push({
      url,
      description: detailedDescription,
    });
  }
  return stored;
}

async function generateReferenceInspiredPrompts(
  gender: 'male' | 'female',
  referenceDescriptions: string[],
  count: number,
  styleTag?: string
): Promise<ExplorePrompt[]> {
  const descriptionsBlock = referenceDescriptions
    .map((description, index) => `Ref ${index + 1}: ${description}`)
    .join('\n\n');

  const sceneIdeas = [
    'corner cafe patio with bistro tables',
    'corporate lobby with marble floors',
    'tree-lined European street with storefronts',
    'city rooftop at sunset',
    'artist loft with canvases and ladders',
    'weekend farmers market stall',
    'vintage convertible car on a boulevard',
    'foggy riverside boardwalk',
    'library reading room with warm lamps',
    'fashion show backstage area',
  ];

  const vibeList = gender === 'female'
    ? ['weekend chic', 'minimal luxe', 'sporty', 'boho', 'evening glamour', 'streetwear', 'resort']
    : ['smart casual', 'minimal street', 'athleisure', 'tailored', 'utility', 'retro sport', 'creative studio'];

  const styleDirective = getStyleDirective(styleTag);
  const trendNotes = pickRandomItems(GLOBAL_TRENDS, 2).join(' ');

  const prompt = `You are a senior fashion editor creating new outfits for an Instagram explore feed targeting ${gender} audiences.
Study these reference summaries to understand the silhouettes, palettes, fabrics, and vibes the user loves (pay attention to trouser width, scarf volume, layering proportions, etc.):
${descriptionsBlock}

Design ${count} distinct new looks that feel like they belong to the same mood board while still offering variety. Stay wearable and modern.

Rules:
1. Pull forward key ideas from the inspiration breakdowns (palettes, textures, layering, silhouette proportions like wide-leg trousers, oversized scarves, belted coats) without copying literally.
2. Half of the looks should feel realistic for daily wear, half can push into bolder statement territory. Keep them cohesive with the references.
3. "description" must stay under 14 words, highlight the hero pieces, and read naturally.
4. "prompt" must describe clothing layers, fabrics, footwear, hair/makeup, and a unique environment. Mention that it is a full-body 9:16 shot with visible footwear. Explicitly state that the render is full-color, rich, and never black-and-white.
5. Every garment mention (in "prompt" and in each item entry) must explicitly include a color descriptor so nothing is left ambiguous.
6. Assign a different environment to each look by choosing from or inspired by this list (avoid repeats): ${sceneIdeas.join(', ')}.
${styleDirective ? `7. Apply this aesthetic focus: ${styleDirective.instructions}` : '7. Balance seasonal practicality with the references (outerwear if the inspiration shows cool weather, etc.).'}

Trend cues to weave in: ${trendNotes}

Return ONLY a valid JSON array (no commentary). Response MUST begin with "[" and end with "]". Each entry must look like:
{
  "title": "2-4 word name",
  "description": "max 14 words",
  "vibe": "choose from: ${vibeList.join(', ')}",
  "image_prompt": "detailed image generation prompt",
  "items": [
    {
      "id": "jacket",
      "label": "Olive MA-1 bomber jacket",
      "search_query": "women's olive MA-1 bomber jacket matte nylon ribbed cuffs",
      "category": "jacket",
      "gender": "${gender}"
    }
  ]
}
Make items 4-6 entries, covering tops, bottoms, footwear, outerwear, accessories, each with descriptive search queries that include explicit colors.
Do not mention the image URLs in the output.`;

  const output = await runReplicateModel(GPT5_MODEL, {
    prompt,
    max_tokens: 1024,
    temperature: 0.7,
  });

  const raw = extractPromptText(output);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('[server] GPT-5 reference prompt response was not JSON. Falling back to existing library.');
    return getFallbackExplorePrompts(gender, count, styleTag);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty array');
    }
    return parsed.map((spec) => normalizePromptSpec(spec, gender, styleTag));
  } catch (error) {
    console.error('[server] Failed to parse GPT-5 reference prompts, using fallback library.', error);
    return getFallbackExplorePrompts(gender, count, styleTag);
  }
}

export async function generateExploreLooksFromReferences(options: ReferenceInspiredOptions): Promise<ExploreLook[]> {
  const { gender, referenceImages, count, styleTag } = options;
  if (!referenceImages?.length) {
    throw new Error('At least one reference image is required.');
  }
  const limitedImages = referenceImages.slice(0, 8);
  let storedReferences: StoredReference[];
  try {
    storedReferences = await storeReferenceImages(gender, limitedImages);
  } catch (error) {
    console.error('[server] Failed to persist or describe reference images, using inline data URIs.', error);
    storedReferences = limitedImages.map((dataUrl) => ({
      url: dataUrl,
      description: 'Reference fashion look (fallback)',
    }));
  }

  const referenceDescriptions = storedReferences.map((item) => item.description);

  const dataset = await readExploreDataset();
  const targetCount = limitedImages.length;
  const prompts = await generateReferenceInspiredPrompts(
    gender,
    referenceDescriptions,
    targetCount,
    styleTag
  );
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

async function generateSingleLookSpec(
  look: ExploreLook,
  styleTag?: string
): Promise<ExplorePrompt> {
  const prompt = `You are a fashion stylist turning a single look summary into structured data.
Return ONLY a JSON object with this shape:
{
  "title": "...",
  "description": "...",
  "vibe": "...",
  "image_prompt": "...",
  "items": [
    {
      "id": "top",
      "label": "Camel cashmere turtleneck",
      "search_query": "women's camel cashmere turtleneck relaxed fit",
      "category": "top",
      "gender": "${look.gender}"
    }
  ]
}

Guidelines:
- Use the information below (title, description, existing prompt) to infer silhouette, colors, fabrics, footwear, and environment.
- "image_prompt" should be ready for an image model (full body, color, setting).
- Every clothing mention in "image_prompt" and in each item must explicitly include a color descriptor (e.g., "sage wool trench" instead of just "wool trench").
- Create 4-6 items covering tops, bottoms, footwear, outer layers, statement accessories. Each search_query should be 6-10 words with gender, fabric, color, vibe.
- Keep the JSON minified (no comments).

Look data:
Title: ${look.title}
Description: ${look.description}
Vibe: ${look.vibe}
Prompt: ${look.imagePrompt || look.prompt}
${styleTag ? `Style tag focus: ${styleTag}` : ''}`;

  const output = await runReplicateModel(GPT5_MODEL, {
    prompt,
    max_tokens: 900,
    temperature: 0.5,
  });

  const raw = extractPromptText(output);
  const jsonMatch = raw.match(/\{[\s\S]+\}/);
  if (!jsonMatch) {
    throw new Error('GPT-5 single look response was not JSON.');
  }
  const parsed = JSON.parse(jsonMatch[0]);
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

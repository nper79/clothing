import Replicate from 'replicate';
import type { PersonalLook, UserPreferences } from '../types/personalStyling';
import type { ExploreLook } from '../types/explore';
import { ComprehensivePromptLibrary, type ComprehensiveLook } from '../services/comprehensivePromptLibrary';
import { ExploreLookLibrary } from '../services/exploreLookLibrary';
import { readExploreDataset, writeExploreDataset } from './exploreDatasetStore';

const CLAUDE_MODEL = 'anthropic/claude-4.5-sonnet';
const REVE_MODEL = 'reve/edit-fast:f0253eb7b26cc2416ad98c20492fbe4b842e09d808318fdf9e7caeffa9ae78f5';
const NANO_BANANA_MODEL = 'google/nano-banana';
const DEFAULT_LOOK_LIMIT = 1;

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

const FRAMING_REQUIREMENTS =
  'Full body portrait, vertical 9:16 composition (tall), camera at waist height, editorial lighting, footwear fully visible, confident pose captured mid-motion.';

const replicateToken = process.env.VITE_REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN;

if (!replicateToken) {
  throw new Error('Missing REPLICATE_API_TOKEN environment variable.');
}

const replicate = new Replicate({
  auth: replicateToken,
  fileEncodingStrategy: 'upload',
  useFileOutput: false,
});

const dataUriRegex = /^data:(?<mime>.+);base64,(?<data>.+)$/;

const sanitizeText = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s([?!.,;:])/g, '$1')
    .replace(/-\s+/g, '-')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
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
  const output = await replicate.run(NANO_BANANA_MODEL, {
    input: {
      prompt,
      output_format: 'jpg',
      aspect_ratio: preparedImages.length > 0 ? 'match_input_image' : '9:16',
      image_input: preparedImages,
    },
  });

  const imageUrl = extractImageUrl(output);
  if (!imageUrl) {
    throw new Error('nano-banana did not return an image URL.');
  }
  return imageUrl;
}

async function generateEditPrompt(basePrompt: string, preferences?: UserPreferences): Promise<string> {
  const claudePrompt = `You are a professional fashion stylist and AI image editing expert.

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

  const output = await replicate.run(CLAUDE_MODEL, {
    input: {
      prompt: claudePrompt,
      max_tokens: 1024,
      temperature: 0.7,
    },
  });

  const extracted = extractPromptText(output).trim();
  if (extracted) {
    return extracted;
  }

  return `Make the person wear ${basePrompt}. FULL BODY IMAGE from head to toe, INCLUDING FOOTWEAR/SHOES clearly visible. Maintain natural features. Single person only, solo portrait. Complete outfit must be shown including shoes.`;
}

async function editPhotoWithReve(userPhoto: string, prompt: string): Promise<string> {
  const imageInput = prepareImageInput(userPhoto);
  const output = await replicate.run(REVE_MODEL, {
    input: {
      image: imageInput,
      prompt,
    },
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

type ExplorePrompt = { title: string; description: string; vibe: string; prompt: string };

function getFallbackExplorePrompts(gender: 'male' | 'female', count: number): ExplorePrompt[] {
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
    });
  }

  return prompts;
}

export async function generateExplorePrompts(
  gender: 'male' | 'female',
  count: number
): Promise<ExplorePrompt[]> {
  const vibeList = gender === 'female'
    ? ['weekend chic', 'minimal luxe', 'sporty', 'boho', 'evening glamour', 'streetwear', 'resort']
    : ['smart casual', 'minimal street', 'athleisure', 'tailored', 'utility', 'retro sport', 'creative studio'];

  const sceneSample = ALL_SCENE_REFERENCES.slice(0, 8).join('; ');

  const claudePrompt = `You are styling an Instagram Explore feed that mixes wearable everyday outfits with occasional statement looks for a ${gender} audience.
Design ${count} unique looks spanning relaxed daywear, polished smart casual, sporty sets, night-out energy, and only a few futuristic moments.

Rules:
1. At least half of the looks should feel approachable / real-world (linen tailoring, denim, athleisure, elevated basics). The rest can introduce bolder textures or silhouettes, but keep everything tasteful.
2. "description" stays under 14 words and highlights the standout pieces.
3. "prompt" must describe clothing layers, fabrics, footwear, hair/makeup, pose energy, and a unique environment (use scenes like: ${sceneSample}). Explicitly mention that the shot is full-body, vertical 9:16, shoes visible.
4. Avoid repeating settings or garments.

Return ONLY a valid JSON array where each entry is:
{
  "title": "2-4 word catchy name",
  "description": "max 14 words describing outfit pieces",
  "vibe": "one of these: ${vibeList.join(', ')}",
  "prompt": "detailed description suitable for an AI image edit model"
}
Use precise fashion language, highlight footwear, and ensure full-body framing.`;

  const output = await replicate.run(CLAUDE_MODEL, {
    input: {
      prompt: claudePrompt,
      max_tokens: 1024,
      temperature: 0.7,
    },
  });

  const raw = extractPromptText(output);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('[server] Claude explore prompt response was not JSON. Falling back to local library.');
    return getFallbackExplorePrompts(gender, count);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ExplorePrompt[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty array');
    }
    return parsed.map((item) => ({
      title: sanitizeText(item.title ?? ''),
      description: sanitizeText(item.description ?? ''),
      vibe: sanitizeText(item.vibe ?? ''),
      prompt: sanitizeText(item.prompt ?? ''),
    }));
  } catch (error) {
    console.error('[server] Failed to parse Claude explore prompts, using fallback library.', error);
    return getFallbackExplorePrompts(gender, count);
  }
}

export async function remixLookWithPrompt(userPhoto: string, prompt: string, referenceImage?: string) {
  const imageInputs = [userPhoto, referenceImage].filter((value): value is string => Boolean(value));
  const finalPrompt = `${prompt.trim()} Maintain the same physical traits as the reference person provided (skin tone, hair color, face shape). Use the additional reference image to capture outfit styling cues only. ${FRAMING_REQUIREMENTS}`;
  const styledPhotoUrl = await generateNanoBananaImage(finalPrompt, imageInputs);
  return {
    styledPhotoUrl
  };
}

export async function generateExploreLooks(gender: 'male' | 'female', count: number): Promise<ExploreLook[]> {
  const dataset = await readExploreDataset();
  const prompts = await generateExplorePrompts(gender, count);
  const generated: ExploreLook[] = [];
  const scenes = SCENE_PRESETS[gender];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const scene = pickRandom(scenes);
    const finalPrompt = `${prompt.prompt.trim()} Scene: ${scene}. ${FRAMING_REQUIREMENTS}`;
    const styledPhotoUrl = await generateNanoBananaImage(finalPrompt);

    generated.push({
      id: `explore_${gender}_${Date.now()}_${i}`,
      gender,
      title: prompt.title,
      description: prompt.description,
      vibe: prompt.vibe,
      prompt: finalPrompt,
      imageUrl: styledPhotoUrl
    });
  }

  const merged = [...generated, ...dataset[gender]].slice(0, 50);
  dataset[gender] = merged;
  await writeExploreDataset(dataset);
  return merged;
}

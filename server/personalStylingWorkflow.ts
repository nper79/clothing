import Replicate from 'replicate';
import type { PersonalLook, UserPreferences } from '../types/personalStyling';
import { ComprehensivePromptLibrary, type ComprehensiveLook } from '../services/comprehensivePromptLibrary';

const CLAUDE_MODEL = 'anthropic/claude-4.5-sonnet';
const REVE_MODEL = 'reve/edit-fast:f0253eb7b26cc2416ad98c20492fbe4b842e09d808318fdf9e7caeffa9ae78f5';
const DEFAULT_LOOK_LIMIT = 1;

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
    return raw;
  }

  if (Array.isArray(raw)) {
    return raw.join(' ');
  }

  if (typeof raw === 'object') {
    const candidate = raw as Record<string, unknown>;
    if (typeof candidate.text === 'string') {
      return candidate.text;
    }
    if (typeof candidate.response === 'string') {
      return candidate.response;
    }
    if (typeof candidate.content === 'string') {
      return candidate.content;
    }
  }

  return '';
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

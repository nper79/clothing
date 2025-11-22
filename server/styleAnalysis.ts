import Replicate from 'replicate';

const replicateToken = process.env.VITE_REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN;

if (!replicateToken) {
  throw new Error('Missing REPLICATE_API_TOKEN environment variable.');
}

const replicate = new Replicate({
  auth: replicateToken,
});

export interface StyleAnalysis {
  matchesProfile: boolean;
  score: number;
  reasoning: string;
  recommendations: string[];
  styleAlignment: {
    perception: string[];
    complexity: string;
    occasions: string[];
    colors: string[];
  };
}

const DEFAULT_ANALYSIS: StyleAnalysis = {
  matchesProfile: true,
  score: 75,
  reasoning:
    'This outfit aligns well with your style preferences and helps you move toward your desired aesthetic.',
  recommendations: [
    'Consider adding accessories that reflect your personal style.',
    'Make sure the colors match your skin tone and preferences.',
  ],
  styleAlignment: {
    perception: ['Confident', 'Modern'],
    complexity: 'Balanced',
    occasions: ['Casual', 'Weekend'],
    colors: ['Versatile neutral base'],
  },
};

const buildProfileSection = (profile: Record<string, any> | null | undefined) => ({
  perceptionStyle: profile?.perceptionStyle?.join(', ') || 'Not specified',
  wearPlaces: profile?.wearPlaces?.join(', ') || 'Not specified',
  currentStyle: profile?.currentStyle?.join(', ') || 'Not specified',
  desiredStyle: profile?.desiredStyle?.join(', ') || 'Not specified',
  outfitGoals: profile?.outfitGoals?.join(', ') || 'Not specified',
  colorPreferences: profile?.colorPreferences?.join(', ') || 'Not specified',
  dislikedColors: profile?.dislikedColors || 'None',
  outfitComplexity: profile?.outfitComplexity || 'Not specified',
  neverWearItems: profile?.neverWearItems?.join(', ') || 'None',
});

export async function analyzeOutfitForUser(
  profile: Record<string, any> | null,
  outfitDescription: string,
  lookName?: string
): Promise<StyleAnalysis> {
  if (!profile) {
    return DEFAULT_ANALYSIS;
  }

  const profileSection = buildProfileSection(profile);
  const prompt = `
You are a fashion style expert. Analyze this outfit based on the user's style profile.

USER STYLE PROFILE:
- Wants to be perceived as: ${profileSection.perceptionStyle}
- Wear occasions: ${profileSection.wearPlaces}
- Current style: ${profileSection.currentStyle}
- Desired style: ${profileSection.desiredStyle}
- Outfit goals: ${profileSection.outfitGoals}
- Color preferences: ${profileSection.colorPreferences}
- Disliked colors: ${profileSection.dislikedColors}
- Outfit complexity preference: ${profileSection.outfitComplexity}
- Never wears: ${profileSection.neverWearItems}

OUTFIT TO ANALYZE:
${outfitDescription}
${lookName ? `Look name: ${lookName}` : ''}

Provide a JSON response with this structure:
{
  "matchesProfile": boolean,
  "score": number (0-100),
  "reasoning": "Brief explanation of why this matches or doesn't match their profile",
  "recommendations": ["2-3 specific recommendations"],
  "styleAlignment": {
    "perception": ["which of their desired perceptions this matches"],
    "complexity": "simple/balanced/expressive",
    "occasions": ["suitable occasions"],
    "colors": ["how it aligns with their color preferences"]
  }
}

Focus on:
1. Does this outfit help them achieve their style goals?
2. Does it match their desired perception?
3. Are the colors appropriate for their preferences?
4. Is the complexity level what they prefer?
5. Does it fit their preferred occasions?
`;

  try {
    const output = await replicate.run('meta/meta-llama-3-70b-instruct', {
      input: {
        prompt,
        max_new_tokens: 500,
        temperature: 0.7,
      },
    });

    const outputString = Array.isArray(output) ? output.join('') : String(output);
    const jsonMatch = outputString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as StyleAnalysis;
    }
  } catch (error) {
    console.error('[style-analysis] Failed to analyze outfit', error);
  }

  return DEFAULT_ANALYSIS;
}

export async function generateStyleInsights(profile: Record<string, any>): Promise<string> {
  const prompt = `
Based on this style profile, provide a concise style analysis (2-3 sentences) that captures their aesthetic and transformation goals:

Perception Style: ${profile?.perceptionStyle?.join(', ') || 'Not specified'}
Current Style: ${profile?.currentStyle?.join(', ') || 'Not specified'}
Desired Style: ${profile?.desiredStyle?.join(', ') || 'Not specified'}
Goals: ${profile?.outfitGoals?.join(', ') || 'Not specified'}

The analysis should be encouraging and highlight their style evolution.
`;

  try {
    const output = await replicate.run('meta/meta-llama-3-70b-instruct', {
      input: {
        prompt,
        max_new_tokens: 200,
        temperature: 0.7,
      },
    });

    const outputString = Array.isArray(output) ? output.join('') : String(output);
    return outputString.trim();
  } catch (error) {
    console.error('[style-analysis] Failed to generate insights', error);
    return 'Your style journey is about expressing your unique personality through fashion.';
  }
}

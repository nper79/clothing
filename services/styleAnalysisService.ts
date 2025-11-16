import Replicate from 'replicate';

// Initialize Replicate with your API token
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
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

export class StyleAnalysisService {
  private static instance: StyleAnalysisService;
  private userStyleProfile: any = null;

  static getInstance(): StyleAnalysisService {
    if (!StyleAnalysisService.instance) {
      StyleAnalysisService.instance = new StyleAnalysisService();
    }
    return StyleAnalysisService.instance;
  }

  setUserProfile(profile: any) {
    this.userStyleProfile = profile;
  }

  async analyzeOutfitForUser(outfitDescription: string, lookName?: string): Promise<StyleAnalysis> {
    if (!this.userStyleProfile) {
      return this.getDefaultAnalysis();
    }

    const prompt = `
You are a fashion style expert. Analyze this outfit based on the user's style profile.

USER STYLE PROFILE:
- Wants to be perceived as: ${this.userStyleProfile.perceptionStyle?.join(', ') || 'Not specified'}
- Wear occasions: ${this.userStyleProfile.wearPlaces?.join(', ') || 'Not specified'}
- Current style: ${this.userStyleProfile.currentStyle?.join(', ') || 'Not specified'}
- Desired style: ${this.userStyleProfile.desiredStyle?.join(', ') || 'Not specified'}
- Outfit goals: ${this.userStyleProfile.outfitGoals?.join(', ') || 'Not specified'}
- Color preferences: ${this.userStyleProfile.colorPreferences?.join(', ') || 'Not specified'}
- Disliked colors: ${this.userStyleProfile.dislikedColors || 'None'}
- Outfit complexity preference: ${this.userStyleProfile.outfitComplexity || 'Not specified'}
- Never wears: ${this.userStyleProfile.neverWearItems?.join(', ') || 'None'}

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
      const output = await replicate.run(
        "meta/meta-llama-3-70b-instruct",
        {
          input: {
            prompt: prompt,
            max_new_tokens: 500,
            temperature: 0.7,
          }
        }
      );

      const outputString = Array.isArray(output) ? output.join('') : String(output);
      const jsonMatch = outputString.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis;
      }
    } catch (error) {
      console.error('Failed to analyze outfit with Replicate:', error);
    }

    return this.getDefaultAnalysis();
  }

  private getDefaultAnalysis(): StyleAnalysis {
    return {
      matchesProfile: true,
      score: 75,
      reasoning: "This outfit aligns well with your style preferences and helps you move toward your desired aesthetic.",
      recommendations: [
        "Consider adding accessories that reflect your personal style",
        "Make sure the colors match your skin tone and preferences"
      ],
      styleAlignment: {
        perception: ["Confident", "Modern"],
        complexity: "Balanced",
        occasions: ["Casual", "Weekend"],
        colors: ["Versatile neutral base"]
      }
    };
  }

  async generateStyleInsights(profile: any): Promise<string> {
    const prompt = `
Based on this style profile, provide a concise style analysis (2-3 sentences) that captures their aesthetic and transformation goals:

Perception Style: ${profile.perceptionStyle?.join(', ') || 'Not specified'}
Current Style: ${profile.currentStyle?.join(', ') || 'Not specified'}
Desired Style: ${profile.desiredStyle?.join(', ') || 'Not specified'}
Goals: ${profile.outfitGoals?.join(', ') || 'Not specified'}

The analysis should be encouraging and highlight their style evolution.
`;

    try {
      const output = await replicate.run(
        "meta/meta-llama-3-70b-instruct",
        {
          input: {
            prompt: prompt,
            max_new_tokens: 200,
            temperature: 0.7,
          }
        }
      );

      const outputString = Array.isArray(output) ? output.join('') : String(output);
      return outputString.trim();
    } catch (error) {
      console.error('Failed to generate style insights:', error);
      return "Your style journey is about expressing your unique personality through fashion.";
    }
  }
}

export default StyleAnalysisService.getInstance();
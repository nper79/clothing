import Replicate from "replicate";

const resolveUrl = (input: string | Request | URL): string => {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (input && typeof input.url === 'string') {
    return input.url;
  }
  return '';
};

// Custom fetch implementation that uses our Vite proxy
export const customFetch = async (input: string | Request | URL, options: RequestInit = {}) => {
  const urlStr = resolveUrl(input);

  if (urlStr.includes('api.replicate.com')) {
    const proxyUrl = '/api/replicate' + urlStr.replace('https://api.replicate.com', '');
    console.log('Using Vite proxy for:', urlStr, '->', proxyUrl);

    const sourceHeaders = options.headers ?? (input instanceof Request ? input.headers : undefined);
    const baseHeaders = new Headers(sourceHeaders || undefined);

    baseHeaders.delete('authorization');

    if (!baseHeaders.has('content-type') && !(options.body instanceof FormData)) {
      baseHeaders.set('Content-Type', 'application/json');
    }

    return fetch(proxyUrl, {
      ...options,
      headers: Object.fromEntries(baseHeaders.entries())
    });
  }

  return fetch(input as RequestInfo, options);
};

export const extractImageUrl = (output: unknown): string => {
  if (!output) {
    return '';
  }
  if (Array.isArray(output)) {
    return extractImageUrl(output[0]);
  }
  if (typeof output === 'string') {
    return output;
  }
  if (typeof output === 'object') {
    const candidate = output as Record<string, unknown>;
    if (typeof candidate.url === 'string') {
      return candidate.url;
    }
    if (Array.isArray(candidate.output)) {
      return extractImageUrl(candidate.output[0]);
    }
    if (typeof candidate.path === 'string') {
      return candidate.path;
    }
  }
  return '';
};

export interface CalibrationImage {
  id: string;
  originalPrompt: string;
  claudeGeneratedPrompt: string;
  imageData?: string;
  isGenerated: boolean;
  error?: string;
}

export interface StyleCategory {
  category: string;
  description: string;
  keywords: string[];
  targetAudience: string;
}

export class ReplicateImageService {
  private static readonly REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;
  private static replicate: Replicate | null = null;

  // Debug: Log token status
  static debugToken() {
    console.log('🔑 Debug - Replicate Token Status:');
    console.log('Token exists:', !!this.REPLICATE_API_TOKEN);
    console.log('Token length:', this.REPLICATE_API_TOKEN?.length || 0);
    console.log('Token starts with r8_:', this.REPLICATE_API_TOKEN?.startsWith('r8_') || false);
  }

  // Initialize Replicate client
  private static getClient(): Replicate {
    if (!this.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is not configured in .env file");
    }

    if (!this.replicate) {
      this.replicate = new Replicate({
        auth: this.REPLICATE_API_TOKEN,
        fetch: customFetch, // Use Vite proxy
        useFileOutput: false
      });
    }

    return this.replicate;
  }

  private static readonly STYLE_CATEGORIES: StyleCategory[] = [
    {
      category: 'Minimalista Executivo',
      description: 'Look clean e sofisticado para ambiente corporativo',
      keywords: ['minimalista', 'profissional', 'clean lines', 'neutral colors'],
      targetAudience: 'professional'
    },
    {
      category: 'Streetwear Urbano',
      description: 'Estilo descontraído com influência urbana',
      keywords: ['streetwear', 'casual', 'moderno', 'urbano'],
      targetAudience: 'urban'
    },
    {
      category: 'Boêmio Artístico',
      description: 'Expressão livre com toques orgânicos',
      keywords: ['boêmio', 'artístico', 'criativo', 'orgânico'],
      targetAudience: 'creative'
    },
    {
      category: 'Punk Rock Attitude',
      description: 'Rebelde e ousado com peças statement',
      keywords: ['punk', 'rock', 'rebelde', 'ousado'],
      targetAudience: 'alternative'
    },
    {
      category: 'Vintage Charmoso',
      description: 'Clássico atemporal com personalidade',
      keywords: ['vintage', 'retro', 'nostálgico', 'clássico'],
      targetAudience: 'vintage'
    },
    {
      category: 'Hip-Hop Urban',
      description: 'Inspiração urbana com atitude',
      keywords: ['hip-hop', 'urbano', 'baggy', 'street style'],
      targetAudience: 'street'
    },
    {
      category: 'Skate Punk',
      description: 'Descontraído e funcional para skatistas',
      keywords: ['skate', 'descontraído', 'funcional', 'skatista'],
      targetAudience: 'youth'
    },
    {
      category: 'Gótico Dark',
      description: 'Mistério e elegância sombria',
      keywords: ['gótico', 'dark', 'misterioso', 'elegante'],
      targetAudience: 'gothic'
    },
    {
      category: 'Preppy Collegiate',
      description: 'Clássico americano universitário',
      keywords: ['preppy', 'collegiate', 'clássico', 'universitário'],
      targetAudience: 'preppy'
    },
    {
      category: 'Business Formal',
      description: 'Poder e profissionalismo máximo',
      keywords: ['negócios', 'formal', 'profissional', 'corporativo'],
      targetAudience: 'professional'
    },
    {
      category: 'Artístico Ecletico',
      description: 'Mistura ousada de estilos e texturas',
      keywords: ['artístico', 'ecletico', 'criativo', 'ousado'],
      targetAudience: 'artistic'
    },
    {
      category: 'Minimalista Casual',
      description: 'Simplicidade e conforto no dia a dia',
      keywords: ['minimalista', 'casual', 'simples', 'confortável'],
      targetAudience: 'casual'
    },
    {
      category: 'Indie Alternative',
      description: 'Alternativo com toque vintage',
      keywords: ['indie', 'alternativo', 'vintage', 'musical'],
      targetAudience: 'alternative'
    },
    {
      category: 'Luxury Designer',
      description: 'Alta moda e sofisticação',
      keywords: ['luxo', 'designer', 'sofisticado', 'alta moda'],
      targetAudience: 'luxury'
    },
    {
      category: 'Techwear Modern',
      description: 'Funcionalidade tecnológica e estética urbana',
      keywords: ['techwear', 'moderno', 'funcional', 'tecnológico'],
      targetAudience: 'tech'
    }
  ];

  /**
   * Generate optimized prompts using Claude 4.5 Sonnet
   */
  private static async generatePromptWithClaude(
    category: StyleCategory,
    gender: string
  ): Promise<string> {
    const client = this.getClient();

    const claudePrompt = `You are a professional fashion photographer and AI image generation expert.

Create a detailed, optimized prompt for Google Nano Banana to generate a full-body fashion photograph.

Style Category: ${category.category}
Description: ${category.description}
Keywords: ${category.keywords.join(', ')}
Target Audience: ${category.targetAudience}
Gender: ${gender}

Requirements:
1. Full body shot showing complete outfit from head to toe
2. Fashion photography quality with professional lighting
3. 512x768 resolution (portrait orientation)
4. Natural, realistic appearance
5. Modern, trendy fashion
6. Clear focus on clothing and accessories
7. Appropriate background for fashion photography

Output format:
Generate ONLY the optimized image prompt (no explanations). The prompt should be detailed but concise, perfect for Google Nano Banana.`;

    try {
      const output = await client.run("anthropic/claude-4.5-sonnet", {
        input: {
          prompt: claudePrompt,
          max_tokens: 1024,
          temperature: 0.7
        }
      });

      let generatedPrompt = "";
      if (Array.isArray(output)) {
        generatedPrompt = output[0] || "";
      } else if (typeof output === 'string') {
        generatedPrompt = output;
      } else if (typeof output === 'object' && output !== null) {
        generatedPrompt = (output as any)?.text || "";
      }

      return generatedPrompt.trim();
    } catch (error) {
      console.error('Error generating prompt with Claude 4.5:', error);

      // Fallback prompt if Claude fails
      return `Full body fashion photograph of ${gender} person in ${category.category.toLowerCase()} outfit. ${category.description}. Modern, professional style with high fashion photography quality. Clean lighting, detailed clothing,时尚摄影风格。`;
    }
  }

  /**
   * Generate image using Google Nano Banana with Claude-generated prompt
   */
  private static async generateImageWithNanoBanana(prompt: string): Promise<string> {
    const client = this.getClient();
    const model = "google/nano-banana";

    const output = await client.run(model, {
      input: {
        prompt,
        aspect_ratio: "2:3", // Portrait orientation similar to 512x768
        output_format: "jpg"
      }
    });

    console.log('Google Nano Banana output:', output);

    const imageUrl = extractImageUrl(output);
    console.log('Extracted image URL:', imageUrl);
    return imageUrl;
  }

  /**
   * Generate calibration images using Claude 4.5 + Google Nano Banana
   */
  static async generateCalibrationImages(gender: string = 'neutral'): Promise<CalibrationImage[]> {
    const calibrationImages: CalibrationImage[] = [];

    console.log(`Generating ${this.STYLE_CATEGORIES.length} calibration images using Claude 4.5 + Google Nano Banana for gender: ${gender}`);

    for (let i = 0; i < this.STYLE_CATEGORIES.length; i++) {
      const category = this.STYLE_CATEGORIES[i];

      try {
        console.log(`Generating image ${i + 1}/${this.STYLE_CATEGORIES.length}: ${category.category}`);

        // Step 1: Generate optimized prompt with Claude 4.5
        console.log(`Step 1: Generating prompt with Claude 4.5...`);
        const claudePrompt = await this.generatePromptWithClaude(category, gender);
        console.log(`✅ Claude prompt generated: ${claudePrompt.substring(0, 100)}...`);

        // Step 2: Generate image with Google Nano Banana
        console.log(`Step 2: Generating image with Google Nano Banana...`);
        const imageUrl = await this.generateImageWithNanoBanana(claudePrompt);

        calibrationImages.push({
          id: `calibration_${i + 1}`,
          originalPrompt: `${category.category} - ${gender}`,
          claudeGeneratedPrompt: claudePrompt,
          imageData: imageUrl,
          isGenerated: !!imageUrl
        });

        console.log(`✅ Successfully generated image for ${category.category}`);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`Error generating image for ${category.category}:`, error);

        calibrationImages.push({
          id: `calibration_${i + 1}`,
          originalPrompt: `${category.category} - ${gender}`,
          claudeGeneratedPrompt: '',
          isGenerated: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Generated ${calibrationImages.filter(img => img.isGenerated).length} successful calibration images`);
    return calibrationImages;
  }

  /**
   * Generate a single image on-demand using Claude 4.5 + Google Nano Banana
   */
  static async generateSingleImage(category: StyleCategory, gender: string = 'neutral'): Promise<CalibrationImage> {
    try {
      console.log(`Generating single image for ${category.category} (${gender})...`);

      // Step 1: Generate prompt with Claude 4.5
      const claudePrompt = await this.generatePromptWithClaude(category, gender);

      // Step 2: Generate image with Google Nano Banana
      const imageUrl = await this.generateImageWithNanoBanana(claudePrompt);

      return {
        id: `single_${Date.now()}`,
        originalPrompt: `${category.category} - ${gender}`,
        claudeGeneratedPrompt: claudePrompt,
        imageData: imageUrl,
        isGenerated: !!imageUrl
      };
    } catch (error) {
      console.error('Error generating single image:', error);
      throw error;
    }
  }

  /**
   * Get style categories for manual testing
   */
  static getStyleCategories(gender: string = 'neutral'): StyleCategory[] {
    return this.STYLE_CATEGORIES;
  }

  /**
   * Check if Replicate API is properly configured
   */
  static isConfigured(): boolean {
    this.debugToken(); // Debug log
    return !!this.REPLICATE_API_TOKEN;
  }

  /**
   * Get usage estimate
   */
  static getUsageEstimate(): {
    claudeRequests: number;
    nanoBananaRequests: number;
    estimatedCost: number
  } {
    // Claude 4.5: ~$0.015 per 1K tokens
    // Google Nano Banana: Check Replicate pricing
    return {
      claudeRequests: 0,
      nanoBananaRequests: 0,
      estimatedCost: 0
    };
  }
}

// Export helper functions for use in other services
const dataUriRegex = /^data:(?<mime>.+);base64,(?<data>.+)$/;

export async function prepareImageInput(source: string): Promise<string> {
  // Replicate can handle data URLs directly, no need to convert to blob
  if (!source.startsWith('data:')) {
    return source;
  }

  const match = source.match(dataUriRegex);
  if (!match || !match.groups?.data) {
    throw new Error('Invalid data URI for user photo.');
  }

  // Return the data URL as-is - Replicate will handle it
  return source;
}






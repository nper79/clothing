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
const customFetch = async (input: string | Request | URL, options: RequestInit = {}) => {
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

const extractImageUrl = (output: unknown): string => {
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

export interface EditedImage {
  id: string;
  originalPrompt: string;
  editPrompt: string;
  originalImageUrl: string;
  editedImageUrl?: string;
  isEdited: boolean;
  error?: string;
}

export class ReplicateImageEditService {
  private static readonly REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;
  private static replicate: Replicate | null = null;

  // Base images for editing - use simple, clear base images
  private static readonly BASE_IMAGES = {
    male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=768&fit=crop&crop=full-body', // Man in plain clothes
    female: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=512&h=768&fit=crop&crop=full-body' // Woman in plain clothes
  };

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

  /**
   * Generate image using reve/edit-fast model
   * This model edits an existing image based on a prompt
   */
  private static async editImageWithReve(
    baseImageUrl: string,
    editPrompt: string
  ): Promise<string> {
    const client = this.getClient();
    const model = "reve/edit-fast";

    console.log(`🎨 Editing image with prompt: "${editPrompt.substring(0, 100)}..."`);

    const output = await client.run(model, {
      input: {
        image: baseImageUrl,
        prompt: editPrompt
      }
    });

    console.log('Reve edit-fast output:', output);

    const imageUrl = extractImageUrl(output);
    console.log('Extracted edited image URL:', imageUrl);
    return imageUrl;
  }

  /**
  * Generate optimized edit prompts using GPT-5 on Replicate
  */
  private static async generateEditPromptWithGpt5(
    originalPrompt: string,
    gender: 'male' | 'female'
  ): Promise<string> {
    const client = this.getClient();

    const gptPrompt = `You are a professional fashion stylist and AI image editing expert.

You need to create an edit prompt for the AI image editing model "reve/edit-fast" to transform a casual outfit image into a specific fashion style.

Original Style Description: ${originalPrompt}
Gender: ${gender}

Requirements for the edit prompt:
1. Be specific about clothing items, colors, and styles
2. Focus on full body outfit transformation
3. Include accessories, shoes, and overall aesthetic
4. Ensure the result shows only one person (${gender}) in the frame
5. Make sure the clothing is clearly visible and well-defined
6. Use fashion terminology that works well with AI image editing

Output format:
Generate ONLY the optimized edit prompt (no explanations). The prompt should be direct and clear for image editing.

Example format:
"Make the person wear [detailed clothing description] with [specific footwear/shoes]. Transform into [specific style description]. FULL BODY IMAGE from head to toe, INCLUDING FOOTWEAR/SHOES clearly visible. Single person only, solo portrait. Complete outfit must be shown including shoes."`;

    try {
      const output = await client.run("openai/gpt-5", {
        input: {
          prompt: gptPrompt,
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
      console.error('Error generating edit prompt with GPT-5:', error);

      // Fallback prompt if GPT-5 fails
      return `Make the person wear ${originalPrompt}. FULL BODY IMAGE from head to toe, INCLUDING FOOTWEAR/SHOES clearly visible. Single person only, solo portrait. Professional fashion photography style. Complete outfit must be shown including shoes.`;
    }
  }

  /**
  * Edit a single image using GPT-5 + reve/edit-fast
   */
  static async editSingleImage(
    originalPrompt: string,
    gender: 'male' | 'female'
  ): Promise<EditedImage> {
    try {
      console.log(`🎨 Editing image for ${gender} with prompt: "${originalPrompt}"`);

      // Get base image
      const baseImageUrl = this.BASE_IMAGES[gender];
      if (!baseImageUrl) {
        throw new Error(`No base image available for gender: ${gender}`);
      }

      // Step 1: Generate edit prompt with GPT-5
      console.log(`Step 1: Generating edit prompt with GPT-5...`);
      const editPrompt = await this.generateEditPromptWithGpt5(originalPrompt, gender);
      console.log(`✅ Edit prompt generated: ${editPrompt.substring(0, 100)}...`);

      // Step 2: Edit image with reve/edit-fast
      console.log(`Step 2: Editing image with reve/edit-fast...`);
      const editedImageUrl = await this.editImageWithReve(baseImageUrl, editPrompt);

      return {
        id: `edit_${Date.now()}`,
        originalPrompt,
        editPrompt,
        originalImageUrl: baseImageUrl,
        editedImageUrl,
        isEdited: !!editedImageUrl
      };
    } catch (error) {
      console.error('Error editing image:', error);
      throw error;
    }
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
    gptRequests: number;
    reveEditRequests: number;
    estimatedCost: number
  } {
    // GPT-5: cost depends on OpenAI pricing via Replicate
    // Reve edit-fast: Check Replicate pricing
    return {
      gptRequests: 0,
      reveEditRequests: 0,
      estimatedCost: 0
    };
  }

  /**
   * Create base images if needed
   * This could be expanded to generate or upload custom base images
   */
  static async ensureBaseImages(): Promise<boolean> {
    try {
      // For now, we'll assume the base images exist
      // In a production environment, you might want to verify they're accessible
      console.log('📷 Base images configured for image editing');
      return true;
    } catch (error) {
      console.error('Error ensuring base images:', error);
      return false;
    }
  }
}

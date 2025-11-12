import type { Answers } from '../types';
import { ReplicateImageService } from './replicateImageService';

export interface GeneratedStyleImage {
  styleCategory: string;
  gender: 'male' | 'female';
  imageUrl: string;
  prompt: string;
  generatedAt: Date;
}

export class StyleImageGenerator {
  private static cacheKey = 'generated_style_images';

  /**
   * Generate images for all style categories based on gender
   */
  static async generateAllStyleImages(gender: 'male' | 'female'): Promise<GeneratedStyleImage[]> {
    console.log(`Generating style images for ${gender}...`);

    const styleCategories = [
      { name: 'Minimalista', description: 'minimalist executive style' },
      { name: 'Streetwear', description: 'urban streetwear fashion' },
      { name: 'Boemio', description: 'bohemian artistic style' },
      { name: 'Punk', description: 'punk rock fashion' },
      { name: 'Vintage', description: 'vintage retro style' },
      { name: 'Hip-Hop', description: 'hip-hop urban fashion' },
      { name: 'Skate', description: 'skate casual style' },
      { name: 'Gotico', description: 'gothic dark style' },
      { name: 'Preppy', description: 'preppy academic style' },
      { name: 'Formal', description: 'formal business style' },
      { name: 'Artistico', description: 'artistic creative style' },
      { name: 'Indie', description: 'indie alternative style' },
      { name: 'Luxo', description: 'luxury sophisticated style' },
      { name: 'Techwear', description: 'techwear functional style' }
    ];

    const generatedImages: GeneratedStyleImage[] = [];

    for (const category of styleCategories) {
      try {
        console.log(`Generating image for ${category.name} (${gender})...`);

        const prompt = this.createPrompt(category.name, category.description, gender);

        // Find matching style category in ReplicateImageService
        const replicateCategories = ReplicateImageService.getStyleCategories();
        const matchingCategory = replicateCategories.find(cat =>
          cat.category.toLowerCase().includes(category.name.toLowerCase()) ||
          category.name.toLowerCase().includes(cat.category.toLowerCase())
        );

        if (!matchingCategory) {
          console.warn(`No matching category found for ${category.name}, skipping...`);
          continue;
        }

        const result = await ReplicateImageService.generateSingleImage(matchingCategory, gender);
        const imageUrl = result.imageData;

        const generatedImage: GeneratedStyleImage = {
          styleCategory: category.name,
          gender,
          imageUrl,
          prompt,
          generatedAt: new Date()
        };

        generatedImages.push(generatedImage);
        console.log(`Successfully generated image for ${category.name} (${gender}): ${imageUrl}`);

      } catch (error) {
        console.error(`Failed to generate image for ${category.name} (${gender}):`, error);
        // Continue with next category even if one fails
      }
    }

    // Save to cache
    this.saveToCache(gender, generatedImages);

    return generatedImages;
  }

  /**
   * Create specific prompts for each style and gender
   */
  private static createPrompt(styleName: string, description: string, gender: 'male' | 'female'): string {
    const genderPronoun = gender === 'male' ? 'man' : 'woman';
    const genderDesc = gender === 'male' ? 'handsome man' : 'beautiful woman';

    const prompts: { [key: string]: string } = {
      'Minimalista': `Professional full body photo of a ${genderDesc} in minimalist executive business attire, clean lines, neutral colors, modern office building background, fashion photography, high quality, realistic style`,
      'Streetwear': `Full body fashion photo of a stylish ${genderPronoun} wearing urban streetwear outfit, trendy casual clothes, city street background, contemporary fashion, high quality photography`,
      'Boemio': `Artistic full body photo of a ${genderDesc} in bohemian style fashion, flowing fabrics, natural colors, artistic outdoor setting, creative fashion photography, authentic style`,
      'Punk': `Edgy full body photo of a ${genderPronoun} in punk rock fashion, leather jacket, distressed clothes, urban background, alternative style, high contrast photography`,
      'Vintage': `Full body photo of a ${genderDesc} wearing vintage retro style clothing, classic fashion, nostalgic atmosphere, warm tones, timeless style, photography`,
      'Hip-Hop': `Urban fashion photo of a ${genderPronoun} in hip-hop style clothing, baggy clothes, sneakers, street background, modern music culture, stylish photography`,
      'Skate': `Full body photo of a ${genderPronoun} in skate style casual clothing, comfortable outfit, skate park background, relaxed fashion, authentic lifestyle photography`,
      'Gotico': `Full body portrait of a ${genderDesc} in gothic fashion style, dark elegant clothing, dramatic lighting, mysterious atmosphere, high quality fashion photography`,
      'Preppy': `Full body photo of a ${genderDesc} in preppy academic style, clean cut clothes, college campus background, classic American style, bright lighting`,
      'Formal': `Professional full body photo of a ${genderDesc} in formal business executive attire, suit and tie/elegant dress, corporate office background, power dressing, high quality photography`,
      'Artistico': `Creative full body photo of a ${genderPronoun} in eclectic artistic fashion, mixed styles and textures, art studio background, bold fashion choices, artistic photography`,
      'Indie': `Full body photo of a ${genderPronoun} in indie alternative style, vintage-inspired clothing, unique fashion sense, urban artsy background, authentic photography`,
      'Luxo': `Elegant full body photo of a ${genderDesc} wearing luxury designer fashion, sophisticated high-end style, upscale background, premium fashion photography`,
      'Techwear': `Modern full body photo of a ${genderPronoun} in techwear functional fashion, technology-inspired clothing, urban futuristic setting, contemporary style photography`
    };

    return prompts[styleName] || `Full body fashion photo of a ${genderDesc} in ${description} style, high quality photography, realistic, professional lighting`;
  }

  /**
   * Get cached images or generate new ones if not available
   */
  static async getOrGenerateImages(gender: 'male' | 'female'): Promise<GeneratedStyleImage[]> {
    // Try to get from cache first
    const cachedImages = this.getFromCache(gender);
    if (cachedImages && cachedImages.length > 0) {
      console.log(`Found ${cachedImages.length} cached images for ${gender}`);
      return cachedImages;
    }

    console.log(`No cached images found for ${gender}, generating new ones...`);

    // Generate new images
    return await this.generateAllStyleImages(gender);
  }

  /**
   * Get images from localStorage cache
   */
  private static getFromCache(gender: 'male' | 'female'): GeneratedStyleImage[] {
    try {
      const cacheKey = `${this.cacheKey}_${gender}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        // Convert date strings back to Date objects
        return data.map((img: any) => ({
          ...img,
          generatedAt: new Date(img.generatedAt)
        }));
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    return [];
  }

  /**
   * Save images to localStorage cache
   */
  private static saveToCache(gender: 'male' | 'female', images: GeneratedStyleImage[]): void {
    try {
      const cacheKey = `${this.cacheKey}_${gender}`;
      localStorage.setItem(cacheKey, JSON.stringify(images));
      console.log(`Saved ${images.length} images to cache for ${gender}`);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Clear cache for testing purposes
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(`${this.cacheKey}_male`);
      localStorage.removeItem(`${this.cacheKey}_female`);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}
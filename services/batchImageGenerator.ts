import { ReplicateImageEditService } from './replicateImageEditService';
import { ComprehensivePromptLibrary, ComprehensiveLook } from './comprehensivePromptLibrary';

export interface GeneratedComprehensiveImage {
  id: string;
  lookId: string;
  gender: 'male' | 'female';
  name: string;
  category: string;
  level: string;
  prompt: string;
  imageUrl: string;
  isGenerated: boolean;
  error?: string;
  generatedAt: Date;
}

export interface BatchGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  currentLook: string;
  percentage: number;
  estimatedTimeRemaining: number; // em minutos
}

export class BatchImageGenerator {
  private static readonly CACHE_KEY = 'comprehensive_generated_images';
  private static readonly BATCH_CACHE_KEY = 'batch_generation_progress';

  /**
   * Gera imagens para todos os looks de um gênero específico
   */
  static async generateAllGenderImages(
    gender: 'male' | 'female',
    onProgress?: (progress: BatchGenerationProgress) => void
  ): Promise<GeneratedComprehensiveImage[]> {
    const looks = ComprehensivePromptLibrary.getAllLooks(gender);
    const total = looks.length;
    let completed = 0;
    let failed = 0;
    const startTime = Date.now();
    const generatedImages: GeneratedComprehensiveImage[] = [];

    console.log(`🚀 Starting batch generation for ${gender} - ${total} looks to process`);

    // Primeiro, verifica se já temos imagens em cache
    const cachedImages = this.getCachedImages(gender);
    if (cachedImages.length > 0) {
      console.log(`📦 Found ${cachedImages.length} cached images for ${gender}`);
      return cachedImages;
    }

    for (let i = 0; i < looks.length; i++) {
      const look = looks[i];

      // Atualiza progresso
      const progress: BatchGenerationProgress = {
        total,
        completed,
        failed,
        currentLook: look.name,
        percentage: Math.round((completed + failed) / total * 100),
        estimatedTimeRemaining: this.estimateTimeRemaining(startTime, completed + failed, total)
      };

      if (onProgress) {
        onProgress(progress);
      }

      try {
        console.log(`🎨 Generating image for ${look.name} (${i + 1}/${total})`);

        // Edita imagem usando o novo ReplicateImageEditService
        const result = await ReplicateImageEditService.editSingleImage(
          look.prompt,
          gender
        );

        const generatedImage: GeneratedComprehensiveImage = {
          id: `batch_${gender}_${look.id}_${Date.now()}`,
          lookId: look.id,
          gender,
          name: look.name,
          category: look.category,
          level: look.level,
          prompt: look.prompt,
          imageUrl: result.editedImageUrl || '',
          isGenerated: !!result.editedImageUrl,
          error: result.error,
          generatedAt: new Date()
        };

        if (generatedImage.isGenerated) {
          generatedImages.push(generatedImage);
          completed++;
          console.log(`✅ Successfully generated: ${look.name}`);
        } else {
          failed++;
          console.log(`❌ Failed to generate: ${look.name} - ${result.error}`);
        }

        // Pequena pausa para não sobrecarregar a API
        if (i < looks.length - 1) {
          await this.sleep(1000); // 1 segundo entre requests
        }

      } catch (error) {
        failed++;
        console.error(`❌ Error generating image for ${look.name}:`, error);

        const failedImage: GeneratedComprehensiveImage = {
          id: `batch_${gender}_${look.id}_${Date.now()}`,
          lookId: look.id,
          gender,
          name: look.name,
          category: look.category,
          level: look.level,
          prompt: look.prompt,
          imageUrl: '',
          isGenerated: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          generatedAt: new Date()
        };
        generatedImages.push(failedImage);
      }
    }

    // Salva em cache
    const successfulImages = generatedImages.filter(img => img.isGenerated);
    this.saveToCache(gender, successfulImages);

    console.log(`🎉 Batch generation completed for ${gender}: ${completed}/${total} successful`);

    return successfulImages;
  }

  /**
   * Gera imagens para todos os looks (ambos os gêneros)
   */
  static async generateAllImages(
    onProgress?: (progress: BatchGenerationProgress & { gender: 'male' | 'female' }) => void
  ): Promise<GeneratedComprehensiveImage[]> {
    console.log('🌟 Starting complete batch generation for all looks...');

    const maleImages = await this.generateAllGenderImages('male', (progress) => {
      if (onProgress) {
        onProgress({ ...progress, gender: 'male' });
      }
    });

    // Pequena pausa entre gêneros
    await this.sleep(2000);

    const femaleImages = await this.generateAllGenderImages('female', (progress) => {
      if (onProgress) {
        onProgress({ ...progress, gender: 'female' });
      }
    });

    const allImages = [...maleImages, ...femaleImages];
    console.log(`🎊 Complete batch generation finished: ${allImages.length} images generated`);

    return allImages;
  }

  /**
   * Obtém imagens geradas para um gênero específico
   */
  static getGeneratedImages(gender: 'male' | 'female'): GeneratedComprehensiveImage[] {
    return this.getCachedImages(gender);
  }

  /**
   * Obtém uma seleção balanceada de looks para calibração visual
   */
  static getCalibrationLooks(gender: 'male' | 'female', count: number = 15): GeneratedComprehensiveImage[] {
    const allImages = this.getCachedImages(gender);
    const looks = ComprehensivePromptLibrary.getBalancedSelection(gender);

    // Mapeia looks para imagens correspondentes
    const selectedImages: GeneratedComprehensiveImage[] = [];

    for (const look of looks) {
      const image = allImages.find(img => img.lookId === look.id);
      if (image && image.isGenerated) {
        selectedImages.push(image);
      }

      if (selectedImages.length >= count) {
        break;
      }
    }

    return selectedImages;
  }

  /**
   * Obtém estatísticas da geração
   */
  static getGenerationStats(): {
    male: number;
    female: number;
    total: number;
    cacheSize: number;
    lastGeneration: Date | null;
  } {
    const maleImages = this.getCachedImages('male');
    const femaleImages = this.getCachedImages('female');

    return {
      male: maleImages.filter(img => img.isGenerated).length,
      female: femaleImages.filter(img => img.isGenerated).length,
      total: maleImages.length + femaleImages.length,
      cacheSize: this.getCacheSize(),
      lastGeneration: this.getLastGenerationDate()
    };
  }

  /**
   * Limpa o cache de imagens geradas
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(`${this.CACHE_KEY}_male`);
      localStorage.removeItem(`${this.CACHE_KEY}_female`);
      console.log('🗑️ Comprehensive image cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Força regeneração de imagens para um gênero específico
   */
  static async forceRegeneration(
    gender: 'male' | 'female',
    onProgress?: (progress: BatchGenerationProgress) => void
  ): Promise<GeneratedComprehensiveImage[]> {
    console.log(`🔄 Forcing regeneration for ${gender}...`);
    this.clearCache();
    return this.generateAllGenderImages(gender, onProgress);
  }

  /**
   * Verifica se há imagens disponíveis para calibração
   */
  static isReadyForCalibration(gender: 'male' | 'female'): boolean {
    const images = this.getCachedImages(gender);
    return images.length >= 10; // Mínimo de 10 imagens para calibração
  }

  // ===== MÉTODOS PRIVADOS =====

  private static getCachedImages(gender: 'male' | 'female'): GeneratedComprehensiveImage[] {
    try {
      const cacheKey = `${this.CACHE_KEY}_${gender}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        // Converte strings de data de volta para objetos Date
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

  private static saveToCache(gender: 'male' | 'female', images: GeneratedComprehensiveImage[]): void {
    try {
      const cacheKey = `${this.CACHE_KEY}_${gender}`;
      localStorage.setItem(cacheKey, JSON.stringify(images));
      console.log(`💾 Saved ${images.length} images to cache for ${gender}`);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  private static getCacheSize(): number {
    try {
      const maleCache = localStorage.getItem(`${this.CACHE_KEY}_male`);
      const femaleCache = localStorage.getItem(`${this.CACHE_KEY}_female`);

      const maleSize = maleCache ? maleCache.length : 0;
      const femaleSize = femaleCache ? femaleCache.length : 0;

      return maleSize + femaleSize;
    } catch (error) {
      return 0;
    }
  }

  private static getLastGenerationDate(): Date | null {
    try {
      const maleImages = this.getCachedImages('male');
      const femaleImages = this.getCachedImages('female');

      const allDates = [
        ...maleImages.map(img => img.generatedAt),
        ...femaleImages.map(img => img.generatedAt)
      ];

      if (allDates.length === 0) return null;

      return new Date(Math.max(...allDates.map(date => date.getTime())));
    } catch (error) {
      return null;
    }
  }

  private static estimateTimeRemaining(
    startTime: number,
    completed: number,
    total: number
  ): number {
    if (completed === 0) return 0;

    const elapsed = (Date.now() - startTime) / 1000 / 60; // minutos
    const avgTimePerItem = elapsed / completed;
    const remaining = total - completed;

    return Math.round(avgTimePerItem * remaining);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtém resumo da biblioteca de prompts
   */
  static getLibraryStats(): {
    total: number;
    male: number;
    female: number;
    levels: Record<string, number>;
    categories: Record<string, number>;
  } {
    const stats = ComprehensivePromptLibrary.getStats();
    const maleLevels = this.getLevelStats('male');
    const femaleLevels = this.getLevelStats('female');

    return {
      total: stats.total,
      male: stats.male,
      female: stats.female,
      levels: { ...maleLevels, ...femaleLevels },
      categories: this.getCategoryStats()
    };
  }

  private static getLevelStats(gender: 'male' | 'female'): Record<string, number> {
    const levels: Record<string, number> = {
      conservador: 0,
      intermedio: 0,
      experimental: 0,
      especifico: 0
    };

    const looks = ComprehensivePromptLibrary.getAllLooks(gender);
    looks.forEach(look => {
      levels[look.level] = (levels[look.level] || 0) + 1;
    });

    return levels;
  }

  private static getCategoryStats(): Record<string, number> {
    const categories: Record<string, number> = {};
    const allLooks = [
      ...ComprehensivePromptLibrary.getAllLooks('male'),
      ...ComprehensivePromptLibrary.getAllLooks('female')
    ];

    allLooks.forEach(look => {
      categories[look.category] = (categories[look.category] || 0) + 1;
    });

    return categories;
  }
}
import { StyleImageGenerator } from '../services/styleImageGenerator';

/**
 * Utility functions for debugging and testing
 */
export class DebugUtils {
  /**
   * Clear all generated style images from cache
   * Use this when testing image generation
   */
  static clearStyleImageCache(): void {
    StyleImageGenerator.clearCache();
    console.log('🗑️ Style image cache cleared - new images will be generated on next load');
  }

  /**
   * Log all cached images to console
   */
  static logCachedImages(): void {
    const maleCache = localStorage.getItem('generated_style_images_male');
    const femaleCache = localStorage.getItem('generated_style_images_female');

    console.log('📸 Cached Style Images:');
    console.log('Male:', maleCache ? JSON.parse(maleCache).length : 0, 'images');
    console.log('Female:', femaleCache ? JSON.parse(femaleCache).length : 0, 'images');

    if (maleCache) {
      console.log('Male images:', JSON.parse(maleCache).map((img: any) => img.styleCategory));
    }
    if (femaleCache) {
      console.log('Female images:', JSON.parse(femaleCache).map((img: any) => img.styleCategory));
    }
  }

  /**
   * Force regeneration of style images for a specific gender
   */
  static async forceRegeneration(gender: 'male' | 'female'): Promise<void> {
    console.log(`🔄 Force regenerating images for ${gender}...`);
    this.clearStyleImageCache();

    // This will trigger regeneration on next component load
    console.log(`✅ Cache cleared. Images will regenerate on next load for ${gender}.`);
  }
}

// Make these functions available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).debugStyleImages = {
    clearCache: DebugUtils.clearStyleImageCache,
    logCache: DebugUtils.logCachedImages,
    forceRegeneration: DebugUtils.forceRegeneration
  };

  console.log('🔧 Debug utils available in console:');
  console.log('- debugStyleImages.clearCache()');
  console.log('- debugStyleImages.logCache()');
  console.log('- debugStyleImages.forceRegeneration("male" or "female")');
}
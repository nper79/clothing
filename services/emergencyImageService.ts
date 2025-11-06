/**
 * Emergency fallback image service
 * Uses curated fashion images from reliable sources when AI generation fails
 */

export interface EmergencyImage {
  styleCategory: string;
  gender: 'male' | 'female';
  imageUrl: string;
  prompt: string;
  fallbackType: 'curated' | 'placeholder';
}

export class EmergencyImageService {
  // Curated fashion images that work for each style
  private static readonly EMERGENCY_IMAGES: EmergencyImage[] = [
    // Male images
    {
      styleCategory: 'Minimalista',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=768&fit=crop&auto=format&sat=2',
      prompt: 'Professional man in minimalist business suit',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Streetwear',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1515886657623-940469a8fb36?w=512&h=768&fit=crop&auto=format',
      prompt: 'Stylish man in urban streetwear fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Boemio',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=512&h=768&fit=crop&auto=format',
      prompt: 'Artistic man in bohemian style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Punk',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1490193970923-a33c6f6d2e6f?w=512&h=768&fit=crop&auto=format',
      prompt: 'Edgy man in punk rock style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Vintage',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=512&h=768&fit=crop&auto=format',
      prompt: 'Classic man in vintage retro style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Hip-Hop',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1514222709387-a9f2df4f4b4e?w=512&h=768&fit=crop&auto=format',
      prompt: 'Street man in hip-hop urban style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Skate',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e308?w=512&h=768&fit=crop&auto=format',
      prompt: 'Casual skater guy in skate style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Gotico',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=512&h=768&fit=crop&auto=format&sat=1',
      prompt: 'Dark styled man in gothic fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Preppy',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=512&h=768&fit=crop&auto=format',
      prompt: 'Preppy college guy in classic style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Formal',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1507679769926-23a5a6ca2a5a?w=512&h=768&fit=crop&auto=format',
      prompt: 'Professional businessman in formal attire',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Artistico',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=512&h=768&fit=crop&auto=format',
      prompt: 'Creative man in artistic fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Indie',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-14882292998340-cc984ed6b8f0?w=512&h=768&fit=crop&auto=format',
      prompt: 'Indie guy in alternative style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Luxo',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1549418229-7a0b7c7f6c2d?w=512&h=768&fit=crop&auto=format',
      prompt: 'Man in luxury designer fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Techwear',
      gender: 'male',
      imageUrl: 'https://images.unsplash.com/photo-1551886543-ff0c4a3b8e2e?w=512&h=768&fit=crop&auto=format',
      prompt: 'Modern man in techwear style',
      fallbackType: 'curated'
    },

    // Female images
    {
      styleCategory: 'Minimalista',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1487415009541-07b0c5570b3a?w=512&h=768&fit=crop&auto=format',
      prompt: 'Professional woman in minimalist business suit',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Streetwear',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1494790108757-1e2ebc1c0e4e?w=512&h=768&fit=crop&auto=format',
      prompt: 'Stylish woman in urban streetwear fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Boemio',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1549418229-7a0b7c7f6c2d?w=512&h=768&fit=crop&auto=format',
      prompt: 'Artistic woman in bohemian style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Punk',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1516880277089-7e4e6b7a0b2c?w=512&h=768&fit=crop&auto=format',
      prompt: 'Edgy woman in punk rock style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Vintage',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=512&h=768&fit=crop&auto=format',
      prompt: 'Classic woman in vintage retro style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Hip-Hop',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1517881907243-da3a9b7b1b7d?w=512&h=768&fit=crop&auto=format',
      prompt: 'Street woman in hip-hop urban style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Skate',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=512&h=768&fit=crop&auto=format',
      prompt: 'Casual skater girl in skate style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Gotico',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=512&h=768&fit=crop&auto=format&sat=2',
      prompt: 'Dark styled woman in gothic fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Preppy',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1494219069441-6f274e9a5d3d?w=512&h=768&fit=crop&auto=format',
      prompt: 'Preppy college girl in classic style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Formal',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=512&h=768&fit=crop&auto=format',
      prompt: 'Professional businesswoman in formal attire',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Artistico',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=512&h=768&fit=crop&auto=format&sat=1.2',
      prompt: 'Creative woman in artistic fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Indie',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=512&h=768&fit=crop&auto=format&sat=1.5',
      prompt: 'Indie girl in alternative style',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Luxo',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1549418229-7a0b7c7f6c2d?w=512&h=768&fit=crop&auto=format&sat=1.3',
      prompt: 'Woman in luxury designer fashion',
      fallbackType: 'curated'
    },
    {
      styleCategory: 'Techwear',
      gender: 'female',
      imageUrl: 'https://images.unsplash.com/photo-1551886543-ff0c4a3b8e2e?w=512&h=768&fit=crop&auto=format&sat=1.1',
      prompt: 'Modern woman in techwear style',
      fallbackType: 'curated'
    }
  ];

  /**
   * Get emergency images for all styles and genders
   */
  static getAllImages(): EmergencyImage[] {
    return this.EMERGENCY_IMAGES;
  }

  /**
   * Get images for a specific gender
   */
  static getImagesForGender(gender: 'male' | 'female'): EmergencyImage[] {
    return this.EMERGENCY_IMAGES.filter(img => img.gender === gender);
  }

  /**
   * Get a specific image by style category and gender
   */
  static getImage(styleCategory: string, gender: 'male' | 'female'): EmergencyImage | null {
    return this.EMERGENCY_IMAGES.find(img =>
      img.styleCategory === styleCategory && img.gender === gender
    ) || null;
  }

  /**
   * Generate emergency images for failed AI generation
   */
  static generateEmergencyImages(gender: 'male' | 'female'): EmergencyImage[] {
    console.log(`🚨 Using emergency images for ${gender} - AI generation failed`);
    return this.getImagesForGender(gender);
  }
}
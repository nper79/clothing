export interface PreGeneratedImage {
  id: string;
  styleCategory: string;
  gender: 'male' | 'female';
  imageUrl: string;
  prompt: string;
}

// Pre-generated images for each style category and gender
export const PRE_GENERATED_IMAGES: PreGeneratedImage[] = [
  // Male images
  {
    id: 'male_minimalista_executivo',
    styleCategory: 'Minimalista',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=768&fit=crop&auto=format',
    prompt: 'Professional man in minimalist business suit, clean background, modern executive style'
  },
  {
    id: 'male_streetwear_urbano',
    styleCategory: 'Streetwear',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1515886657623-940469a8fb36?w=512&h=768&fit=crop&auto=format',
    prompt: 'Stylish man in urban streetwear fashion, casual modern outfit, city setting'
  },
  {
    id: 'male_bohemio_artistico',
    styleCategory: 'Boemio',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=512&h=768&fit=crop&auto=format',
    prompt: 'Artistic man in bohemian style, creative outfit, artistic atmosphere'
  },
  {
    id: 'male_punk_rock',
    styleCategory: 'Punk',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1490193970923-a33c6f6d2e6f?w=512&h=768&fit=crop&auto=format',
    prompt: 'Edgy man in punk rock style, leather jacket, bold fashion statement'
  },
  {
    id: 'male_vintage_retro',
    styleCategory: 'Vintage',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=512&h=768&fit=crop&auto=format',
    prompt: 'Classic man in vintage retro style, timeless fashion, nostalgic look'
  },
  {
    id: 'male_hiphop_urban',
    styleCategory: 'Hip-Hop',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1514222709387-a9f2df4f4b4e?w=512&h=768&fit=crop&auto=format',
    prompt: 'Street man in hip-hop urban style, baggy clothes, urban fashion'
  },
  {
    id: 'male_skate_punk',
    styleCategory: 'Skate',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e308?w=512&h=768&fit=crop&auto=format',
    prompt: 'Casual skater guy in skate punk style, comfortable street fashion'
  },
  {
    id: 'male_gotico_dark',
    styleCategory: 'Gotico',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1554658813-9e5d8e3d6a7b?w=512&h=768&fit=crop&auto=format',
    prompt: 'Dark styled man in gothic fashion, mysterious and elegant'
  },
  {
    id: 'male_prep_collegiate',
    styleCategory: 'Preppy',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=512&h=768&fit=crop&auto=format',
    prompt: 'Preppy college guy in classic American style, clean and put-together'
  },
  {
    id: 'male_business_formal',
    styleCategory: 'Formal',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1507679769926-23a5a6ca2a5a?w=512&h=768&fit=crop&auto=format',
    prompt: 'Professional businessman in formal business attire, corporate executive style'
  },
  {
    id: 'male_artistic_eclectic',
    styleCategory: 'Artistico',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=512&h=768&fit=crop&auto=format',
    prompt: 'Creative man in eclectic artistic fashion, mixed styles and textures'
  },
  {
    id: 'male_minimalista_casual',
    styleCategory: 'Minimalista',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-13f4f4923b3e?w=512&h=768&fit=crop&auto=format',
    prompt: 'Man in minimalist casual style, simple comfortable everyday fashion'
  },
  {
    id: 'male_indie_alternative',
    styleCategory: 'Indie',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-14882292998340-cc984ed6b8f0?w=512&h=768&fit=crop&auto=format',
    prompt: 'Indie guy in alternative style, vintage touches, musical influence'
  },
  {
    id: 'male_luxury_designer',
    styleCategory: 'Luxo',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1507676187634-7a5b0c4a7c1a?w=512&h=768&fit=crop&auto=format',
    prompt: 'Man in luxury designer fashion, high-end style, sophisticated look'
  },
  {
    id: 'male_techwear_modern',
    styleCategory: 'Techwear',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1551886543-ff0c4a3b8e2e?w=512&h=768&fit=crop&auto=format',
    prompt: 'Modern man in techwear style, functional technology-inspired fashion'
  },

  // Female images
  {
    id: 'female_minimalista_executivo',
    styleCategory: 'Minimalista',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1487415009541-07b0c5570b3a?w=512&h=768&fit=crop&auto=format',
    prompt: 'Professional woman in minimalist business suit, clean background, modern executive style'
  },
  {
    id: 'female_streetwear_urbano',
    styleCategory: 'Streetwear',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1507679769926-23a5a6ca2a5a?w=512&h=768&fit=crop&auto=format',
    prompt: 'Stylish woman in urban streetwear fashion, casual modern outfit, city setting'
  },
  {
    id: 'female_bohemio_artistico',
    styleCategory: 'Boemio',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1549418229-7a0b7c7f6c2d?w=512&h=768&fit=crop&auto=format',
    prompt: 'Artistic woman in bohemian style, creative outfit, artistic atmosphere'
  },
  {
    id: 'female_punk_rock',
    styleCategory: 'Punk',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1516880277089-7e4e6b7a0b2c?w=512&h=768&fit=crop&auto=format',
    prompt: 'Edgy woman in punk rock style, leather jacket, bold fashion statement'
  },
  {
    id: 'female_vintage_retro',
    styleCategory: 'Vintage',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1494790108757-1e2ebc1c0e4e?w=512&h=768&fit=crop&auto=format',
    prompt: 'Classic woman in vintage retro style, timeless fashion, nostalgic look'
  },
  {
    id: 'female_hiphop_urban',
    styleCategory: 'Hip-Hop',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1514222709387-a9f2df4f4b4e?w=512&h=768&fit=crop&auto=format',
    prompt: 'Street woman in hip-hop urban style, baggy clothes, urban fashion'
  },
  {
    id: 'female_skate_punk',
    styleCategory: 'Skate',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1517881907243-da3a9b7b1b7d?w=512&h=768&fit=crop&auto=format',
    prompt: 'Casual skater girl in skate punk style, comfortable street fashion'
  },
  {
    id: 'female_gotico_dark',
    styleCategory: 'Gotico',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e308?w=512&h=768&fit=crop&auto=format',
    prompt: 'Dark styled woman in gothic fashion, mysterious and elegant'
  },
  {
    id: 'female_prep_collegiate',
    styleCategory: 'Preppy',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1494219069441-6f274e9a5d3d?w=512&h=768&fit=crop&auto=format',
    prompt: 'Preppy college girl in classic American style, clean and put-together'
  },
  {
    id: 'female_business_formal',
    styleCategory: 'Formal',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1507676187634-7a5b0c4a7c1a?w=512&h=768&fit=crop&auto=format',
    prompt: 'Professional businesswoman in formal business attire, corporate executive style'
  },
  {
    id: 'female_artistic_eclectic',
    styleCategory: 'Artistico',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=512&h=768&fit=crop&auto=format',
    prompt: 'Creative woman in eclectic artistic fashion, mixed styles and textures'
  },
  {
    id: 'female_minimalista_casual',
    styleCategory: 'Minimalista',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1487415009541-07b0c5570b3a?w=512&h=768&fit=crop&auto=format',
    prompt: 'Woman in minimalist casual style, simple comfortable everyday fashion'
  },
  {
    id: 'female_indie_alternative',
    styleCategory: 'Indie',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-14882292998340-cc984ed6b8f0?w=512&h=768&fit=crop&auto=format',
    prompt: 'Indie girl in alternative style, vintage touches, musical influence'
  },
  {
    id: 'female_luxury_designer',
    styleCategory: 'Luxo',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1549418229-7a0b7c7f6c2d?w=512&h=768&fit=crop&auto=format',
    prompt: 'Woman in luxury designer fashion, high-end style, sophisticated look'
  },
  {
    id: 'female_techwear_modern',
    styleCategory: 'Techwear',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1551886543-ff0c4a3b8e2e?w=512&h=768&fit=crop&auto=format',
    prompt: 'Modern woman in techwear style, functional technology-inspired fashion'
  }
];

export class PreGeneratedImageService {
  /**
   * Get pre-generated images for a specific gender and style
   */
  static getImagesForGender(styleCategory: string, gender: string): PreGeneratedImage[] {
    return PRE_GENERATED_IMAGES.filter(img =>
      img.gender === (gender.toLowerCase() as 'male' | 'female') &&
      img.styleCategory === styleCategory
    );
  }

  /**
   * Get all pre-generated images for a gender
   */
  static getAllImagesForGender(gender: string): PreGeneratedImage[] {
    return PRE_GENERATED_IMAGES.filter(img =>
      img.gender === (gender.toLowerCase() as 'male' | 'female')
    );
  }

  /**
   * Get a random image for a style category and gender
   */
  static getRandomImage(styleCategory: string, gender: string): PreGeneratedImage | null {
    const images = this.getImagesForGender(styleCategory, gender);
    if (images.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  }

  /**
   * Check if images are available for a style and gender
   */
  static hasImages(styleCategory: string, gender: string): boolean {
    return this.getImagesForGender(styleCategory, gender).length > 0;
  }
}
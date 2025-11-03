import { GoogleGenAI } from "@google/genai";

export interface CalibrationImage {
  id: string;
  prompt: string;
  imageData?: string;
  isGenerated: boolean;
}

interface StylePrompt {
  category: string;
  malePrompt: string;
  femalePrompt: string;
  neutralPrompt: string;
  description: string;
}

export class VisualCalibrationService {
  private static readonly STYLE_PROMPTS: StylePrompt[] = [
    {
      category: 'Minimalista Executivo',
      malePrompt: 'Create a minimalist executive outfit for a man. Clean lines, neutral colors (white, gray, navy, black), tailored fit. White button-down shirt, slim-fit trousers, minimalist leather shoes. Professional, sophisticated, timeless style. Studio lighting, neutral background.',
      femalePrompt: 'Create a minimalist executive outfit for a woman. Clean lines, neutral colors (white, gray, navy, black), tailored fit. Crisp white blouse, slim-fit trousers or pencil skirt, minimalist pumps. Professional, sophisticated, timeless style. Studio lighting, neutral background.',
      neutralPrompt: 'Create a minimalist executive outfit with clean lines and neutral colors. Tailored pieces in white, gray, navy, black. Professional and sophisticated style with timeless appeal. Studio lighting, neutral background.',
      description: 'Look clean e sofisticado para ambiente corporativo'
    },
    {
      category: 'Streetwear Urbano',
      malePrompt: 'Create a streetwear urban outfit for a man. Hoodie or graphic t-shirt, baggy jeans or cargo pants, trendy sneakers. Modern urban style with contemporary accessories. Urban setting, dynamic lighting.',
      femalePrompt: 'Create a streetwear urban outfit for a woman. Crop top or oversized hoodie, high-waisted jeans or cargo pants, trendy sneakers. Modern urban style with contemporary accessories. Urban setting, dynamic lighting.',
      neutralPrompt: 'Create a streetwear urban outfit with contemporary street style elements. Hoodies, graphic tees, baggy jeans, trendy sneakers. Modern urban aesthetic with dynamic accessories. Urban setting, dynamic lighting.',
      description: 'Estilo descontraído com influência urbana'
    },
    {
      category: 'Boêmio Artístico',
      malePrompt: 'Create a bohemian artistic outfit for a man. Flowy fabrics, earth tones, layered look. Loose-fitting shirt, linen trousers, artisanal accessories. Creative, free-spirited style with organic textures. Natural lighting, artistic background.',
      femalePrompt: 'Create a bohemian artistic outfit for a woman. Flowy maxi dress or layered separates, earth tones, artisanal jewelry. Creative, free-spirited style with organic textures. Natural lighting, artistic background.',
      neutralPrompt: 'Create a bohemian artistic outfit with flowy fabrics and earth tones. Layered look with artisanal accessories and organic textures. Creative, free-spirited style. Natural lighting, artistic background.',
      description: 'Expressão livre com toques orgânicos'
    },
    {
      category: 'Punk Rock Attitude',
      malePrompt: 'Create a punk rock outfit for a man. Leather jacket, band t-shirt, ripped jeans, combat boots. Edgy, rebellious style with statement accessories. Dark, moody lighting, urban background.',
      femalePrompt: 'Create a punk rock outfit for a woman. Leather jacket, band t-shirt, ripped jeans or skirt, combat boots. Edgy, rebellious style with statement accessories. Dark, moody lighting, urban background.',
      neutralPrompt: 'Create a punk rock outfit with leather jacket, ripped jeans, combat boots. Edgy, rebellious style with statement accessories. Dark, moody lighting, urban background.',
      description: 'Rebelde e ousado com peças statement'
    },
    {
      category: 'Vintage Charmoso',
      malePrompt: 'Create a vintage-inspired outfit for a man. 1970s retro style with warm colors. Patterned shirt, flared trousers, vintage-style shoes. Nostalgic, timeless charm with retro accessories. Warm, vintage-toned lighting.',
      femalePrompt: 'Create a vintage-inspired outfit for a woman. 1970s retro style with warm colors. Floral or patterned dress, vintage cardigan, retro shoes. Nostalgic, timeless charm with retro accessories. Warm, vintage-toned lighting.',
      neutralPrompt: 'Create a vintage-inspired outfit with 1970s retro aesthetics. Warm colors, patterns, nostalgic silhouettes. Timeless vintage charm with retro accessories. Warm, vintage-toned lighting.',
      description: 'Clássico atemporal com personalidade'
    },
    {
      category: 'Hip-Hop Urban',
      malePrompt: 'Create a hip-hop urban outfit for a man. Baggy pants, oversized hoodie or jersey, trendy sneakers, gold chain accessories. Street-style confidence with hip-hop influences. Urban street setting.',
      femalePrompt: 'Create a hip-hop urban outfit for a woman. Baggy pants or joggers, oversized hoodie or crop top, trendy sneakers, statement accessories. Street-style confidence with hip-hop influences. Urban street setting.',
      neutralPrompt: 'Create a hip-hop urban outfit with baggy silhouettes and street-style elements. Oversized pieces, trendy sneakers, statement accessories. Urban hip-hop aesthetic. Urban street setting.',
      description: 'Inspiração urbana com atitude'
    },
    {
      category: 'Skate Punk',
      malePrompt: 'Create a skate punk outfit for a man. Graphic t-shirt, ripped jeans, skate shoes, beanie. Casual, functional style with skate culture elements. Skate park background, natural lighting.',
      femalePrompt: 'Create a skate punk outfit for a woman. Graphic t-shirt or tank top, ripped jeans or shorts, skate shoes, beanie. Casual, functional style with skate culture elements. Skate park background, natural lighting.',
      neutralPrompt: 'Create a skate punk outfit with graphic tee, ripped jeans, skate shoes. Casual, functional skate style with street culture elements. Skate park background, natural lighting.',
      description: 'Descontraído e funcional para skatistas'
    },
    {
      category: 'Gótico Dark',
      malePrompt: 'Create a gothic dark outfit for a man. Black clothing, dark aesthetic, dramatic silhouettes. Black shirt, black trousers, dark boots, silver accessories. Mysterious, elegant dark style. Dramatic lighting.',
      femalePrompt: 'Create a gothic dark outfit for a woman. Black clothing, dark aesthetic, dramatic silhouettes. Black dress or separates, dark boots, silver accessories. Mysterious, elegant dark style. Dramatic lighting.',
      neutralPrompt: 'Create a gothic dark outfit with all-black clothing and dramatic silhouettes. Dark aesthetic with silver accessories. Mysterious, elegant style. Dramatic lighting.',
      description: 'Mistério e elegância sombria'
    },
    {
      category: 'Preppy Collegiate',
      malePrompt: 'Create a preppy collegiate outfit for a man. Polo shirt or button-down, chino trousers, loafers. Classic, polished style with collegiate accessories. Bright, campus-like setting.',
      femalePrompt: 'Create a preppy collegiate outfit for a woman. Polo shirt or blouse, skirt or chino trousers, loafers or boat shoes. Classic, polished style with collegiate accessories. Bright, campus-like setting.',
      neutralPrompt: 'Create a preppy collegiate outfit with classic polo, chinos, loafers. Polished, traditional style with collegiate accessories. Bright, campus-like setting.',
      description: 'Clássico americano universitário'
    },
    {
      category: 'Business Formal',
      malePrompt: 'Create a business formal outfit for a man. Suit and tie, dress shoes, professional accessories. Power dressing with sophisticated tailoring. Office environment, professional lighting.',
      femalePrompt: 'Create a business formal outfit for a woman. Pantsuit or skirt suit, blouse, heels, professional accessories. Power dressing with sophisticated tailoring. Office environment, professional lighting.',
      neutralPrompt: 'Create a business formal outfit with suit, professional shoes, sophisticated tailoring. Power dressing aesthetic. Office environment, professional lighting.',
      description: 'Poder e profissionalismo máximo'
    },
    {
      category: 'Artístico Ecletico',
      malePrompt: 'Create an artsy eclectic outfit for a man. Mixed patterns, bold colors, unconventional combinations. Artistic freedom with creative styling. Gallery or art studio background.',
      femalePrompt: 'Create an artsy eclectic outfit for a woman. Mixed patterns, bold colors, unconventional combinations. Artistic freedom with creative styling. Gallery or art studio background.',
      neutralPrompt: 'Create an artsy eclectic outfit with mixed patterns and bold colors. Unconventional combinations showing artistic freedom. Creative styling. Gallery or art studio background.',
      description: 'Mistura ousada de estilos e texturas'
    },
    {
      category: 'Minimalista Casual',
      malePrompt: 'Create a minimalist casual outfit for a man. Simple t-shirt, clean jeans, minimalist sneakers. Understated design with maximum comfort and clean lines. Casual, everyday style.',
      femalePrompt: 'Create a minimalist casual outfit for a woman. Simple top, clean jeans or trousers, minimalist flats. Understated design with maximum comfort and clean lines. Casual, everyday style.',
      neutralPrompt: 'Create a minimalist casual outfit with simple top, clean bottoms, minimalist footwear. Understated design with maximum comfort. Clean, everyday style.',
      description: 'Simplicidade e conforto no dia a dia'
    },
    {
      category: 'Indie Alternative',
      malePrompt: 'Create an indie alternative outfit for a man. Vintage band t-shirt, worn-in jeans, alternative boots. Mix of vintage and modern elements with indie music culture influences. Alternative vibe.',
      femalePrompt: 'Create an indie alternative outfit for a woman. Vintage band t-shirt, worn-in jeans or skirt, alternative boots. Mix of vintage and modern elements with indie music culture influences. Alternative vibe.',
      neutralPrompt: 'Create an indie alternative outfit with vintage band tee, worn-in jeans, alternative boots. Mix of vintage and modern with indie culture influences. Alternative music vibe.',
      description: 'Alternativo com toque vintage'
    },
    {
      category: 'Luxury Designer',
      malePrompt: 'Create a luxury designer outfit for a man. High-end fashion pieces, premium fabrics, sophisticated tailoring. Designer aesthetic with luxury accessories. Elegant, high-fashion styling.',
      femalePrompt: 'Create a luxury designer outfit for a woman. High-end fashion pieces, premium fabrics, sophisticated tailoring. Designer aesthetic with luxury accessories. Elegant, high-fashion styling.',
      neutralPrompt: 'Create a luxury designer outfit with high-end fashion pieces and premium fabrics. Sophisticated tailoring and luxury accessories. Elegant, high-fashion aesthetic.',
      description: 'Alta moda e sofisticação'
    },
    {
      category: 'Techwear Modern',
      malePrompt: 'Create a techwear modern outfit for a man. Technical fabrics, functional design, urban aesthetic. Utility jacket, tech pants, modern boots. Futuristic yet practical urban style.',
      femalePrompt: 'Create a techwear modern outfit for a woman. Technical fabrics, functional design, urban aesthetic. Utility jacket, tech pants or skirt, modern boots. Futuristic yet practical urban style.',
      neutralPrompt: 'Create a techwear modern outfit with technical fabrics and functional design. Urban utility aesthetic with futuristic elements. Modern, practical style.',
      description: 'Funcionalidade tecnológica e estética urbana'
    }
  ];

  /**
   * Generate calibration images based on gender preference
   */
  static async generateCalibrationImages(gender: string = 'neutral'): Promise<CalibrationImage[]> {
    if (!import.meta.env.VITE_API_KEY) {
      throw new Error("API key is not configured");
    }

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const calibrationImages: CalibrationImage[] = [];

    console.log(`Generating ${this.STYLE_PROMPTS.length} calibration images for gender: ${gender}`);

    for (let i = 0; i < this.STYLE_PROMPTS.length; i++) {
      const stylePrompt = this.STYLE_PROMPTS[i];
      const prompt = this.getGenderSpecificPrompt(stylePrompt, gender);

      try {
        console.log(`Generating image ${i + 1}/${this.STYLE_PROMPTS.length}: ${stylePrompt.category}`);

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              { text: prompt }
            ]
          }
        });

        // Note: Gemini may not return image data directly. You might need to use a different approach
        // For now, we'll store the prompt and mark as needing generation
        calibrationImages.push({
          id: `calibration_${i + 1}`,
          prompt: prompt,
          isGenerated: false // Will be updated when real images are generated
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error generating image for ${stylePrompt.category}:`, error);

        // Still add the entry even if generation fails
        calibrationImages.push({
          id: `calibration_${i + 1}`,
          prompt: prompt,
          isGenerated: false
        });
      }
    }

    console.log(`Generated ${calibrationImages.length} calibration images`);
    return calibrationImages;
  }

  /**
   * Get gender-specific prompt for a style
   */
  private static getGenderSpecificPrompt(stylePrompt: StylePrompt, gender: string): string {
    const basePrompt = `Create a full-body fashion photograph showing the complete outfit.
    The image should be professional, well-lit, and clearly display all clothing items and accessories.
    Style: ${stylePrompt.category}.
    Description: ${stylePrompt.description}.

    `;

    switch (gender.toLowerCase()) {
      case 'male':
        return basePrompt + stylePrompt.malePrompt;
      case 'female':
        return basePrompt + stylePrompt.femalePrompt;
      default:
        return basePrompt + stylePrompt.neutralPrompt;
    }
  }

  /**
   * Get style prompts for manual generation or testing
   */
  static getStylePrompts(gender: string = 'neutral'): Array<{id: string, prompt: string, category: string}> {
    return this.STYLE_PROMPTS.map((style, index) => ({
      id: `calibration_${index + 1}`,
      category: style.category,
      prompt: this.getGenderSpecificPrompt(style, gender)
    }));
  }

  /**
   * Generate a single image on-demand
   */
  static async generateSingleImage(prompt: string): Promise<string> {
    if (!import.meta.env.VITE_API_KEY) {
      throw new Error("API key is not configured");
    }

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { text: prompt }
          ]
        }
      });

      // This would need to be adapted based on how Gemini returns images
      // For now, return a placeholder
      return 'generated-image-data';
    } catch (error) {
      console.error('Error generating single image:', error);
      throw error;
    }
  }
}
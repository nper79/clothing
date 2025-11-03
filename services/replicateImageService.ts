import Replicate from "replicate";

export interface CalibrationImage {
  id: string;
  prompt: string;
  imageData?: string;
  isGenerated: boolean;
  error?: string;
}

interface StylePrompt {
  category: string;
  malePrompt: string;
  femalePrompt: string;
  neutralPrompt: string;
  description: string;
}

export class ReplicateImageService {
  private static readonly REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;
  private static replicate: Replicate | null = null;

  // Initialize Replicate client
  private static getClient(): Replicate {
    if (!this.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is not configured in .env file");
    }

    if (!this.replicate) {
      this.replicate = new Replicate({
        auth: this.REPLICATE_API_TOKEN,
      });
    }

    return this.replicate;
  }

  private static readonly STYLE_PROMPTS: StylePrompt[] = [
    {
      category: 'Minimalista Executivo',
      malePrompt: 'Full body fashion photograph of a man in minimalist executive outfit. Clean lines, neutral colors (white, gray, navy, black), tailored fit. White button-down shirt, slim-fit trousers, minimalist leather shoes. Professional, sophisticated, timeless style. Studio lighting, neutral background, high fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in minimalist executive outfit. Clean lines, neutral colors (white, gray, navy, black), tailored fit. Crisp white blouse, slim-fit trousers or pencil skirt, minimalist pumps. Professional, sophisticated, timeless style. Studio lighting, neutral background, high fashion photography.',
      neutralPrompt: 'Full body fashion photograph in minimalist executive outfit. Clean lines, neutral colors (white, gray, navy, black), tailored fit. Professional and sophisticated style with timeless appeal. Studio lighting, neutral background, high fashion photography.',
      description: 'Look clean e sofisticado para ambiente corporativo'
    },
    {
      category: 'Streetwear Urbano',
      malePrompt: 'Full body fashion photograph of a man in streetwear urban outfit. Hoodie or graphic t-shirt, baggy jeans or cargo pants, trendy sneakers. Modern urban style with contemporary accessories. Urban setting, dynamic lighting, street style photography.',
      femalePrompt: 'Full body fashion photograph of a woman in streetwear urban outfit. Crop top or oversized hoodie, high-waisted jeans or cargo pants, trendy sneakers. Modern urban style with contemporary accessories. Urban setting, dynamic lighting, street style photography.',
      neutralPrompt: 'Full body fashion photograph in streetwear urban outfit. Hoodies, graphic tees, baggy jeans, trendy sneakers. Modern urban aesthetic with dynamic accessories. Urban setting, dynamic lighting, street style photography.',
      description: 'Estilo descontraído com influência urbana'
    },
    {
      category: 'Boêmio Artístico',
      malePrompt: 'Full body fashion photograph of a man in bohemian artistic outfit. Flowy fabrics, earth tones, layered look. Loose-fitting shirt, linen trousers, artisanal accessories. Creative, free-spirited style with organic textures. Natural lighting, artistic background, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in bohemian artistic outfit. Flowy maxi dress or layered separates, earth tones, artisanal jewelry. Creative, free-spirited style with organic textures. Natural lighting, artistic background, fashion photography.',
      neutralPrompt: 'Full body fashion photograph in bohemian artistic outfit. Flowy fabrics and earth tones, layered look with artisanal accessories. Creative, free-spirited style with organic textures. Natural lighting, artistic background.',
      description: 'Expressão livre com toques orgânicos'
    },
    {
      category: 'Punk Rock Attitude',
      malePrompt: 'Full body fashion photograph of a man in punk rock outfit. Leather jacket, band t-shirt, ripped jeans, combat boots. Edgy, rebellious style with statement accessories. Dark, moody lighting, urban background, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in punk rock outfit. Leather jacket, band t-shirt, ripped jeans or skirt, combat boots. Edgy, rebellious style with statement accessories. Dark, moody lighting, urban background, fashion photography.',
      neutralPrompt: 'Full body fashion photograph in punk rock outfit. Leather jacket, ripped jeans, combat boots. Edgy, rebellious style with statement accessories. Dark, moody lighting, urban background.',
      description: 'Rebelde e ousado com peças statement'
    },
    {
      category: 'Vintage Charmoso',
      malePrompt: 'Full body fashion photograph of a man in vintage 1970s inspired outfit. Patterned shirt, flared trousers, vintage-style shoes. Nostalgic, timeless charm with retro accessories. Warm, vintage-toned lighting, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in vintage 1970s inspired outfit. Floral or patterned dress, vintage cardigan, retro shoes. Nostalgic, timeless charm with retro accessories. Warm, vintage-toned lighting, fashion photography.',
      neutralPrompt: 'Full body fashion photograph in vintage 1970s inspired outfit. Warm colors, patterns, nostalgic silhouettes. Timeless vintage charm with retro accessories. Warm, vintage-toned lighting.',
      description: 'Clássico atemporal com personalidade'
    },
    {
      category: 'Hip-Hop Urban',
      malePrompt: 'Full body fashion photograph of a man in hip-hop urban outfit. Baggy pants, oversized hoodie or jersey, trendy sneakers, gold chain accessories. Street-style confidence with hip-hop influences. Urban street setting, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in hip-hop urban outfit. Baggy pants or joggers, oversized hoodie or crop top, trendy sneakers, statement accessories. Street-style confidence with hip-hop influences. Urban street setting, fashion photography.',
      neutralPrompt: 'Full body fashion photograph in hip-hop urban outfit. Baggy silhouettes and street-style elements. Oversized pieces, trendy sneakers, statement accessories. Urban hip-hop aesthetic, street setting.',
      description: 'Inspiração urbana com atitude'
    },
    {
      category: 'Skate Punk',
      malePrompt: 'Full body fashion photograph of a man in skate punk outfit. Graphic t-shirt, ripped jeans, skate shoes, beanie. Casual, functional style with skate culture elements. Skate park background, natural lighting, action photography.',
      femalePrompt: 'Full body fashion photograph of a woman in skate punk outfit. Graphic t-shirt or tank top, ripped jeans or shorts, skate shoes, beanie. Casual, functional style with skate culture elements. Skate park background, natural lighting.',
      neutralPrompt: 'Full body fashion photograph in skate punk outfit. Graphic tee, ripped jeans, skate shoes. Casual, functional skate style with street culture elements. Skate park background, natural lighting.',
      description: 'Descontraído e funcional para skatistas'
    },
    {
      category: 'Gótico Dark',
      malePrompt: 'Full body fashion photograph of a man in gothic dark outfit. All black clothing, dramatic silhouettes. Black shirt, black trousers, dark boots, silver accessories. Mysterious, elegant dark style. Dramatic lighting, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in gothic dark outfit. All black clothing, dramatic silhouettes. Black dress or separates, dark boots, silver accessories. Mysterious, elegant dark style. Dramatic lighting.',
      neutralPrompt: 'Full body fashion photograph in gothic dark outfit. All-black clothing and dramatic silhouettes. Dark aesthetic with silver accessories. Mysterious, elegant style. Dramatic lighting.',
      description: 'Mistério e elegância sombria'
    },
    {
      category: 'Preppy Collegiate',
      malePrompt: 'Full body fashion photograph of a man in preppy collegiate outfit. Polo shirt or button-down, chino trousers, loafers. Classic, polished style with collegiate accessories. Bright, campus-like setting, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in preppy collegiate outfit. Polo shirt or blouse, skirt or chino trousers, loafers or boat shoes. Classic, polished style with collegiate accessories. Bright, campus-like setting.',
      neutralPrompt: 'Full body fashion photograph in preppy collegiate outfit. Classic polo, chinos, loafers. Polished, traditional style with collegiate accessories. Bright, campus-like setting.',
      description: 'Clássico americano universitário'
    },
    {
      category: 'Business Formal',
      malePrompt: 'Full body fashion photograph of a man in business formal outfit. Well-tailored suit and tie, dress shoes, professional accessories. Power dressing with sophisticated tailoring. Office environment, professional lighting, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in business formal outfit. Pantsuit or skirt suit, blouse, heels, professional accessories. Power dressing with sophisticated tailoring. Office environment, professional lighting.',
      neutralPrompt: 'Full body fashion photograph in business formal outfit. Suit, professional shoes, sophisticated tailoring. Power dressing aesthetic. Office environment, professional lighting.',
      description: 'Poder e profissionalismo máximo'
    },
    {
      category: 'Artístico Ecletico',
      malePrompt: 'Full body fashion photograph of a man in artsy eclectic outfit. Mixed patterns, bold colors, unconventional combinations. Artistic freedom with creative styling. Gallery or art studio background, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in artsy eclectic outfit. Mixed patterns, bold colors, unconventional combinations. Artistic freedom with creative styling. Gallery or art studio background.',
      neutralPrompt: 'Full body fashion photograph in artsy eclectic outfit. Mixed patterns and bold colors. Unconventional combinations showing artistic freedom. Creative styling. Gallery or art studio background.',
      description: 'Mistura ousada de estilos e texturas'
    },
    {
      category: 'Minimalista Casual',
      malePrompt: 'Full body fashion photograph of a man in minimalist casual outfit. Simple t-shirt, clean jeans, minimalist sneakers. Understated design with maximum comfort and clean lines. Casual, everyday style, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in minimalist casual outfit. Simple top, clean jeans or trousers, minimalist flats. Understated design with maximum comfort and clean lines. Casual, everyday style.',
      neutralPrompt: 'Full body fashion photograph in minimalist casual outfit. Simple top, clean bottoms, minimalist footwear. Understated design with maximum comfort. Clean, everyday style.',
      description: 'Simplicidade e conforto no dia a dia'
    },
    {
      category: 'Indie Alternative',
      malePrompt: 'Full body fashion photograph of a man in indie alternative outfit. Vintage band t-shirt, worn-in jeans, alternative boots. Mix of vintage and modern elements with indie music culture influences. Alternative vibe, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in indie alternative outfit. Vintage band t-shirt, worn-in jeans or skirt, alternative boots. Mix of vintage and modern elements with indie music culture influences. Alternative vibe.',
      neutralPrompt: 'Full body fashion photograph in indie alternative outfit. Vintage band tee, worn-in jeans, alternative boots. Mix of vintage and modern with indie culture influences. Alternative music vibe.',
      description: 'Alternativo com toque vintage'
    },
    {
      category: 'Luxury Designer',
      malePrompt: 'Full body fashion photograph of a man in luxury designer outfit. High-end fashion pieces, premium fabrics, sophisticated tailoring. Designer aesthetic with luxury accessories. Elegant, high-fashion styling, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in luxury designer outfit. High-end fashion pieces, premium fabrics, sophisticated tailoring. Designer aesthetic with luxury accessories. Elegant, high-fashion styling.',
      neutralPrompt: 'Full body fashion photograph in luxury designer outfit. High-end fashion pieces and premium fabrics. Sophisticated tailoring and luxury accessories. Elegant, high-fashion aesthetic.',
      description: 'Alta moda e sofisticação'
    },
    {
      category: 'Techwear Modern',
      malePrompt: 'Full body fashion photograph of a man in techwear modern outfit. Technical fabrics, functional design, urban aesthetic. Utility jacket, tech pants, modern boots. Futuristic yet practical urban style, fashion photography.',
      femalePrompt: 'Full body fashion photograph of a woman in techwear modern outfit. Technical fabrics, functional design, urban aesthetic. Utility jacket, tech pants or skirt, modern boots. Futuristic yet practical urban style.',
      neutralPrompt: 'Full body fashion photograph in techwear modern outfit. Technical fabrics and functional design. Urban utility aesthetic with futuristic elements. Modern, practical style.',
      description: 'Funcionalidade tecnológica e estética urbana'
    }
  ];

  /**
   * Generate calibration images using Replicate API
   */
  static async generateCalibrationImages(gender: string = 'neutral'): Promise<CalibrationImage[]> {
    const calibrationImages: CalibrationImage[] = [];
    const client = this.getClient();

    console.log(`Generating ${this.STYLE_PROMPTS.length} calibration images using Replicate for gender: ${gender}`);

    // Using Stable Diffusion XL for high-quality fashion images
    const model = "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4";

    for (let i = 0; i < this.STYLE_PROMPTS.length; i++) {
      const stylePrompt = this.STYLE_PROMPTS[i];
      const prompt = this.getGenderSpecificPrompt(stylePrompt, gender);

      try {
        console.log(`Generating image ${i + 1}/${this.STYLE_PROMPTS.length}: ${stylePrompt.category}`);

        const output = await client.run(model, {
          input: {
            prompt: prompt,
            width: 512,
            height: 768,
            num_outputs: 1,
            num_inference_steps: 25,
            guidance_scale: 7.5,
            negative_prompt: "blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, missing limbs, watermark, text, signature",
            scheduler: "DPMSolverMultistep"
          }
        });

        // Handle different Replicate response formats
        let imageUrl = "";
        if (Array.isArray(output)) {
          imageUrl = output[0];
        } else if (typeof output === 'object' && output !== null) {
          // Check if it's a URL string or has url property
          imageUrl = (output as any)?.url || (output as any)?.[0] || "";
        } else if (typeof output === 'string') {
          imageUrl = output;
        }

        calibrationImages.push({
          id: `calibration_${i + 1}`,
          prompt: prompt,
          imageData: imageUrl,
          isGenerated: !!imageUrl
        });

        console.log(`✅ Generated image for ${stylePrompt.category}`);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error generating image for ${stylePrompt.category}:`, error);

        calibrationImages.push({
          id: `calibration_${i + 1}`,
          prompt: prompt,
          isGenerated: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Generated ${calibrationImages.filter(img => img.isGenerated).length} successful calibration images`);
    return calibrationImages;
  }

  /**
   * Generate a single image on-demand using Replicate
   */
  static async generateSingleImage(prompt: string): Promise<string> {
    const client = this.getClient();
    const model = "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4";

    try {
      const output = await client.run(model, {
        input: {
          prompt: prompt,
          width: 512,
          height: 768,
          num_outputs: 1,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          negative_prompt: "blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, missing limbs, watermark, text, signature",
          scheduler: "DPMSolverMultistep"
        }
      });

      let imageUrl = "";
      if (Array.isArray(output)) {
        imageUrl = output[0];
      } else if (typeof output === 'object' && output !== null) {
        imageUrl = (output as any)?.url || (output as any)?.[0] || "";
      } else if (typeof output === 'string') {
        imageUrl = output;
      }

      return imageUrl;
    } catch (error) {
      console.error('Error generating single image:', error);
      throw error;
    }
  }

  /**
   * Get gender-specific prompt for a style
   */
  private static getGenderSpecificPrompt(stylePrompt: StylePrompt, gender: string): string {
    switch (gender.toLowerCase()) {
      case 'male':
        return stylePrompt.malePrompt;
      case 'female':
        return stylePrompt.femalePrompt;
      default:
        return stylePrompt.neutralPrompt;
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
   * Check if Replicate API is properly configured
   */
  static isConfigured(): boolean {
    return !!this.REPLICATE_API_TOKEN;
  }

  /**
   * Get current API usage estimate (basic implementation)
   */
  static getUsageEstimate(): { imagesGenerated: number; estimatedCost: number } {
    // This would need to be implemented with actual usage tracking
    // Stable Diffusion XL costs approximately $0.018 per image
    return {
      imagesGenerated: 0,
      estimatedCost: 0
    };
  }
}
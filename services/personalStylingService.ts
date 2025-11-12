import { ComprehensivePromptLibrary, ComprehensiveLook } from './comprehensivePromptLibrary';
import type { PersonalLook, UserPreferences } from '../types/personalStyling';

export type { PersonalLook, UserPreferences } from '../types/personalStyling';

const PERSONALIZED_LOOKS_ENDPOINT = '/api/personalized-looks';

const getApiEndpoint = (path: string): string => {
  const base = import.meta.env.VITE_PERSONAL_STYLING_API_URL;
  if (base && typeof base === 'string' && base.trim().length > 0) {
    return `${base.replace(/\/$/, '')}${path}`;
  }
  return path;
};

export class PersonalStylingService {
  private static getPersonalizedLooksUrl(): string {
    return getApiEndpoint(PERSONALIZED_LOOKS_ENDPOINT);
  }

  /**
   * Frontend-only generate personalized looks using Replicate API directly
   * This bypasses the backend API and uses our frontend workflow
   */
  static async generatePersonalizedLooksFrontend(
    userPhotoUrl: string,
    gender: 'male' | 'female',
    userPreferences?: UserPreferences,
    onProgress?: (current: number, total: number, currentLook: string) => void
  ): Promise<PersonalLook[]> {
    console.log('🎯 Using frontend-only workflow for personal styling');

    // Import here to avoid circular dependencies
    const { ComprehensivePromptLibrary } = await import('./comprehensivePromptLibrary');

    const allLooks = ComprehensivePromptLibrary.getBalancedSelection(gender);
    const desiredCount = Number(import.meta.env.VITE_PERSONAL_LOOK_LIMIT ?? '') || 4;
    const selectedLooks = allLooks.slice(0, Math.max(1, Math.min(desiredCount, allLooks.length)));
    const total = selectedLooks.length;
    const personalLooks: PersonalLook[] = [];

    console.log(`🚀 Generating ${total} personalized looks for ${gender} (LIMITED TO 1 FOR TESTING!)`);

    for (let i = 0; i < selectedLooks.length; i++) {
      const look = selectedLooks[i];

      // Update progress
      if (onProgress) {
        onProgress(i + 1, total, look.name);
      }

      try {
        console.log(`🎨 Generating personalized look for ${look.name} (${i + 1}/${total})`);

        // Step 1: Generate personalized edit prompt with Claude 4.5
        console.log('📝 Step 1: Generating edit prompt...');
        const editPrompt = await this.generatePersonalizedEditPrompt(look.prompt, userPreferences);
        console.log(`✅ Edit prompt generated: ${editPrompt.substring(0, 100)}...`);

        // Step 2: Edit user's photo with reve/edit-fast
        console.log('🖼️ Step 2: Starting photo editing with reve/edit-fast...');
        const styledPhotoUrl = await this.editPhotoWithReve(userPhotoUrl, editPrompt);
        console.log(`✅ Photo editing completed: ${styledPhotoUrl ? 'Success' : 'Failed'}`);

        const personalLook: PersonalLook = {
          id: `personal_${look.id}_${Date.now()}`,
          lookId: look.id,
          name: look.name,
          category: look.category,
          level: look.level,
          originalPrompt: look.prompt,
          editPrompt,
          originalPhotoUrl: userPhotoUrl,
          styledPhotoUrl,
          isGenerated: !!styledPhotoUrl,
          generatedAt: new Date()
        };

        if (personalLook.isGenerated) {
          personalLooks.push(personalLook);
          console.log(`✅ Successfully generated: ${look.name}`);
        } else {
          console.log(`❌ Failed to generate: ${look.name}`);
        }

        // Small delay to avoid rate limiting
        if (i < selectedLooks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ Error generating look for ${look.name}:`, error);

        // Add failed look to results
        personalLooks.push({
          id: `personal_${look.id}_${Date.now()}`,
          lookId: look.id,
          name: look.name,
          category: look.category,
          level: look.level,
          originalPrompt: look.prompt,
          editPrompt: '',
          originalPhotoUrl: userPhotoUrl,
          styledPhotoUrl: undefined,
          isGenerated: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          generatedAt: new Date()
        });
      }
    }

    console.log(`🎉 Personalized looks generation completed: ${personalLooks.filter((look) => look.isGenerated).length}/${total} successful`);
    return personalLooks;
  }

  /**
   * Generate personalized looks for user by delegating to the backend pipeline
   */
  static async generatePersonalizedLooks(
    userPhotoUrl: string,
    gender: 'male' | 'female',
    userPreferences?: UserPreferences,
    onProgress?: (current: number, total: number, currentLook: string) => void
  ): Promise<PersonalLook[]> {
    const allLooks = ComprehensivePromptLibrary.getBalancedSelection(gender);
    const desiredCount = Number(import.meta.env.VITE_PERSONAL_LOOK_LIMIT ?? '') || 4;
    const selectedLooks = allLooks.slice(0, Math.max(1, Math.min(desiredCount, allLooks.length)));
    const total = selectedLooks.length;

    if (total === 0) {
      return [];
    }

    console.log(`[PersonalStylingService] Requesting ${total} personalized look(s) for ${gender}`);
    if (onProgress) {
      onProgress(1, total, selectedLooks[0].name);
    }

    try {
      const response = await fetch(this.getPersonalizedLooksUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userPhoto: userPhotoUrl,
          gender,
          userPreferences,
          limit: total,
          lookIds: selectedLooks.map((look) => look.id)
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Backend responded with ${response.status}`);
      }

      const payload = await response.json() as { looks?: Array<Omit<PersonalLook, 'generatedAt'> & { generatedAt?: string | Date }> };
      const looks = Array.isArray(payload?.looks) ? payload.looks : [];

      const normalized: PersonalLook[] = looks.map((look) => ({
        ...look,
        generatedAt: look.generatedAt ? new Date(look.generatedAt) : new Date()
      }));

      const sortedLooks = [...normalized].sort((a, b) => {
        if (a.isGenerated && !b.isGenerated) return -1;
        if (!a.isGenerated && b.isGenerated) return 1;
        return 0;
      });

      sortedLooks.forEach((look, index) => {
        if (onProgress) {
          onProgress(Math.min(index + 1, total), total, look.name);
        }
      });

      console.log(`[PersonalStylingService] Generation completed: ${sortedLooks.filter((look) => look.isGenerated).length}/${total} successful`);
      return sortedLooks;
    } catch (error) {
      console.error('[PersonalStylingService] Error generating looks via backend:', error);

      return selectedLooks.map((look) => ({
        id: `personal_${look.id}_${Date.now()}`,
        lookId: look.id,
        name: look.name,
        category: look.category,
        level: look.level,
        originalPrompt: look.prompt,
        editPrompt: '',
        originalPhotoUrl: userPhotoUrl,
        styledPhotoUrl: undefined,
        isGenerated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generatedAt: new Date()
      }));
    }
  }

  /**
   * Extract clothing items from look for feedback options
   */
  static extractClothingItems(look: PersonalLook): string[] {
    const items: string[] = [];
    const prompt = look.editPrompt || look.originalPrompt;

    // Common clothing items to extract
    const clothingPatterns = [
      /(\w+\s+(?:blazer|jacket|coat|cardigan|sweater|hoodie|top|shirt|blouse|t[-]?shirt|polo|tank))/gi,
      /(\w+\s+(?:pants|trousers|jeans|leggings|skirt|shorts|dress))/gi,
      /(\w+\s+(?:dress|gown|outfit))/gi,
      /(\w+\s+(?:shoes|boots|sneakers|heels|flats|sandals))/gi,
      /(blazer|jacket|coat|cardigan|sweater|hoodie)/gi,
      /(shirt|blouse|t[-]?shirt|polo|tank|top)/gi,
      /(pants|trousers|jeans|leggings|skirt|shorts)/gi,
      /(dress|gown|outfit)/gi,
      /(shoes|boots|sneakers|heels|flats|sandals)/gi,
      /(belt|bag|purse|hat|scarf|jewelry|accessories)/gi
    ];

    clothingPatterns.forEach(pattern => {
      const matches = prompt.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanItem = match.toLowerCase().trim();
          if (!items.includes(cleanItem)) {
            items.push(cleanItem);
          }
        });
      }
    });

    // Add generic options
    items.push('Fit/Size', 'Colors', 'Overall Style/Vibe', 'Not My Style');

    return [...new Set(items)]; // Remove duplicates
  }

  /**
   * Save user feedback to preferences
   */
  static saveFeedback(
    lookId: string,
    liked: boolean,
    dislikedItems?: string[]
  ): UserPreferences {
    const existingPrefs = this.getUserPreferences();

    const updatedPrefs: UserPreferences = {
      ...existingPrefs,
      fineTuningHistory: [
        ...existingPrefs.fineTuningHistory,
        {
          lookId,
          feedback: dislikedItems || [],
          timestamp: new Date()
        }
      ]
    };

    if (liked) {
      updatedPrefs.likedLooks = [...new Set([...existingPrefs.likedLooks, lookId])];
    } else {
      updatedPrefs.dislikedLooks = [...new Set([...existingPrefs.dislikedLooks, lookId])];

      if (dislikedItems) {
        updatedPrefs.dislikedItems = [...new Set([...existingPrefs.dislikedItems, ...dislikedItems])];
      }
    }

    this.saveUserPreferences(updatedPrefs);
    return updatedPrefs;
  }

  /**
   * Get user preferences from localStorage
   */
  static getUserPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem('personal_styling_preferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }

    return {
      preferredStyles: [],
      dislikedItems: [],
      preferredColors: [],
      preferredFit: [],
      likedLooks: [],
      dislikedLooks: [],
      fineTuningHistory: []
    };
  }

  /**
   * Save user preferences to localStorage
   */
  static saveUserPreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem('personal_styling_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  /**
   * Basic readiness check (legacy helper)
   */
  static isConfigured(): boolean {
    return true;
  }

  /**
   * Clear user preferences
   */
  static clearUserPreferences(): void {
    try {
      localStorage.removeItem('personal_styling_preferences');
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }

  /**
   * Generate personalized edit prompt with Claude 4.5
   */
  private static async generatePersonalizedEditPrompt(
    basePrompt: string,
    userPreferences?: UserPreferences
  ): Promise<string> {
    // Import here to avoid issues
    const Replicate = await import('replicate');

    // Use the customFetch from replicateImageService to handle CORS
    const { customFetch } = await import('./replicateImageService');

    const client = new Replicate.default({
      auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
      fetch: customFetch,
      useFileOutput: false
    });

    const preferencesContext = userPreferences ? `
User Preferences:
- Preferred styles: ${userPreferences.preferredStyles.join(', ')}
- Preferred colors: ${userPreferences.preferredColors.join(', ')}
- Preferred fit: ${userPreferences.preferredFit.join(', ')}
- Disliked items: ${userPreferences.dislikedItems.join(', ')}

Consider these preferences when generating the edit prompt. If user has disliked certain items, avoid including them. If they have preferred styles/colors, incorporate them naturally.
` : '';

    const claudePrompt = `You need to create a detailed edit prompt for the AI image editing model "reve/edit-fast" to transform a person's uploaded photo into a specific fashion style.

Base Style Description: ${basePrompt}
${preferencesContext}

Requirements for the edit prompt:
1. Apply the style to the person in the uploaded photo
2. Be specific about clothing items, colors, patterns, and textures
3. Include accessories, shoes, and overall aesthetic
4. Ensure the result shows only the person from the original photo
5. Make sure all clothing items are clearly visible and well-defined
6. Maintain the person's approximate body shape and features
7. Use fashion terminology that works well with AI image editing
8. If user has preferences, adapt the style accordingly (avoid disliked items)

Output format:
Generate ONLY the optimized edit prompt (no explanations). The prompt should be direct and clear for image editing.

CRITICAL REQUIREMENTS:
- Must be FULL BODY IMAGE from head to toe
- Must clearly show FOOTWEAR/SHOES
- No cropped images, no close-ups
- Complete outfit must be visible including shoes

Example format:
"Make the person wear [detailed clothing description] with [specific footwear/shoes]. Transform into [specific style description]. FULL BODY IMAGE from head to toe, INCLUDING FOOTWEAR/SHOES clearly visible. Maintain the person's natural features. Single person only, solo portrait. Complete outfit from head to toe, shoes must be shown."`;

    try {
      const output = await client.run("anthropic/claude-4.5-sonnet", {
        input: {
          prompt: claudePrompt,
          max_tokens: 1024,
          temperature: 0.7
        }
      });

      let generatedPrompt = "";
      console.log('Raw Claude output:', JSON.stringify(output, null, 2));

      if (Array.isArray(output)) {
        // Join all array elements into a single string - CLAUDE IS RETURNING ARRAY!
        generatedPrompt = output.join(' ');
      } else if (typeof output === 'string') {
        generatedPrompt = output;
      } else if (typeof output === 'object' && output !== null) {
        generatedPrompt = (output as any)?.text || (output as any)?.response || (output as any)?.content || "";
      }

      console.log('Extracted prompt:', generatedPrompt);
      return generatedPrompt.trim();
    } catch (error) {
      console.error('Error generating edit prompt with Claude 4.5:', error);

      // Fallback prompt
      return `Make the person wear ${basePrompt}. FULL BODY IMAGE from head to toe, INCLUDING FOOTWEAR/SHOES clearly visible. Maintain natural features. Single person only, solo portrait. Professional fashion photography style. Complete outfit must be shown including shoes.`;
    }
  }

  /**
   * Edit user's photo using reve/edit-fast model
   */
  private static async editPhotoWithReve(
    userPhotoUrl: string,
    editPrompt: string
  ): Promise<string> {
    const Replicate = await import('replicate');

    // Use the customFetch from replicateImageService to handle CORS
    const { customFetch } = await import('./replicateImageService');

    const client = new Replicate.default({
      auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
      fetch: customFetch,
      useFileOutput: false
    });

    console.log(`🎨 Editing user photo with prompt: "${editPrompt.substring(0, 100)}..."`);
    console.log('📥 User photo URL:', userPhotoUrl);

    try {
      console.log('📋 Preparing image input...');
      // Import the helper function
      const { prepareImageInput } = await import('./replicateImageService');
      const imageInput = await prepareImageInput(userPhotoUrl);

      console.log('✅ Image input prepared:', imageInput instanceof Blob ? 'blob' : typeof imageInput, (imageInput as File)?.size ?? 'n/a');

      console.log('🚀 Starting reve/edit-fast API call...');
      const output = await client.run("reve/edit-fast:f0253eb7b26cc2416ad98c20492fbe4b842e09d808318fdf9e7caeffa9ae78f5", {
        input: {
          image: imageInput,
          prompt: editPrompt
        }
      });

      console.log('✅ reve/edit-fast API call completed, output:', output);

      // Import the helper function
      const { extractImageUrl } = await import('./replicateImageService');
      const imageUrl = extractImageUrl(output);
      console.log('🔗 Extracted edited photo URL:', imageUrl);
      return imageUrl;

    } catch (error) {
      console.error('❌ Error in editPhotoWithReve:', error);
      throw error;
    }
  }

  }







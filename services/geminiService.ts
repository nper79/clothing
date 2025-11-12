import { GoogleGenAI } from "@google/genai";
import type { Answer, Answers, StyleSuggestion, Explanation, DislikedStyle, UserProfile, OutfitMetadata } from '../types';
import { generateStyleThemes, cosineSimilarity } from './preferenceService';
import { ReplicateImageService, StyleCategory } from './replicateImageService';

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const slice = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...slice);
    }
    return btoa(binary);
};

const fetchImageAsBase64 = async (imageUrl: string): Promise<{ base64: string; mimeType: string }> => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${imageUrl}`);
    }
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    return {
        base64: arrayBufferToBase64(buffer),
        mimeType
    };
};

const deriveGenderFromAnswers = (answers: Answers): 'male' | 'female' | 'neutral' => {
    const value = answers?.gender;

    const extract = (answer: Answer): string | null => {
        if (typeof answer === 'string') {
            return answer.toLowerCase();
        }
        if (Array.isArray(answer) && answer.length > 0) {
            const first = answer[0];
            return typeof first === 'string' ? first.toLowerCase() : null;
        }
        return null;
    };

    const normalized = value !== undefined ? extract(value) : null;
    if (!normalized) return 'neutral';

    if (normalized.includes('female') || normalized.includes('feminino') || normalized.includes('woman')) {
        return 'female';
    }
    if (normalized.includes('male') || normalized.includes('masculino') || normalized.includes('man')) {
        return 'male';
    }

    return 'neutral';
};

const buildStyleCategory = (theme: string, answers: Answers): StyleCategory => {
    const baseKeywords = theme
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const styleAnswer = answers?.style;
    const extraKeywords: string[] = [];
    if (typeof styleAnswer === 'string') {
        extraKeywords.push(...styleAnswer.toLowerCase().split(/[,\s]+/));
    } else if (Array.isArray(styleAnswer)) {
        styleAnswer.forEach(item => {
            if (typeof item === 'string') {
                extraKeywords.push(...item.toLowerCase().split(/[,\s]+/));
            }
        });
    }

    const keywords = Array.from(new Set([...baseKeywords, ...extraKeywords])).filter(Boolean).slice(0, 12);
    const targetAudience = deriveGenderFromAnswers(answers);

    return {
        category: theme,
        description: `${theme} inspired look generated from questionnaire preferences`,
        keywords: keywords.length > 0 ? keywords : ['fashion', 'outfit', 'style'],
        targetAudience
    };
};

const fileToGenerativePart = (base64: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64,
            mimeType,
        },
    };
};

export const detectGender = async (userImage: { base64: string; mimeType: string }): Promise<string> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("API key is not configured");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

    const userImagePart = fileToGenerativePart(userImage.base64, userImage.mimeType);

    const genderPrompt = `Look at this person and determine their gender based on visual cues. Respond with ONLY one word: "Male", "Female", or "Cannot determine". Do not provide any explanation.`;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                userImagePart,
                { text: genderPrompt }
            ]
        },
    });

    const response = result.text.trim().toLowerCase();

    if (response.includes('male')) return 'Male';
    if (response.includes('female')) return 'Female';
    return 'Male'; // Default fallback
};

const fitMapping: {[key: number]: string} = {1: 'Very Relaxed', 2: 'Relaxed', 3: 'Standard', 4: 'Tailored', 5: 'Very Tailored'};

const buildImagePrompt = (answers: Answers, styleTheme: string, dislikedStyles: DislikedStyle[], userProfile?: UserProfile): string => {

    let avoidanceInstructions = '';
    if (dislikedStyles && dislikedStyles.length > 0) {
        avoidanceInstructions = `
**IMPORTANT - AVOID THESE STYLES**: The user has previously disliked some styles. Avoid creating anything similar to these descriptions:
${dislikedStyles.map(d => `- A style with the theme "${d.theme}" because: "${d.reason}"`).join('\n')}
Do not generate outfits that match these themes or reasons for dislike. Be creative and generate a *different* and *unique* style.
`;
    }

    // Add dynamic profile-based instructions
    let profileInstructions = '';
    if (userProfile) {
        const { formality, color_neutrality, comfort, trendiness, minimalism } = userProfile.style_vector;

        profileInstructions = `
**USER STYLE PROFILE - ADAPT TO THESE PREFERENCES:**
- Formality Level: ${formality > 0.7 ? 'HIGH - Avoid overly casual looks' : formality < 0.3 ? 'LOW - Stick to casual, relaxed styles' : 'MODERATE - Balanced between casual and formal'}
- Color Neutrality: ${color_neutrality > 0.7 ? 'HIGH - Use neutral, muted tones' : color_neutrality < 0.3 ? 'LOW - Use vibrant, bold colors' : 'MODERATE - Mix of neutral and accent colors'}
- Comfort Priority: ${comfort > 0.7 ? 'VERY HIGH - Prioritize comfort above all' : 'MODERATE - Balance style with comfort'}
- Trendiness: ${trendiness > 0.7 ? 'HIGH - Use current fashion trends' : trendiness < 0.3 ? 'LOW - Use timeless, classic styles' : 'MODERATE - Mix of classic and trendy elements'}
- Minimalism: ${minimalism > 0.7 ? 'HIGH - Keep it simple and clean' : minimalism < 0.3 ? 'LOW - More is better, detailed and layered' : 'MODERATE - Balanced simplicity and detail'}
- **Preferred Colors**: ${userProfile.liked_colors.length > 0 ? userProfile.liked_colors.join(', ') : 'Open to various colors'}
- **Colors to Avoid**: ${userProfile.disliked_colors.length > 0 ? userProfile.disliked_colors.join(', ') : 'None'}
`;
    }

    const prompt = `
You are a professional AI fashion stylist and photo editor. Your task is to edit the user-provided photo.

**Primary Goal: Edit the photo by replacing the clothing and background.**

${avoidanceInstructions}

${profileInstructions}

**CRITICAL RULES (NON-NEGOTIABLE):**
1.  **FULL BODY VIEW - ABSOLUTELY MANDATORY**: THIS IS THE MOST IMPORTANT RULE. The image **MUST** show the person's COMPLETE BODY from HEAD TO TOES. The entire outfit, INCLUDING SHOES/FOOTWEAR, must be clearly visible. DO NOT CROP at the ankles, feet, knees, or any body part. The feet and shoes must be fully visible at the bottom of the image. Use full-length framing that captures the entire figure. THIS IS CRITICAL - FAILURE TO SHOW FULL BODY INCLUDING FEET IS UNACCEPTABLE.
2.  **FACE LIKENESS IS #1 PRIORITY**: The person's face in the generated image MUST be an exact match to the original photo. Do not alter their facial features, hair, or expression. It must be an ultra-realistic, 99% match.
3.  **PROFESSIONAL PHOTOSHOOT POSE**: Position the person in a professional magazine-style photoshoot pose. They should NOT be in the same pose as their original uploaded photo. Use dynamic, fashion-forward poses - arms crossed, one leg forward, confident stance, walking pose, leaning against wall, hands in pockets, or editorial magazine poses. **CRITICAL: NEVER USE HANDS ON HIP/HANDS ON WAIST POSES FOR MALES - these poses should never be used.** The pose should look like it's from Vogue, Elle, or GQ magazine.
4.  **COMPLETELY NEW OUTFIT**: The person MUST wear a completely new outfit based on the theme: **"${styleTheme}"**.
    - DO NOT use any clothing items they are wearing in their original photo.
    - This should be a complete transformation with new top, bottom, shoes, and accessories.
    - Incorporate these user preferences:
      - Vibe: ${answers.perception || 'any'}
      - **Color Palette**: ${userProfile && userProfile.liked_colors.length > 0
        ? `The user has shown preference for: ${userProfile.liked_colors.join(', ')}. Build the outfit around these colors, with complementary accents.`
        : `The user's preferred colors are: ${answers.colors || 'any'}. Use these as a starting point, but your primary goal is to create a **bold, stylish, and visually interesting outfit**. Be creatively adventurous. Introduce unexpected, complementary, or vibrant accent colors. For example, if the user likes black and grey, introduce a pop of color like a burgundy scarf, an olive green jacket, or even brightly colored sneakers. Push the boundaries beyond their safe choices.`
      }
      - Fit: ${fitMapping[answers.fit as number] || 'Standard'}
      - Notes: ${answers.constraints || 'None'}
5.  **HIGH-END FASHION PHOTOSHOOT BACKGROUND**: Place the person in a premium magazine-style photoshoot environment. Examples: luxury hotel lobby, high-fashion studio with seamless paper, urban architectural setting, minimalist concrete walls, art gallery, designer boutique, or exotic location. The background should complement the outfit and look professional.
6.  **OUTPUT**: The final image must be photorealistic, high-resolution, and look like it's from a professional fashion magazine editorial.
`;
    return prompt.trim();
};

const buildExplanationPrompt = (answers: Answers): string => {
    const prompt = `
You are an expert personal stylist. Analyze the outfit in the provided image and explain why it's a great choice for the user based on their style profile below.

**User's Style Profile:**
- Occasions: ${answers.occasion || 'Not specified'}
- Desired Perception: ${answers.perception || 'Not specified'}
- Favorite Colors: ${answers.colors || 'Not specified'}
- Preferred Fit: ${fitMapping[answers.fit as number] || 'Standard'}
- Effort Level: ${answers.effort || 'Not specified'}
- Constraints: ${answers.constraints || 'None'}

**Your Task:**
Provide a detailed analysis of the outfit. Your response MUST be in the following format, with each field on a new line, using "::" as a separator. Do not use markdown.

Title:: [Give the look a catchy name, e.g., "The Modern Classic"]
WhyItWorks:: [A paragraph explaining why this look is a great match for the user, linking back to their preferences like comfort, color palette, and desired perception.]
Occasions:: [List 2-3 specific occasions this outfit is perfect for, e.g., "Casual Fridays, Weekend Brunch, Creative Meetings"]
PreferredFit:: [Comment on the fit shown in the image, e.g., "Relaxed but tailored"]
Constraints:: [Acknowledge any user constraints, e.g., "Prefers natural fabrics"]
`;
    return prompt.trim();
}

const parseExplanation = (text: string): Explanation => {
    const lines = text.split('\n');
    const explanation: Partial<Explanation> = {};

    lines.forEach(line => {
        const parts = line.split('::');
        if (parts.length === 2) {
            const key = parts[0].trim().toLowerCase();
            const value = parts[1].trim();
            
            if(key.startsWith('title')) explanation.title = value;
            if(key.startsWith('whyitworks')) explanation.whyItWorks = value;
            if(key.startsWith('occasions')) explanation.occasions = value;
            if(key.startsWith('preferredfit')) explanation.preferredFit = value;
            if(key.startsWith('constraints')) explanation.constraints = value;
        }
    });

    return {
        title: explanation.title || 'Your New Look',
        whyItWorks: explanation.whyItWorks || 'This is a great look for you!',
        occasions: explanation.occasions || 'Versatile for many events.',
        preferredFit: explanation.preferredFit || 'Fits well.',
        constraints: explanation.constraints || 'Meets your needs.',
    };
}


export const generateStyleSuggestions = async (
    answers: Answers,
    _userImage: { base64: string; mimeType: string; },
    dislikedStyles: DislikedStyle[] = [],
    userProfile?: UserProfile,
    maxSuggestions: number = 3
): Promise<StyleSuggestion[]> => {
    if (!import.meta.env.VITE_API_KEY) {
        throw new Error("API key is not configured");
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

    // Use dynamic style themes based on user profile
    const styleThemes = userProfile
        ? generateStyleThemes(userProfile, answers).slice(0, maxSuggestions)
        : [
            'A chic and modern everyday look',
            'A sharp and confident professional outfit',
            'A relaxed and creative weekend style'
          ].slice(0, maxSuggestions);

    const generateSingleSuggestion = async (theme: string): Promise<StyleSuggestion> => {
        const targetGender = deriveGenderFromAnswers(answers);
        const styleCategory = buildStyleCategory(theme, answers);

        const imageResult = await ReplicateImageService.generateSingleImage(styleCategory, targetGender);
        const imageUrl = imageResult.imageData;

        if (!imageUrl) {
            throw new Error(`Image generation failed for the "${theme}" look because no image URL was returned.`);
        }

        let structuredExplanation: Explanation;
        try {
            const { base64, mimeType } = await fetchImageAsBase64(imageUrl);
            const generatedImagePart = fileToGenerativePart(base64, mimeType);
            const explanationPrompt = buildExplanationPrompt(answers);

            const explanationResult = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        generatedImagePart,
                        { text: explanationPrompt }
                    ]
                },
            });

            const explanationText = explanationResult.text;
            structuredExplanation = parseExplanation(explanationText);
        } catch (error) {
            console.error('Explanation generation failed, using fallback text:', error);
            structuredExplanation = {
                title: theme,
                whyItWorks: `Custom outfit generated for ${targetGender} preferences focusing on ${theme}.`,
                occasions: 'Everyday wear',
                preferredFit: 'Standard',
                constraints: 'None'
            };
        }

        return {
            theme,
            image: imageUrl,
            explanation: structuredExplanation,
        };
    };

    const results = await Promise.allSettled(
      styleThemes.map(theme => generateSingleSuggestion(theme))
    );

    const successfulSuggestions = results
      .filter((result): result is PromiseFulfilledResult<StyleSuggestion> => result.status === 'fulfilled')
      .map(result => result.value);

    if (successfulSuggestions.length === 0) {
        const firstError = results.find(result => result.status === 'rejected') as PromiseRejectedResult | undefined;
        const errorMessage = firstError?.reason instanceof Error ? firstError.reason.message : 'All style suggestions failed to generate. Please try again with a different photo.';
        throw new Error(errorMessage);
    }

    return successfulSuggestions;
};

// Extract outfit metadata from a style suggestion for feedback analysis
export const extractOutfitMetadata = (suggestion: StyleSuggestion): OutfitMetadata => {
    // This would ideally be done with AI, but for now we'll extract from the theme and explanation
    const theme = suggestion.theme.toLowerCase();
    const explanation = suggestion.explanation;

    // Extract colors from explanation (simple heuristic)
    const colorKeywords = ['black', 'white', 'gray', 'grey', 'navy', 'blue', 'brown', 'beige', 'olive', 'green', 'red', 'pink', 'purple', 'yellow', 'orange'];
    const colors = colorKeywords.filter(color =>
        explanation.whyItWorks.toLowerCase().includes(color) ||
        explanation.title.toLowerCase().includes(color)
    );

    // Determine style type from theme
    let style = 'casual';
    if (theme.includes('professional') || theme.includes('sharp')) style = 'professional';
    else if (theme.includes('formal')) style = 'formal';
    else if (theme.includes('creative')) style = 'creative';
    else if (theme.includes('relaxed') || theme.includes('weekend')) style = 'casual';

    // Extract fit preference
    const fit = explanation.preferredFit.toLowerCase().includes('relaxed') ? 'relaxed' :
                explanation.preferredFit.toLowerCase().includes('tailored') ? 'tailored' : 'standard';

    // Calculate style attributes (simplified version - in production would use AI analysis)
    const formality = style === 'formal' ? 0.9 : style === 'professional' ? 0.7 : style === 'creative' ? 0.4 : 0.3;
    const trendiness = theme.includes('modern') || theme.includes('trendy') ? 0.8 : 0.5;
    const comfort = fit === 'relaxed' || style === 'casual' ? 0.8 : 0.5;
    const minimalism = explanation.title.toLowerCase().includes('minimal') || theme.includes('simple') ? 0.8 : 0.5;

    return {
        colors: colors.length > 0 ? colors : ['neutral'],
        style,
        fit,
        formality,
        trendiness,
        comfort,
        minimalism
    };
};








import { GoogleGenAI, Modality } from "@google/genai";
import type { Answers, StyleSuggestion, Explanation, DislikedStyle } from '../types';

const fileToGenerativePart = (base64: string, mimeType: string) => {
    return {
      inlineData: {
        data: base64,
        mimeType,
      },
    };
};

const fitMapping: {[key: number]: string} = {1: 'Very Relaxed', 2: 'Relaxed', 3: 'Standard', 4: 'Tailored', 5: 'Very Tailored'};

const buildImagePrompt = (answers: Answers, styleTheme: string, dislikedStyles: DislikedStyle[]): string => {
    
    let avoidanceInstructions = '';
    if (dislikedStyles && dislikedStyles.length > 0) {
        avoidanceInstructions = `
**IMPORTANT - AVOID THESE STYLES**: The user has previously disliked some styles. Avoid creating anything similar to these descriptions:
${dislikedStyles.map(d => `- A style with the theme "${d.theme}" because: "${d.reason}"`).join('\n')}
Do not generate outfits that match these themes or reasons for dislike. Be creative and generate a *different* and *unique* style.
`;
    }

    const prompt = `
You are a professional AI fashion stylist and photo editor. Your task is to edit the user-provided photo.

**Primary Goal: Edit the photo by replacing the clothing and background.**

${avoidanceInstructions}

**CRITICAL RULES (NON-NEGOTIABLE):**
1.  **FULL BODY VIEW (HEAD-TO-TOE)**: THIS IS THE MOST IMPORTANT RULE. The image **MUST** show the person's entire body, from the top of their head to the soles of their shoes. The complete outfit, including footwear, must be clearly visible. Do not crop the image at the ankles or feet. Failure to show the full body is a critical error.
2.  **FACE LIKENESS IS #1 PRIORITY**: The person's face in the generated image MUST be an exact match to the original photo. Do not alter their facial features, hair, or expression. It must be an ultra-realistic, 99% match.
3.  **NEW OUTFIT**: Dress the person in a completely new outfit based on the theme: **"${styleTheme}"**.
    - This outfit should be unique and different from other suggestions.
    - Incorporate these user preferences:
      - Vibe: ${answers.perception || 'any'}
      - **Color Palette**: The user's preferred colors are: ${answers.colors || 'any'}. Use these as a starting point, but your primary goal is to create a **bold, stylish, and visually interesting outfit**. Be creatively adventurous. Introduce unexpected, complementary, or vibrant accent colors. For example, if the user likes black and grey, introduce a pop of color like a burgundy scarf, an olive green jacket, or even brightly colored sneakers. Push the boundaries beyond their safe choices.
      - Fit: ${fitMapping[answers.fit as number] || 'Standard'}
      - Notes: ${answers.constraints || 'None'}
4.  **NEW BACKGROUND**: Place the person in a new, high-end photoshoot environment that complements the outfit. Examples: a modern city street, a minimalist studio, a stylish interior.
5.  **OUTPUT**: The final image must be photorealistic and high-resolution.
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
    userImage: { base64: string; mimeType: string; },
    dislikedStyles: DislikedStyle[] = []
): Promise<StyleSuggestion[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const styleThemes = [
      'A chic and modern everyday look',
      'A sharp and confident professional outfit',
      'A relaxed and creative weekend style'
    ];

    const generateSingleSuggestion = async (theme: string): Promise<StyleSuggestion> => {
        // --- Call 1: Generate Image ---
        const imagePrompt = buildImagePrompt(answers, theme, dislikedStyles);
        const userImagePart = fileToGenerativePart(userImage.base64, userImage.mimeType);

        const imageResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    userImagePart,
                    { text: imagePrompt }
                ]
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imageCandidate = imageResult.candidates?.[0];

        if (!imageCandidate || imageCandidate.finishReason !== 'STOP' || !imageCandidate.content?.parts?.[0]?.inlineData?.data) {
            const blockReason = imageResult.promptFeedback?.blockReason;
            const reason = blockReason ? `due to safety filters (${blockReason})` : 'because the model could not generate a valid image';
            throw new Error(`Image generation failed for the "${theme}" look ${reason}.`);
        }
        
        const imagePartResponse = imageCandidate.content.parts[0];
        const generatedImageBase64 = imagePartResponse.inlineData.data;
        const mimeType = imagePartResponse.inlineData.mimeType || 'image/jpeg';

        // --- Call 2: Generate Explanation ---
        const generatedImagePart = fileToGenerativePart(generatedImageBase64, mimeType);
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
        const structuredExplanation = parseExplanation(explanationText);

        return {
            theme,
            image: `data:${mimeType};base64,${generatedImageBase64}`,
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
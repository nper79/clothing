import type { UserProfile, OutfitAnalysis, Answers } from '../types';
import { PreferenceServiceSupabase } from './preferenceServiceSupabase';

export class PromptGenerationService {

    // Generate AI prompt for image generation based on user preferences
    static generateOutfitPrompt(
        userProfile: UserProfile,
        context?: string,
        season?: string,
        count: number = 1
    ): string[] {
        const prompts: string[] = [];

        for (let i = 0; i < count; i++) {
            const prompt = this.buildSinglePrompt(userProfile, context, season, i);
            prompts.push(prompt);
        }

        return prompts;
    }

    private static buildSinglePrompt(
        userProfile: UserProfile,
        context?: string,
        season?: string,
        variation: number = 0
    ): string {
        const constraints = userProfile.onboardingConstraints;
        const topLikes = PreferenceServiceSupabase.getTopLikedAttributes(userProfile, 4);
        const topDislikes = PreferenceServiceSupabase.getTopDislikedAttributes(userProfile, 3);
        const hardBans = userProfile.rejections.filter(r => r.isHardBan);

        // EXTREME STYLE DIVERSITY - Bold and specific styles
        const extremeStyles = [
            // Street & Urban - Youth Culture
            'SKATE PUNK STYLE: oversized hoodies, ripped jeans, skate shoes, beanies',
            'HIP-HOP URBAN: baggy pants, graphic tees, sneakers, gold chains, baseball caps',
            'STREETWEAR CORE: tech jackets, cargo pants, combat boots, utility belts',
            'MODERN SKATER: loose fit t-shirts, wide-leg jeans, high-tops, caps',

            // Rock & Alternative - Edge & Rebellion
            'PUNK ROCK ATTITUDE: leather jackets, ripped shirts, combat boots, chains',
            'GOTHIC DARK STYLE: black everything, velvet, platform boots, dramatic makeup',
            'METAL HEAD VIBE: band t-shirts, black jeans, leather boots, silver jewelry',
            'GRUNGE REVIVAL: flannel shirts, ripped denim, combat boots, layering',

            // Tech & Future - Cyberpunk & Sci-Fi
            'CYBERPUNK FUTURE: neon accents, tech wear, LED elements, tactical gear',
            'RETRO-FUTURISTIC: 80s neon, metallic fabrics, geometric patterns, visors',
            'TECHNO NOMAD: functional fabrics, modular clothing, utility belts, gear',
            'SPACE AGE: iridescent materials, metallic textures, futuristic silhouettes',

            // Cultural Fusion - Global Influences
            'JAPANESE STREET: Harajuku layers, kawaii elements, platform shoes',
            'KOREAN FASHION: K-pop influence, bold colors, street style fusion',
            'MEDITERRANEAN COOL: linen, earth tones, relaxed silhouettes, sandals',
            'SCANDINAVIAN MINIMAL: clean lines, monochrome, functional design',

            // High Fashion - Experimental
            'AVANT-GARDE ART: deconstructed clothing, unusual proportions, artistic',
            'MINIMALIST LUXURY: clean cuts, neutral palette, architectural shapes',
            'EXPERIMENTAL FASHION: unusual materials, sculptural forms, concept-driven',

            // Vintage & Niche - Retro & Specialized
            '90S HIP-HOP: bright colors, oversized everything, sportswear fusion',
            '80S POWER DRESSING: shoulder pads, bold colors, confidence attitude',
            'VINTAGE WORKWEAR: denim overalls, utility pieces, authentic materials',
            'MILITARY TACTICAL: cargo, camouflage, boots, functionality first'
        ];

        // FORCE COMPLETE RANDOMIZATION - no patterns, no repetition
        const randomIndex = Math.floor(Math.random() * extremeStyles.length);
        const selectedStyle = extremeStyles[randomIndex];

        // Create a focused prompt that emphasizes the style
        let prompt = `Generate an outfit image with this specific style: ${selectedStyle}. `;

        // Keep it simple - let the style dominate
        prompt += `High quality fashion photography, full body shot, clean background.`;

        // Add strong avoidances if there are disliked styles
        if (hardBans && hardBans.length > 0) {
            const bannedStyles = hardBans.map(ban => ban.attribute).join(', ');
            prompt += ` IMPORTANT: Avoid anything related to: ${bannedStyles}`;
        }

        console.log('🎨 GENERATING PROMPT:', prompt);
        console.log('🎨 SELECTED STYLE:', selectedStyle);
        console.log('🎨 STYLE INDEX:', styleIndex);

        return prompt;
    }

    private static buildPositivePromptSections(topLikes: Array<{key: string, weight: number}>, variation: number): string[] {
        const sections: string[] = [];

        topLikes.forEach((like, index) => {
            const [attribute, value] = like.key.split(':');
            const weight = like.weight;

            // Skip low-weight preferences
            if (weight < 0.3) return;

            switch (attribute) {
                case 'category':
                    sections.push(`${value} as main piece`);
                    break;
                case 'color':
                    if (index === 0 || weight > 0.8) { // Only strong color preferences
                        sections.push(`featuring ${value} accents`);
                    }
                    break;
                case 'fit':
                    sections.push(`${value} fit`);
                    break;
                case 'material':
                    sections.push(`${value} fabric`);
                    break;
                case 'pattern':
                    if (variation === index % 2) { // Add variety
                        sections.push(`with ${value} pattern`);
                    }
                    break;
                case 'vibe':
                    sections.push(`${value} aesthetic`);
                    break;
            }
        });

        return sections;
    }

    private static buildNegativePromptSections(topDislikes: Array<{key: string, weight: number}>): string[] {
        return topDislikes
            .filter(dislike => dislike.weight < -0.5) // Only moderate to strong dislikes
            .slice(0, 3) // Max 3 soft avoids
            .map(dislike => {
                const [attribute, value] = dislike.key.split(':');
                return `${value} ${attribute === 'color' ? '' : attribute}`;
            });
    }

    private static buildHardBanSections(hardBans: Array<{attribute: string, value: string}>): string[] {
        return hardBans.map(ban => {
            // Format for negative prompts
            if (ban.attribute === 'fit') {
                return `${ban.value} fit`;
            } else if (ban.attribute === 'color') {
                return `${ban.value} colors`;
            } else {
                return `${ban.value} ${ban.attribute}`;
            }
        });
    }

    private static addStyleDiversity(variation: number, userProfile: UserProfile): string {
        const diversityOptions = [
            'modern minimalist',
            'contemporary chic',
            'urban casual',
            'sophisticated relaxed',
            'clean refined'
        ];

        // Choose based on variation and user preferences
        return diversityOptions[variation % diversityOptions.length];
    }

    private static generateColorScheme(userProfile: UserProfile, variation: number): string {
        const { liked_colors, disliked_colors } = userProfile;

        if (liked_colors.length > 0) {
            // Use liked colors as base
            const primaryColor = liked_colors[variation % liked_colors.length];
            const schemes = [
                `${primaryColor} monochromatic`,
                `${primaryColor} with neutral accents`,
                `complementary to ${primaryColor}`,
                `${primaryColor} and white palette`
            ];
            return schemes[variation % schemes.length];
        }

        // Fallback to neutral schemes if no preferences
        const neutralSchemes = [
            'neutral earth tones',
            'monochromatic grayscale',
            'navy and cream palette',
            'black and white with accents'
        ];

        return neutralSchemes[variation % neutralSchemes.length];
    }

    // Generate explainability text
    static generateWhyThisExplanation(
        userProfile: UserProfile,
        outfitAnalysis: OutfitAnalysis,
        score: number
    ): string {
        const topLikes = PreferenceServiceSupabase.getTopLikedAttributes(userProfile, 3);
        const topDislikes = PreferenceServiceSupabase.getTopDislikedAttributes(userProfile, 2);

        let explanation = '';

        // Explain positive matches
        const matchingLikes = topLikes.filter(like =>
            outfitAnalysis.tags.some(tag =>
                tag.attribute === like.key.split(':')[0] &&
                tag.value === like.key.split(':')[1]
            )
        );

        if (matchingLikes.length > 0) {
            const likeDescriptions = matchingLikes.map(like => {
                const [attribute, value] = like.key.split(':');
                return this.formatAttributeForDisplay(attribute, value);
            });
            explanation += `Focusing on ${likeDescriptions.join(' and ')} (your likes). `;
        }

        // Explain avoided elements
        const avoidedElements = topDislikes.filter(dislike =>
            !outfitAnalysis.tags.some(tag =>
                tag.attribute === dislike.key.split(':')[0] &&
                tag.value === dislike.key.split(':')[1]
            )
        );

        if (avoidedElements.length > 0) {
            const avoidDescriptions = avoidedElements.slice(0, 2).map(dislike => {
                const [attribute, value] = dislike.key.split(':');
                return this.formatAttributeForDisplay(attribute, value);
            });
            explanation += `Avoiding ${avoidDescriptions.join(' and ')}`;

            // Add rejection count if available
            const bans = userProfile.rejections.filter(ban =>
                !outfitAnalysis.tags.some(tag =>
                    tag.attribute === ban.attribute &&
                    tag.value === ban.value
                )
            );

            const bannedWithStreak = bans.filter(ban => ban.streak > 1);
            if (bannedWithStreak.length > 0) {
                const bannedDesc = bannedWithStreak.map(ban =>
                    this.formatAttributeForDisplay(ban.attribute, ban.value)
                );
                explanation += ` (disliked ${bannedDesc[0]} ${bannedWithStreak[0].streak}×)`;
            }
        }

        return explanation || 'Selected based on your style preferences';
    }

    private static formatAttributeForDisplay(attribute: string, value: string): string {
        const displayMap: { [key: string]: string } = {
            'color': 'colors',
            'fit': 'fit',
            'category': 'style',
            'material': 'materials',
            'pattern': 'patterns',
            'vibe': 'vibe'
        };

        const attributeName = displayMap[attribute] || attribute;

        // Pluralize and format nicely
        if (attribute === 'color') {
            return value;
        } else if (attribute === 'fit') {
            return `${value} fit`;
        } else {
            return `${value} ${attributeName}`;
        }
    }

    // Score outfits for selection (vs generation)
    static scoreOutfitForUser(
        userProfile: UserProfile,
        outfitAnalysis: OutfitAnalysis
    ): { score: number; explanation: string; shouldAvoid: boolean } {
        // Check if outfit should be avoided due to hard bans
        const hasHardBannedItems = outfitAnalysis.tags.some(tag =>
            PreferenceServiceSupabase.shouldAvoidAttribute(
                userProfile,
                tag.attribute,
                tag.value
            )
        );

        if (hasHardBannedItems) {
            return {
                score: -100,
                explanation: 'Contains items you\'ve strongly disliked',
                shouldAvoid: true
            };
        }

        // Calculate preference score
        const score = PreferenceServiceSupabase.scoreOutfit(userProfile, outfitAnalysis);
        const explanation = this.generateWhyThisExplanation(userProfile, outfitAnalysis, score);

        return {
            score,
            explanation,
            shouldAvoid: false
        };
    }
}
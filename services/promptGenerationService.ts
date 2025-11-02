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

        // DIVERSE STYLE CATEGORIES for more interesting suggestions
        const styleCategories = [
            // Street & Urban
            'modern streetwear', 'urban casual', 'skate-inspired', 'hip-hop style', 'technical wear',
            // Rock & Alternative
            'rocker chic', 'punk-inspired casual', 'grunge revival', 'alternative style', 'metal aesthetic',
            // High Fashion & Avant-Garde
            'minimalist avant-garde', 'deconstructed style', 'architectural fashion', 'experimental casual',
            // Cultural & Global
            'Japanese street style', 'Korean fashion', 'Scandinavian minimal', 'Mediterranean chic',
            // Niche & Specific
            'techwear', 'workwear-inspired', 'vintage revival', 'retro-futuristic', 'cyberpunk casual'
        ];

        // Use variation + random for more diversity
        const styleIndex = (variation + Math.floor(Math.random() * 3)) % styleCategories.length;
        const selectedStyle = styleCategories[styleIndex];

        // Base context from onboarding
        let prompt = '';

        // Add style category for diversity - Make it the primary focus
        prompt += `${selectedStyle} outfit, `;

        // Add context/occasion
        if (context) {
            prompt += `${context} outfit, `;
        } else if (constraints.contexts && constraints.contexts.length > 0) {
            const primaryContext = constraints.contexts[0];
            prompt += `${primaryContext} outfit, `;
        } else {
            prompt += 'versatile everyday outfit, ';
        }

        // Add season/weather context
        if (season) {
            prompt += `suitable for ${season}, `;
        } else if (constraints.seasons && constraints.seasons.length > 0) {
            const seasonMap: { [key: string]: string } = {
                'All year': 'all seasons',
                'Spring–Summer': 'warm weather',
                'Fall–Winter': 'cold weather'
            };
            const weatherContext = constraints.seasons.map(s => seasonMap[s] || s).join(' and ');
            prompt += `suitable for ${weatherContext}, `;
        }

        // Positive preferences (3-4 strongest likes)
        const positivePrompts = this.buildPositivePromptSections(topLikes, variation);
        prompt += positivePrompts.join(', ');

        // Soft avoids (2-3 moderate dislikes)
        const negativePrompts = this.buildNegativePromptSections(topDislikes);
        if (negativePrompts.length > 0) {
            prompt += `, avoiding ${negativePrompts.join(', ')}`;
        }

        // Hard bans from progressive rejection
        const hardBanPrompts = this.buildHardBanSections(hardBans);
        if (hardBanPrompts.length > 0) {
            prompt += `. ABSOLUTELY NO: ${hardBanPrompts.join(', ')}`;
        }

        // Budget considerations
        if (constraints.budget) {
            const budgetModifiers = {
                'Low': 'affordable, budget-friendly',
                'Medium': 'mid-range quality',
                'High': 'premium, luxury'
            };
            prompt += `, ${budgetModifiers[constraints.budget as keyof typeof budgetModifiers] || 'quality'}`;
        }

        // Add style diversity based on variation
        const styleDiversity = this.addStyleDiversity(variation, userProfile);
        if (styleDiversity) {
            prompt += `, ${styleDiversity}`;
        }

        // Add color scheme guidance
        const colorScheme = this.generateColorScheme(userProfile, variation);
        if (colorScheme) {
            prompt += `, ${colorScheme} color palette`;
        }

        // Finish with quality and style specifications
        prompt += ', professional fashion photography, clean lighting, full body shot';

        // Add negative prompt for AI generators that support it
        prompt += ' --no unrealistic proportions, distorted clothing, poor quality';

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
import type { UserProfile, PreferenceWeights, LookFeedback } from '../types';

// Style category weights for different user preferences
interface StyleCategoryWeights {
  [category: string]: {
    formal: number;
    casual: number;
    experimental: number;
    conservative: number;
    colorful: number;
    neutral: number;
    trendy: number;
    timeless: number;
  };
}

// Learning algorithm service for processing visual calibration feedback
export class PreferenceLearningService {
  private static styleCategoryWeights: StyleCategoryWeights = {
    'Minimalista': {
      formal: 0.3, casual: 0.8, experimental: -0.5, conservative: 0.6,
      colorful: -0.8, neutral: 1.0, trendy: 0.2, timeless: 0.9
    },
    'Streetwear': {
      formal: -0.9, casual: 1.0, experimental: 0.7, conservative: -0.8,
      colorful: 0.3, neutral: -0.2, trendy: 0.9, timeless: -0.5
    },
    'Boêmio': {
      formal: -0.6, casual: 0.9, experimental: 0.5, conservative: -0.3,
      colorful: 0.7, neutral: -0.1, trendy: 0.4, timeless: 0.6
    },
    'Punk': {
      formal: -1.0, casual: 0.7, experimental: 1.0, conservative: -1.0,
      colorful: 0.2, neutral: -0.6, trendy: 0.3, timeless: -0.8
    },
    'Vintage': {
      formal: 0.2, casual: 0.8, experimental: -0.2, conservative: 0.4,
      colorful: 0.1, neutral: 0.5, trendy: -0.3, timeless: 1.0
    },
    'Cyberpunk': {
      formal: -0.7, casual: 0.6, experimental: 1.0, conservative: -0.9,
      colorful: 0.4, neutral: -0.4, trendy: 0.8, timeless: -0.6
    },
    'Hip-Hop': {
      formal: -0.8, casual: 1.0, experimental: 0.6, conservative: -0.7,
      colorful: 0.5, neutral: -0.3, trendy: 0.9, timeless: -0.4
    },
    'Skate': {
      formal: -1.0, casual: 1.0, experimental: 0.4, conservative: -0.8,
      colorful: 0.3, neutral: -0.2, trendy: 0.7, timeless: -0.5
    },
    'Gótico': {
      formal: 0.1, casual: 0.5, experimental: 0.8, conservative: -0.2,
      colorful: -0.9, neutral: 0.7, trendy: 0.2, timeless: 0.4
    },
    'Preppy': {
      formal: 0.8, casual: 0.4, experimental: -0.7, conservative: 0.9,
      colorful: 0.2, neutral: 0.6, trendy: -0.2, timeless: 0.8
    },
    'Festival': {
      formal: -0.9, casual: 0.8, experimental: 0.9, conservative: -0.8,
      colorful: 1.0, neutral: -0.7, trendy: 0.8, timeless: -0.6
    },
    'Formal': {
      formal: 1.0, casual: -0.8, experimental: -0.6, conservative: 0.7,
      colorful: -0.2, neutral: 0.4, trendy: 0.1, timeless: 0.8
    },
    'Artístico': {
      formal: -0.4, casual: 0.7, experimental: 0.9, conservative: -0.5,
      colorful: 0.8, neutral: -0.3, trendy: 0.6, timeless: 0.2
    },
    'Luxo': {
      formal: 0.9, casual: 0.3, experimental: 0.2, conservative: 0.6,
      colorful: 0.1, neutral: 0.5, trendy: 0.7, timeless: 0.9
    },
    'Esportivo': {
      formal: -0.8, casual: 1.0, experimental: 0.1, conservative: -0.4,
      colorful: 0.4, neutral: 0.2, trendy: 0.6, timeless: -0.2
    },
    'Romântico': {
      formal: 0.4, casual: 0.6, experimental: 0.3, conservative: 0.2,
      colorful: 0.7, neutral: -0.1, trendy: 0.3, timeless: 0.5
    },
    'Industrial': {
      formal: -0.2, casual: 0.8, experimental: 0.6, conservative: 0.3,
      colorful: -0.5, neutral: 0.8, trendy: 0.4, timeless: 0.6
    },
    'Techwear': {
      formal: -0.3, casual: 0.7, experimental: 0.9, conservative: -0.4,
      colorful: -0.2, neutral: 0.6, trendy: 0.9, timeless: 0.1
    },
    'Indie': {
      formal: -0.5, casual: 0.9, experimental: 0.7, conservative: -0.3,
      colorful: 0.5, neutral: 0.1, trendy: 0.4, timeless: 0.7
    }
  };

  /**
   * Process visual calibration feedback and update user preference weights
   * Uses +2 points for positive feedback, -3 for negative feedback
   */
  static processVisualCalibrationFeedback(
    userProfile: UserProfile,
    feedback: LookFeedback[]
  ): UserProfile {
    const updatedWeights = { ...userProfile.preferenceWeights };
    const updatedRejections = [...userProfile.rejections];

    feedback.forEach((lookFeedback) => {
      const rating = lookFeedback.overallRating;
      const weightMultiplier = rating >= 7 ? 2 : rating <= 4 ? -3 : rating === 5 ? 0.5 : -0.5;

      // Update style category weights
      const styleCategory = this.getStyleCategoryFromLookId(lookFeedback.lookId);
      if (styleCategory && this.styleCategoryWeights[styleCategory]) {
        const categoryWeights = this.styleCategoryWeights[styleCategory];

        // Update weights for each style attribute
        Object.entries(categoryWeights).forEach(([attribute, baseWeight]) => {
          const weightKey = `style:${attribute}`;
          const currentWeight = updatedWeights[weightKey] || 0;
          const adjustment = baseWeight * weightMultiplier * 0.1; // Scale down adjustments
          updatedWeights[weightKey] = Math.max(-5, Math.min(5, currentWeight + adjustment));
        });
      }

      // Process piece-specific feedback if available
      if (lookFeedback.pieceFeedback) {
        Object.entries(lookFeedback.pieceFeedback).forEach(([piece, pieceRating]) => {
          if (pieceRating !== 0) {
            const pieceWeightMultiplier = pieceRating > 0 ? 1.5 : -2;
            const weightKey = `piece:${piece}`;
            const currentWeight = updatedWeights[weightKey] || 0;
            updatedWeights[weightKey] = Math.max(-5, Math.min(5, currentWeight + pieceWeightMultiplier * 0.2));
          }
        });
      }

      // Track rejections for very low ratings
      if (rating <= 3) {
        const styleCategory = this.getStyleCategoryFromLookId(lookFeedback.lookId);
        if (styleCategory) {
          this.updateRejectionTracking(updatedRejections, 'style_category', styleCategory);
        }
      }
    });

    return {
      ...userProfile,
      preferenceWeights: updatedWeights,
      rejections: updatedRejections,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get style category from look ID
   */
  private static getStyleCategoryFromLookId(lookId: string): string | null {
    // Extract category from look ID (e.g., "minimalist_work" -> "Minimalista")
    const categoryMap: { [key: string]: string } = {
      'minimalist_work': 'Minimalista',
      'minimalist_casual': 'Minimalista',
      'streetwear_casual': 'Streetwear',
      'bohemian_artistic': 'Boêmio',
      'punk_rock': 'Punk',
      'vintage_retro': 'Vintage',
      'cyberpunk_tech': 'Cyberpunk',
      'hiphop_urban': 'Hip-Hop',
      'skate_punk': 'Skate',
      'gothic_dark': 'Gótico',
      'prep_collegiate': 'Preppy',
      'raver_festival': 'Festival',
      'business_formal': 'Formal',
      'artsy_eclectic': 'Artístico',
      'luxury_designer': 'Luxo',
      'sporty_athleisure': 'Esportivo',
      'romantic_soft': 'Romântico',
      'industrial_workwear': 'Industrial',
      'techwear_modern': 'Techwear',
      'indie_alternative': 'Indie'
    };

    return categoryMap[lookId] || null;
  }

  /**
   * Update rejection tracking for progressive rejections
   */
  private static updateRejectionTracking(
    rejections: any[],
    attribute: string,
    value: string
  ): void {
    const existingRejection = rejections.find(r => r.attribute === attribute && r.value === value);

    if (existingRejection) {
      existingRejection.streak += 1;
      existingRejection.lastRejected = new Date().toISOString();

      // Mark as hard ban after 3 consecutive rejections
      if (existingRejection.streak >= 3) {
        existingRejection.isHardBan = true;
      }
    } else {
      rejections.push({
        attribute,
        value,
        streak: 1,
        lastRejected: new Date().toISOString(),
        isHardBan: false
      });
    }
  }

  /**
   * Calculate user's preference profile based on weights
   */
  static calculatePreferenceProfile(weights: PreferenceWeights): {
    formality: number;
    experimentation: number;
    colorfulness: number;
    trendiness: number;
    comfort: number;
  } {
    const profile = {
      formality: 0,
      experimentation: 0,
      colorfulness: 0,
      trendiness: 0,
      comfort: 0
    };

    // Aggregate weights by style attribute
    Object.entries(weights).forEach(([key, weight]) => {
      if (key.startsWith('style:')) {
        const attribute = key.replace('style:', '');
        switch (attribute) {
          case 'formal':
            profile.formality += weight;
            break;
          case 'experimental':
            profile.experimentation += weight;
            break;
          case 'colorful':
            profile.colorfulness += weight;
            break;
          case 'trendy':
            profile.trendiness += weight;
            break;
          case 'casual':
            profile.comfort += weight * 0.5; // Casual contributes to comfort
            break;
        }
      }
    });

    // Normalize to -1 to 1 range
    const normalize = (value: number) => Math.max(-1, Math.min(1, value / 5));

    return {
      formality: normalize(profile.formality),
      experimentation: normalize(profile.experimentation),
      colorfulness: normalize(profile.colorfulness),
      trendiness: normalize(profile.trendiness),
      comfort: normalize(profile.comfort)
    };
  }

  /**
   * Get personalized style recommendations based on learned preferences
   */
  static getStyleRecommendations(userProfile: UserProfile): {
    recommended: string[];
    avoided: string[];
    neutral: string[];
  } {
    const profile = this.calculatePreferenceProfile(userProfile.preferenceWeights);
    const allCategories = Object.keys(this.styleCategoryWeights);

    const recommendations = {
      recommended: [] as string[],
      avoided: [] as string[],
      neutral: [] as string[]
    };

    allCategories.forEach(category => {
      const categoryWeights = this.styleCategoryWeights[category];

      // Calculate compatibility score
      let score = 0;
      score += categoryWeights.formal * profile.formality;
      score += categoryWeights.experimental * profile.experimentation;
      score += categoryWeights.colorful * profile.colorfulness;
      score += categoryWeights.trendy * profile.trendiness;
      score += categoryWeights.casual * profile.comfort;

      // Check for hard bans
      const isHardBanned = userProfile.rejections.some(
        r => r.attribute === 'style_category' && r.value === category && r.isHardBan
      );

      if (isHardBanned) {
        recommendations.avoided.push(category);
      } else if (score > 0.3) {
        recommendations.recommended.push(category);
      } else if (score < -0.3) {
        recommendations.avoided.push(category);
      } else {
        recommendations.neutral.push(category);
      }
    });

    return recommendations;
  }

  /**
   * Generate a summary of user's learned style preferences
   */
  static generateStyleProfileSummary(userProfile: UserProfile): string {
    const profile = this.calculatePreferenceProfile(userProfile.preferenceWeights);
    const recommendations = this.getStyleRecommendations(userProfile);

    const formalityDesc = profile.formality > 0.3 ? 'formal' : profile.formality < -0.3 ? 'informal' : 'versátil';
    const experimentDesc = profile.experimentation > 0.3 ? 'experimental' : profile.experimentation < -0.3 ? 'conservador' : 'equilibrado';
    const colorDesc = profile.colorfulness > 0.3 ? 'colorido' : profile.colorfulness < -0.3 ? 'neutro' : 'moderado';
    const trendDesc = profile.trendiness > 0.3 ? 'moderno' : profile.trendiness < -0.3 ? 'clássico' : 'atemporal';

    let summary = `Seu estilo é ${formalityDesc} e ${experimentDesc}, com preferência por paletas ${colorDesc} e estética ${trendDesc}.`;

    if (recommendations.recommended.length > 0) {
      summary += ` Estilos que mais combinam com você: ${recommendations.recommended.slice(0, 3).join(', ')}.`;
    }

    if (recommendations.avoided.length > 0) {
      summary += ` Estilos a evitar: ${recommendations.avoided.slice(0, 3).join(', ')}.`;
    }

    return summary;
  }
}
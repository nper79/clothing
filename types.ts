export type Answer = string | string[] | number;

export interface Answers {
  [key: string]: Answer;
}

export type QuestionType = "single" | "multiple" | "slider" | "range";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
}

export interface Explanation {
    title: string;
    whyItWorks: string;
    occasions: string;
    preferredFit: string;
    constraints: string;
}

export interface StyleSuggestion {
    theme: string;
    image: string;
    explanation: Explanation;
}

export interface DislikedStyle {
    theme: string;
    reason: string;
}

export interface UserFeedback {
    user_id: string;
    outfit_id: string;
    reason: string;
    timestamp: string;
    outfit_metadata: OutfitMetadata;
}

// Vision AI Tag Structure
export interface VisionTag {
    attribute: string;    // category, color, fit, material, pattern, vibe, etc.
    value: string;        // blazer, blue, slim, denim, solid, minimal, etc.
    confidence: number;   // 0.0 - 1.0
    itemId?: string;      // top, bottom, shoes, outerwear, accessories (if applicable)
}

// Clothing Item Structure
export interface ClothingItem {
    id: string;           // top, bottom, shoes, outerwear, accessories
    category: string;     // t-shirt, blazer, jeans, sneakers, etc.
    subcategory?: string; // denim_jacket, low_top_sneakers, etc.
    fit: string;          // slim, oversized, tapered, wide_leg, etc.
    colors: string[];     // blue, white, beige, etc.
    materials: string[];  // cotton, denim, leather, etc.
    patterns: string[];   // solid, stripe, check, graphic, etc.
    vibe?: string;        // minimal, streetwear, techwear, etc.
}

// Enhanced Outfit Analysis
export interface OutfitAnalysis {
    items: ClothingItem[];
    overallVibe: string;
    colorPalette: string[];
    tags: VisionTag[];
    confidence: number;
}

export interface OutfitMetadata {
    colors: string[];
    style: string;
    fit: string;
    formality: number;
    trendiness: number;
    comfort: number;
    minimalism: number;
    // New enhanced metadata
    analysis?: OutfitAnalysis;
}

export interface StyleVector {
    formality: number;
    color_neutrality: number;
    comfort: number;
    trendiness: number;
    minimalism: number;
}

// Preference Model - Tag-based weights
export interface PreferenceWeights {
    [tagKey: string]: number;  // e.g., "category:blazer": 1.2, "color:beige": -1.6
}

// Rejection tracking for progressive rejection
export interface AttributeRejection {
    attribute: string;
    value: string;
    streak: number;        // consecutive rejections
    lastRejected: string;  // ISO timestamp
    isHardBan: boolean;    // after ~3 consecutive rejections
}

// Enhanced User Profile with Preference Learning
export interface UserProfile {
    user_id: string;
    style_vector: StyleVector;
    liked_colors: string[];
    disliked_colors: string[];
    feedback_history: UserFeedback[];
    ageBand?: string;
    presentingGender?: string;

    // New preference learning system
    preferenceWeights: PreferenceWeights;
    rejections: AttributeRejection[];
    onboardingConstraints: {
        contexts: string[];
        seasons: string[];
        budget: string;
        itemsToAvoid: string[];
        colorsToAvoid: string[];
        fitsToAvoid: string[];
        patternsToAvoid: string[];
        logoVisibility?: string;
    };
    lastUpdated: string;   // for monthly decay
    logoVisibility?: 'no_logos' | 'ok';
}

// Micro-feedback reasons
export type FeedbackReason =
    | 'Top'
    | 'Bottom'
    | 'Shoes'
    | 'Outerwear'
    | 'Accessories'
    | 'Color'
    | 'Fit'
    | 'Pattern'
    | 'Material'
    | 'Overall vibe';

// Enhanced Style Suggestion with analysis
export interface StyleSuggestion {
    theme: string;
    image: string;
    explanation: Explanation;
    analysis?: OutfitAnalysis;  // Vision AI analysis
    whyThis?: string;          // Explainability text
    score?: number;            // Preference match score
}

export enum AppState {
    ONBOARDING,
    QUESTIONNAIRE,
    IMAGE_UPLOAD,
    LOADING,
    RESULTS,
    ERROR,
    FEEDBACK
}

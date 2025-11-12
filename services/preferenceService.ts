import type { UserProfile, StyleVector, UserFeedback, OutfitMetadata } from '../types';

const defaultConstraints = () => ({
  contexts: [] as string[],
  seasons: [] as string[],
  budget: 'Medium',
  itemsToAvoid: [] as string[],
  colorsToAvoid: [] as string[],
  fitsToAvoid: [] as string[],
  patternsToAvoid: [] as string[],
  logoVisibility: 'ok' as const
});

const createDefaultProfile = (userId: string): UserProfile => ({
  user_id: userId,
  style_vector: {
    formality: 0.5,
    color_neutrality: 0.5,
    comfort: 0.7,
    trendiness: 0.5,
    minimalism: 0.5
  },
  liked_colors: [],
  disliked_colors: [],
  feedback_history: [],
  preferenceWeights: {},
  rejections: [],
  onboardingConstraints: defaultConstraints(),
  lastUpdated: new Date().toISOString(),
  logoVisibility: 'ok'
});

// Initialize user profile with default values
export const initializeUserProfile = (userId: string): UserProfile => {
  return createDefaultProfile(userId);
};

// Map feedback reasons to style vector adjustments
const reasonToVectorAdjustment: { [key: string]: Partial<StyleVector> } = {
  "Not my style": { trendiness: -0.1, minimalism: -0.05 },
  "I don't like the colors": { color_neutrality: -0.1 },
  "Too formal / not casual enough": { formality: -0.15, comfort: +0.05 },
  "Doesn't fit my body type": { comfort: -0.1 },
  "Looks uncomfortable": { comfort: -0.15 },
  "Wouldn't fit my lifestyle": { formality: -0.1, trendiness: -0.05 }
};

// Extract colors from feedback and update color preferences
const updateColorPreferences = (
  profile: UserProfile,
  outfitMetadata: OutfitMetadata,
  isPositive: boolean
): void => {
  outfitMetadata.colors.forEach(color => {
    if (isPositive) {
      if (!profile.liked_colors.includes(color)) {
        profile.liked_colors.push(color);
      }
      // Remove from disliked if it was there
      profile.disliked_colors = profile.disliked_colors.filter(c => c !== color);
    } else {
      if (!profile.disliked_colors.includes(color)) {
        profile.disliked_colors.push(color);
      }
      // Remove from liked if it was there
      profile.liked_colors = profile.liked_colors.filter(c => c !== color);
    }
  });
};

// Update user profile based on feedback
export const updateProfileFromFeedback = (
  profile: UserProfile,
  feedback: UserFeedback
): UserProfile => {
  const updatedProfile = { ...profile };
  if (!updatedProfile.onboardingConstraints) {
    updatedProfile.onboardingConstraints = defaultConstraints();
  }
  if (!updatedProfile.preferenceWeights) {
    updatedProfile.preferenceWeights = {};
  }
  if (!updatedProfile.rejections) {
    updatedProfile.rejections = [];
  }

  // Add feedback to history
  updatedProfile.feedback_history = [...updatedProfile.feedback_history, feedback];

  // Update style vector based on feedback reason
  const adjustment = reasonToVectorAdjustment[feedback.reason];
  if (adjustment) {
    Object.entries(adjustment).forEach(([key, value]) => {
      const vectorKey = key as keyof StyleVector;
      updatedProfile.style_vector[vectorKey] = Math.max(0, Math.min(1,
        updatedProfile.style_vector[vectorKey] + value
      ));
    });
  }

  // Update color preferences
  updateColorPreferences(updatedProfile, feedback.outfit_metadata, false);

  return updatedProfile;
};

// Calculate cosine similarity between two style vectors
export const cosineSimilarity = (vec1: StyleVector, vec2: StyleVector): number => {
  const dotProduct = Object.values(vec1).reduce((sum, val, idx) =>
    sum + val * Object.values(vec2)[idx], 0
  );

  const magnitude1 = Math.sqrt(Object.values(vec1).reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(Object.values(vec2).reduce((sum, val) => sum + val * val, 0));

  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
};

// Generate dynamic style themes based on user profile
export const generateStyleThemes = (profile: UserProfile, baseAnswers: any): string[] => {
  const { formality, color_neutrality, comfort, trendiness, minimalism } = profile.style_vector;

  // Base themes that will be dynamically adjusted
  const baseThemes = [
    'A modern everyday look',
    'A professional outfit',
    'A relaxed weekend style'
  ];

  // Adjust themes based on profile
  const adjustedThemes = baseThemes.map((theme, idx) => {
    let adjustedTheme = theme;

    if (idx === 0) { // Everyday look
      if (comfort > 0.7) adjustedTheme = 'A comfortable and relaxed everyday look';
      if (trendiness > 0.7) adjustedTheme = 'A trendy and fashionable everyday look';
      if (minimalism > 0.7) adjustedTheme = 'A minimalist and clean everyday look';
    } else if (idx === 1) { // Professional
      if (formality > 0.7) adjustedTheme = 'A sharp and formal professional outfit';
      if (formality < 0.3) adjustedTheme = 'A business casual professional outfit';
      if (comfort > 0.7) adjustedTheme = 'A comfortable yet polished professional outfit';
    } else { // Weekend
      if (trendiness > 0.7) adjustedTheme = 'A stylish and creative weekend outfit';
      if (comfort > 0.8) adjustedTheme = 'An ultra-comfortable weekend lounging outfit';
      if (minimalism > 0.6) adjustedTheme = 'A simple and elegant weekend look';
    }

    // Add color preferences to theme
    if (profile.liked_colors.length > 0) {
      const colorDesc = profile.liked_colors.slice(0, 2).join(' and ');
      adjustedTheme += ` featuring ${colorDesc} colors`;
    }

    return adjustedTheme;
  });

  return adjustedThemes;
};

// Store user profile in localStorage for persistence
export const saveUserProfile = (profile: UserProfile): void => {
  try {
    const profileToStore = {
      ...profile,
      onboardingConstraints: profile.onboardingConstraints || defaultConstraints(),
      preferenceWeights: profile.preferenceWeights || {},
      rejections: profile.rejections || [],
      lastUpdated: profile.lastUpdated || new Date().toISOString(),
      logoVisibility: profile.logoVisibility || 'ok'
    };
    localStorage.setItem(`user_profile_${profile.user_id}`, JSON.stringify(profileToStore));
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
};

export const loadUserProfile = (userId: string): UserProfile | null => {
  try {
    const stored = localStorage.getItem(`user_profile_${userId}`);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    return {
      ...createDefaultProfile(userId),
      ...parsed,
      onboardingConstraints: {
        ...defaultConstraints(),
        ...(parsed.onboardingConstraints || {})
      },
      preferenceWeights: parsed.preferenceWeights || {},
      rejections: parsed.rejections || [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      logoVisibility: parsed.logoVisibility || 'ok'
    };
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return null;
  }
};

import type { UserProfile, StyleVector, UserFeedback, OutfitMetadata } from '../types';
import { createProfile, getProfile, updateProfile, saveFeedback, getFeedbackHistory } from './supabaseService';
import { authService } from './authService';

// Initialize user profile with default values
export const initializeUserProfile = async (): Promise<UserProfile> => {
  const user = await authService.getCurrentUser();
  const userId = user?.id ?? `local_${Date.now()}`;

  const defaultProfile: UserProfile = {
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
    onboardingConstraints: {
      contexts: [],
      seasons: [],
      budget: 'Medium',
      itemsToAvoid: [],
      colorsToAvoid: [],
      fitsToAvoid: [],
      patternsToAvoid: [],
      logoVisibility: 'ok'
    },
    lastUpdated: new Date().toISOString(),
    logoVisibility: 'ok'
  };

  // Try to save to cloud first
  const cloudProfile = await createProfile(defaultProfile);
  if (cloudProfile) {
    // Also save locally for offline access
    localStorage.setItem(`user_profile_${userId}`, JSON.stringify(defaultProfile));
    return cloudProfile;
  }

  // Fallback to local only
  localStorage.setItem(`user_profile_${userId}`, JSON.stringify(defaultProfile));
  return defaultProfile;
};

// Load user profile with cloud sync
export const loadUserProfileCloud = async (): Promise<UserProfile | null> => {
  const user = await authService.getCurrentUser();
  const userId = user?.id;

  if (!userId) {
    return null;
  }

  try {
    // Try to load from cloud first
    const cloudProfile = await getProfile(userId);
    if (cloudProfile) {
      // Update local cache
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(cloudProfile));
      return cloudProfile;
    }
  } catch (error) {
    console.warn('Cloud sync failed, using local cache:', error);
  }

  // Fallback to local cache
  try {
    const localProfile = localStorage.getItem(`user_profile_${userId}`);
    if (localProfile) {
      return JSON.parse(localProfile);
    }
  } catch (error) {
    console.error('Failed to load local profile:', error);
  }

  return null;
};

// Save user profile with cloud sync
export const saveUserProfileCloud = async (profile: UserProfile): Promise<boolean> => {
  try {
    // Save to cloud first
    const cloudResult = await updateProfile(profile);

    // Always save locally for offline access
    localStorage.setItem(`user_profile_${profile.user_id}`, JSON.stringify(profile));

    return cloudResult !== null;
  } catch (error) {
    console.error('Cloud save failed, saved locally only:', error);

    // Fallback to local only
    try {
      localStorage.setItem(`user_profile_${profile.user_id}`, JSON.stringify(profile));
      return true;
    } catch (localError) {
      console.error('Local save also failed:', localError);
      return false;
    }
  }
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

// Update user profile based on feedback (with cloud sync)
export const updateProfileFromFeedbackCloud = async (
  profile: UserProfile,
  feedback: UserFeedback
): Promise<UserProfile> => {
  const updatedProfile = { ...profile };

  // Add feedback to history
  updatedProfile.feedback_history = [feedback, ...updatedProfile.feedback_history];

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

  // Save feedback to cloud
  await saveFeedback(feedback);

  // Save updated profile
  await saveUserProfileCloud(updatedProfile);

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

// Sync local changes to cloud when online
export const syncToCloud = async (): Promise<void> => {
  const user = await authService.getCurrentUser();

  if (!user) return;

  try {
    const localProfile = localStorage.getItem(`user_profile_${user.id}`);
    if (localProfile) {
      const profile: UserProfile = JSON.parse(localProfile);
      await saveUserProfileCloud(profile);
    }
  } catch (error) {
    console.error('Sync to cloud failed:', error);
  }
};

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, UserFeedback } from '../types';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? supabaseKey : 'public-anon-key';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey);

let supabaseAuthAvailable = isSupabaseConfigured;

export const isSupabaseReady = () => isSupabaseConfigured && supabaseAuthAvailable;

export const markSupabaseAuthUnavailable = () => {
  if (supabaseAuthAvailable) {
    console.warn('Supabase auth unavailable. Falling back to local-only storage.');
  }
  supabaseAuthAvailable = false;
};

// User Profiles
export const createProfile = async (profile: UserProfile): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Using local storage fallback.');
    // Store in localStorage as fallback
    localStorage.setItem(`profile_${profile.user_id}`, JSON.stringify(profile));
    return profile;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([{
        user_id: profile.user_id,
        style_vector: profile.style_vector,
        liked_colors: profile.liked_colors,
        disliked_colors: profile.disliked_colors,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    // Fallback to localStorage
    localStorage.setItem(`profile_${profile.user_id}`, JSON.stringify(profile));
    return profile;
  }
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Using local storage fallback.');
    // Try to get from localStorage
    const stored = localStorage.getItem(`profile_${userId}`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    if (data) {
      // Get feedback history
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (feedbackError) throw feedbackError;

      return {
        ...data,
        feedback_history: feedbackData || []
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting profile:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(`profile_${userId}`);
    return stored ? JSON.parse(stored) : null;
  }
};

export const updateProfile = async (profile: UserProfile): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        style_vector: profile.style_vector,
        liked_colors: profile.liked_colors,
        disliked_colors: profile.disliked_colors,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.user_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
};

// User Feedback
export const saveFeedback = async (feedback: UserFeedback): Promise<UserFeedback | null> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Using local storage fallback.');
    // Store in localStorage as fallback
    const existingFeedback = JSON.parse(localStorage.getItem(`feedback_${feedback.user_id}`) || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem(`feedback_${feedback.user_id}`, JSON.stringify(existingFeedback));
    return feedback;
  }

  try {
    const { data, error } = await supabase
      .from('user_feedback')
      .insert([feedback])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving feedback:', error);
    // Fallback to localStorage
    const existingFeedback = JSON.parse(localStorage.getItem(`feedback_${feedback.user_id}`) || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem(`feedback_${feedback.user_id}`, JSON.stringify(existingFeedback));
    return feedback;
  }
};

export const getFeedbackHistory = async (userId: string, limit: number = 50): Promise<UserFeedback[]> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Using local storage fallback.');
    // Try to get from localStorage
    const stored = localStorage.getItem(`feedback_${userId}`);
    const feedback = stored ? JSON.parse(stored) : [];
    return feedback.slice(-limit).reverse();
  }

  try {
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting feedback history:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(`feedback_${userId}`);
    const feedback = stored ? JSON.parse(stored) : [];
    return feedback.slice(-limit).reverse();
  }
};

// Analytics
export const getUserAnalytics = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_feedback')
      .select('reason, outfit_metadata, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Analyze feedback patterns
    const reasonCounts = data?.reduce((acc, feedback) => {
      acc[feedback.reason] = (acc[feedback.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate style evolution
    const evolution = data?.map(feedback => ({
      timestamp: feedback.timestamp,
      formality: feedback.outfit_metadata.formality,
      comfort: feedback.outfit_metadata.comfort,
      trendiness: feedback.outfit_metadata.trendiness
    })) || [];

    return {
      totalFeedback: data?.length || 0,
      reasonCounts,
      evolution,
      lastFeedback: data?.[0]?.timestamp || null
    };
  } catch (error) {
    console.error('Error getting analytics:', error);
    return {
      totalFeedback: 0,
      reasonCounts: {},
      evolution: [],
      lastFeedback: null
    };
  }
};

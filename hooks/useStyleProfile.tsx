import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface StyleProfile {
  perceptionStyle: string[];
  wearPlaces: string[];
  currentStyle: string[];
  desiredStyle: string[];
  outfitGoals: string[];
  colorPreferences: string[];
  dislikedColors: string;
  outfitComplexity: string;
  neverWearItems: string[];
}

export const useStyleProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfile();
  }, [user]);

  const checkProfile = async () => {
    if (!user) {
      setHasProfile(false);
      setLoading(false);
      return;
    }

    try {
      // Check if user has completed the style quiz
      const response = await fetch(`/api/style-analysis/${user.id}`);
      if (response.ok) {
        setHasProfile(true);
        // You could also load the profile data here if needed
      } else {
        setHasProfile(false);
      }
    } catch (error) {
      console.error('Failed to check style profile:', error);
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (profileData: StyleProfile) => {
    try {
      const response = await fetch('/api/style-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setProfile(profileData);
        setHasProfile(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save style profile:', error);
      return false;
    }
  };

  return {
    profile,
    hasProfile,
    loading,
    saveProfile,
    refetch: checkProfile
  };
};
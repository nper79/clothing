import React, { useState } from 'react';
import { PersonalStylingUpload } from './PersonalStylingUpload';
import { PersonalizedLookReels } from './PersonalizedLookReels';
import { PersonalStylingService, UserPreferences } from '../services/personalStylingService';
import { useAuth } from '../contexts/AuthContext';

type FlowStep = 'upload' | 'styling' | 'complete';

interface PersonalStylingFlowProps {
  onComplete?: (preferences: UserPreferences) => void;
}

export const PersonalStylingFlow: React.FC<PersonalStylingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>('');
  const [userGender, setUserGender] = useState<'male' | 'female'>(() => {
    if (typeof window === 'undefined') {
      return 'female';
    }
    return (localStorage.getItem('latest_user_gender') as 'male' | 'female') || 'female';
  });
  const [latestPreferences, setLatestPreferences] = useState<UserPreferences>(
    PersonalStylingService.getUserPreferences()
  );

  const handlePhotoUploaded = (photoUrl: string, gender: 'male' | 'female') => {
    setUserPhotoUrl(photoUrl);
    setUserGender(gender);
    setCurrentStep('styling');
  };

  const handleStylingComplete = (preferences: UserPreferences) => {
    setLatestPreferences(preferences);
    setCurrentStep('complete');
    if (onComplete) {
      onComplete(preferences);
    }
  };

  const handleRestart = () => {
    setCurrentStep('upload');
    setUserPhotoUrl('');
  };

  switch (currentStep) {
    case 'upload':
      return <PersonalStylingUpload onPhotoUploaded={handlePhotoUploaded} />;

    case 'styling':
      if (!user) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Sign in required</h2>
              <p className="text-white/60">You need to be signed in to generate personalized looks.</p>
            </div>
          </div>
        );
      }
      return (
        <PersonalizedLookReels
          userId={user.id}
          userPhotoUrl={userPhotoUrl}
          gender={userGender}
          onComplete={handleStylingComplete}
        />
      );

    case 'complete':
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Style Profile Saved!</h2>
              <p className="text-gray-600 mb-4">
                Your preferences are now stored. From this point on we will keep refining the looks to match your style even better.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleRestart}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
                >
                  Try Another Photo
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-3">Your Profile</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{latestPreferences.likedLooks.length}</div>
                  <div className="text-gray-500">Looks You Liked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{latestPreferences.dislikedLooks.length}</div>
                  <div className="text-gray-500">Detailed Feedback</div>
                </div>
              </div>
              {latestPreferences.dislikedItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Items to avoid:</span> {latestPreferences.dislikedItems.slice(0, 3).join(', ')}
                    {latestPreferences.dislikedItems.length > 3 && ` +${latestPreferences.dislikedItems.length - 3}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

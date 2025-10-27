import React, { useState, useCallback, useEffect } from 'react';
import Questionnaire from './components/Questionnaire';
import ImageUploader from './components/ImageUploader';
import StyleResults from './components/StyleResults';
import LoadingSpinner from './components/LoadingSpinner';
import Feedback from './components/Feedback';
import { generateStyleSuggestions, extractOutfitMetadata, detectGender } from './services/geminiService';
import { initializeUserProfile, updateProfileFromFeedback, saveUserProfile, loadUserProfile } from './services/preferenceService';
import type { Answers, StyleSuggestion, DislikedStyle, UserProfile, UserFeedback } from './types';
import { AppState } from './types';

const App: React.FC = () => {
  // Generate or retrieve user ID
  const getUserId = () => {
    const stored = localStorage.getItem('user_id');
    if (stored) return stored;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_id', newId);
    return newId;
  };

  const userId = getUserId();

  const [appState, setAppState] = useState<AppState>(AppState.QUESTIONNAIRE);
  const [answers, setAnswers] = useState<Answers>({});
  const [userImage, setUserImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [suggestions, setSuggestions] = useState<StyleSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dislikedStyles, setDislikedStyles] = useState<DislikedStyle[]>([]);
  const [dislikedSuggestion, setDislikedSuggestion] = useState<StyleSuggestion | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = loadUserProfile(userId);
    return saved || initializeUserProfile(userId);
  });

  // Save profile whenever it changes
  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);


  const handleQuestionnaireComplete = useCallback((finalAnswers: Answers) => {
    setAnswers(finalAnswers);
    setAppState(AppState.IMAGE_UPLOAD);
  }, []);

  const handleGenerate = async (image: { base64: string; mimeType: string }) => {
    setUserImage(image);
    setAppState(AppState.LOADING);
    setError(null);
    try {
      // Detect gender from the image only once
      let gender = detectedGender;
      if (!gender) {
        gender = await detectGender(image);
        setDetectedGender(gender);
      }
      const answersWithGender = { ...answers, gender };

      const result = await generateStyleSuggestions(answersWithGender, image, dislikedStyles, userProfile);
      setSuggestions(result);
      setAppState(AppState.RESULTS);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = useCallback(() => {
    setAppState(AppState.QUESTIONNAIRE);
    setAnswers({});
    setUserImage(null);
    setSuggestions(null);
    setError(null);
    setDislikedStyles([]);
    setDislikedSuggestion(null);
    setDetectedGender(null);
    setIsProcessingFeedback(false);
    setShowFeedbackConfirmation(false);
  }, []);

  const handleDislike = useCallback((suggestion: StyleSuggestion) => {
    console.log('Dislike clicked for suggestion:', suggestion.theme);
    // Show feedback modal to capture reason
    setDislikedSuggestion(suggestion);
    setAppState(AppState.FEEDBACK);
  }, []);

  const generateNewSuggestionsInBackground = useCallback(async (dislikedTheme: string) => {
    if (!userImage || !answers) return;

    // Add the disliked style to the list
    const newDislikedStyle: DislikedStyle = {
      theme: dislikedTheme,
      reason: 'User disliked',
    };
    const updatedDislikedStyles = [...dislikedStyles, newDislikedStyle];
    setDislikedStyles(updatedDislikedStyles);

    // Generate new suggestions in background
    try {
      const result = await generateStyleSuggestions(answers, userImage, updatedDislikedStyles, userProfile);
      setSuggestions(currentSuggestions => {
        // Only update if we have fewer than 3 suggestions
        if (!currentSuggestions || currentSuggestions.length < 3) {
          return result;
        }
        return currentSuggestions;
      });
    } catch (e) {
      console.error('Background regeneration failed:', e);
    }
  }, [dislikedStyles, answers, userImage, userProfile]);

  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const [showFeedbackConfirmation, setShowFeedbackConfirmation] = useState(false);
  const [detectedGender, setDetectedGender] = useState<string | null>(null);

  const handleFeedbackSubmit = useCallback(async (reason: string) => {
    console.log('Feedback submitted:', reason);

    // Prevent multiple submissions
    if (isProcessingFeedback || !dislikedSuggestion || !userImage) {
      console.log('Ignoring duplicate or invalid feedback submission');
      return;
    }

    setIsProcessingFeedback(true);

    try {
      // Create structured feedback for the learning system
      const outfitMetadata = extractOutfitMetadata(dislikedSuggestion);
      const feedback: UserFeedback = {
        user_id: userId,
        outfit_id: `${dislikedSuggestion.theme}_${Date.now()}`,
        reason: reason,
        timestamp: new Date().toISOString(),
        outfit_metadata: outfitMetadata
      };

      // Update user profile with the new feedback
      const updatedProfile = updateProfileFromFeedback(userProfile, feedback);
      setUserProfile(updatedProfile);

      // Also maintain the legacy disliked styles for backward compatibility
      const newDislikedStyle: DislikedStyle = {
        theme: dislikedSuggestion.theme,
        reason: reason,
      };
      const updatedDislikedStyles = [...dislikedStyles, newDislikedStyle];
      setDislikedStyles(updatedDislikedStyles);

      // Use previously detected gender
      const answersWithGender = { ...answers, gender: detectedGender || 'Male' };

      // Show confirmation message and go back to results
      setShowFeedbackConfirmation(true);
      setAppState(AppState.RESULTS);

      // Hide confirmation after 3 seconds
      setTimeout(() => {
        setShowFeedbackConfirmation(false);
      }, 3000);

      // Generate new suggestions in background (limit to 1 new suggestion to avoid overload)
      try {
        // Generate only 1 new suggestion instead of 3 to be faster
        const result = await generateStyleSuggestions(answersWithGender, userImage, updatedDislikedStyles, updatedProfile, 1);
        console.log('New suggestions generated:', result.length);

        // Add new suggestions to existing ones (don't replace)
        setSuggestions(currentSuggestions => {
          if (!currentSuggestions) return result.slice(0, 2); // Take max 2 if no existing

          // Combine existing suggestions with new ones, avoiding duplicates
          const existingThemes = currentSuggestions.map(s => s.theme);
          const newSuggestions = result.filter(s => !existingThemes.includes(s.theme)).slice(0, 1); // Take only 1 new

          // Limit total to 5 suggestions max
          const combined = [...currentSuggestions, ...newSuggestions];
          return combined.slice(0, 5);
        });
      } catch (e) {
        console.error('Background regeneration failed:', e);
      }
    } finally {
      setIsProcessingFeedback(false);
      setDislikedSuggestion(null); // Clear the disliked suggestion
    }
  }, [isProcessingFeedback, dislikedSuggestion, userImage, dislikedStyles, answers, userProfile, userId]);

  const renderContent = () => {
    switch (appState) {
      case AppState.QUESTIONNAIRE:
        return <Questionnaire onComplete={handleQuestionnaireComplete} />;
      case AppState.IMAGE_UPLOAD:
         return (
             <div className="w-full h-full flex items-center justify-center p-4">
                <ImageUploader onGenerate={handleGenerate} />
             </div>
         );
      case AppState.LOADING:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="p-8 bg-surface-light rounded-xl border border-border-light shadow-lg">
              <LoadingSpinner />
              <h2 className="text-2xl font-bold mt-4 text-text-light">Generating your looks...</h2>
              <p className="text-muted-light mt-2 max-w-xs">Our AI stylist is crafting the perfect outfits. This might take a moment!</p>
            </div>
          </div>
        );
      case AppState.RESULTS:
        return suggestions ? <StyleResults suggestions={suggestions} onDislike={handleDislike} showFeedbackConfirmation={showFeedbackConfirmation} /> : null;
      case AppState.FEEDBACK:
        return <Feedback onFeedbackSubmit={handleFeedbackSubmit} />;
      case AppState.ERROR:
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="p-8 bg-surface-light rounded-xl border border-border-light shadow-lg max-w-md mx-auto">
                  <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong.</h2>
                  <p className="text-text-light mb-6">{error}</p>
                  <button
                  onClick={() => setAppState(AppState.IMAGE_UPLOAD)} // Go back to upload step
                  className="px-8 py-3 font-bold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                  >
                  Try Again
                  </button>
              </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] w-full">
        <main className="w-full h-full">
            {renderContent()}
        </main>
        <style>{`
          .animate-fade-in {
            animation: fadeIn 0.5s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
    </div>
  );
};

export default App;
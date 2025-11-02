import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserHeader from './components/UserHeader';
import Questionnaire from './components/Questionnaire';
import ImageUploader from './components/ImageUploader';
import StyleResults from './components/StyleResults';
import LoadingSpinner from './components/LoadingSpinner';
import Feedback from './components/Feedback';
import Onboarding from './components/Onboarding';
import { generateStyleSuggestions, extractOutfitMetadata, detectGender } from './services/geminiService';
import { initializeUserProfile, updateProfileFromFeedback, saveUserProfile, loadUserProfile } from './services/preferenceService';
import { PreferenceServiceSupabase } from './services/preferenceServiceSupabase';
import { VisionAnalysisService } from './services/visionAnalysisService';
import { PromptGenerationService } from './services/promptGenerationService';
import type { Answers, StyleSuggestion, DislikedStyle, UserProfile, UserFeedback, FeedbackReason } from './types';
import { AppState } from './types';

const AppContent: React.FC = () => {
  const { user } = useAuth(); // Obter Firebase user
  // Create test user for development if no Firebase user
  const userId = user?.id || 'test-user-' + Math.random().toString(36).substr(2, 9); // Test ID for development

  const [appState, setAppState] = useState<AppState>(AppState.IMAGE_UPLOAD); // Skip onboarding for testing
  const [answers, setAnswers] = useState<Answers>({});
  const [userImage, setUserImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [suggestions, setSuggestions] = useState<StyleSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dislikedStyles, setDislikedStyles] = useState<DislikedStyle[]>([]);
  const [dislikedSuggestion, setDislikedSuggestion] = useState<StyleSuggestion | null>(null);
  const [currentOutfitAnalysis, setCurrentOutfitAnalysis] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Backup for feedback processing to prevent null issues
  const [feedbackBackup, setFeedbackBackup] = useState<{suggestion: StyleSuggestion; analysis: any} | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const [detectedGender, setDetectedGender] = useState<string | null>(null);

  // Load user profile from Supabase when userId is available
  useEffect(() => {
    if (!userId) return; // Wait for Firebase user to be available

    const loadProfile = async () => {
      try {
        console.log('Loading profile for Firebase User ID:', userId);
        let profile = await PreferenceServiceSupabase.loadUserProfile(userId);

        if (!profile) {
          // Create default profile for testing (skip onboarding)
          console.log('No existing profile found, creating default profile for testing');
          const defaultAnswers: Answers = {
            gender: 'Male',
            age: '25-34',
            height: "5'10\" (178cm)",
            weight: '165 lbs (75kg)',
            fit: 'Regular',
            style: ['Smart Casual', 'Casual'],
            colors: ['Blue', 'White', 'Black', 'Gray'],
            occasions: ['Work', 'Weekend', 'Going out'],
            budget: 'Mid-range ($50-100)',
            brands: ['Uniqlo', 'H&M', 'Zara'],
            shopping: ['Online', 'In-store'],
            bodyShape: 'Average',
            skinTone: 'Medium',
            constraints: 'Spring, Summer, Fall; Work, Weekend, Going out'
          };

          profile = await PreferenceServiceSupabase.initializeUserProfile(userId, defaultAnswers);
          setAnswers(defaultAnswers);
          console.log('Default profile created for testing');
        }

        setUserProfile(profile);
        console.log('Profile loaded successfully');
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  // Save profile whenever it changes
  useEffect(() => {
    if (userProfile) {
      saveUserProfile(userProfile);
    }
  }, [userProfile]);


  const handleQuestionnaireComplete = useCallback(async (finalAnswers: Answers) => {
    if (!userId) {
      console.error('No Firebase user available for profile creation');
      setError('You must be logged in to create a profile. Please try logging in again.');
      setAppState(AppState.ERROR);
      return;
    }

    setAnswers(finalAnswers);
    console.log('Creating profile for Firebase User ID:', userId);

    // Create user profile from onboarding answers
    try {
      const profile = await PreferenceServiceSupabase.initializeUserProfile(userId, finalAnswers);
      setUserProfile(profile);
      console.log('Profile created successfully');
      setAppState(AppState.IMAGE_UPLOAD);
    } catch (error) {
      console.error('Error creating user profile:', error);
      setError('Failed to create your profile. Please try again.');
      setAppState(AppState.ERROR);
    }
  }, [userId]);

  const handleGenerate = async (image: { base64: string; mimeType: string }) => {
    // Wait for profile to be available (create default if needed)
    if (!userProfile && userId) {
      console.log('No profile found, creating default profile for testing...');
      try {
        const defaultAnswers: Answers = {
          gender: 'Male',
          age: '25-34',
          height: "5'10\" (178cm)",
          weight: '165 lbs (75kg)',
          fit: 'Regular',
          style: ['Smart Casual', 'Casual'],
          colors: ['Blue', 'White', 'Black', 'Gray'],
          occasions: ['Work', 'Weekend', 'Going out'],
          budget: 'Mid-range ($50-100)',
          brands: ['Uniqlo', 'H&M', 'Zara'],
          shopping: ['Online', 'In-store'],
          bodyShape: 'Average',
          skinTone: 'Medium',
          constraints: 'Spring, Summer, Fall; Work, Weekend, Going out'
        };

        const profile = await PreferenceServiceSupabase.initializeUserProfile(userId, defaultAnswers);
        setUserProfile(profile);
        setAnswers(defaultAnswers);
        console.log('✅ Default profile created successfully');
      } catch (error) {
        console.error('Failed to create default profile:', error);
        setError('Failed to create your profile. Please try again.');
        setAppState(AppState.ERROR);
        return;
      }
    }

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

      // Generate style suggestions using the new system
      const result = await generateStyleSuggestions(answersWithGender, image, dislikedStyles, userProfile);

      // Enhance suggestions with Vision AI analysis
      const enhancedSuggestions = await Promise.all(
        result.map(suggestion => VisionAnalysisService.enhanceWithAnalysis(suggestion))
      );

      // Score and sort suggestions based on user preferences
      const scoredSuggestions = enhancedSuggestions
        .map(suggestion => {
          if (!suggestion.analysis) return suggestion;

          const { score, explanation } = PromptGenerationService.scoreOutfitForUser(
            userProfile,
            suggestion.analysis
          );

          return {
            ...suggestion,
            score,
            whyThis: explanation
          };
        })
        .filter(suggestion => !suggestion.score || suggestion.score > -50) // Filter out very bad matches
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      setSuggestions(scoredSuggestions);
      setAppState(AppState.RESULTS);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = useCallback(() => {
    setAppState(AppState.ONBOARDING);
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
    console.log('=== APP HANDLE DISLIKE ===');
    console.log('Dislike clicked for suggestion:', suggestion.theme);
    console.log('Current isProcessingFeedback:', isProcessingFeedback);
    console.log('Current suggestions count:', suggestions?.length || 0);

    // REMOÇÃO IMEDIATA: Remove a sugestão da lista imediatamente
    setSuggestions(currentSuggestions => {
      console.log('Before filter, suggestions count:', currentSuggestions?.length || 0);

      if (!currentSuggestions) {
        console.log('❌ No current suggestions, returning');
        return currentSuggestions;
      }

      // Remove a sugestão rejeitada imediatamente
      const filtered = currentSuggestions.filter(s => s.theme !== suggestion.theme);
      console.log('✅ Suggestion removed immediately. Remaining:', filtered.length);
      console.log('Removed suggestion with theme:', suggestion.theme);
      console.log('Remaining themes:', filtered.map(s => s.theme));

      // Se ficarmos com poucas sugestões, já começamos a gerar mais
      if (filtered.length < 3) {
        console.log('Low suggestions detected, starting background generation');
        setTimeout(() => generateMoreInBackground(suggestion.theme), 100);
      }

      return filtered;
    });

    // CRITICAL: Create backup BEFORE setting states that might be cleared
    setFeedbackBackup({
      suggestion: suggestion,
      analysis: suggestion.analysis
    });

    // Show feedback modal to capture micro-reasons
    setDislikedSuggestion(suggestion);
    setCurrentOutfitAnalysis(suggestion.analysis);
    setAppState(AppState.FEEDBACK);
  }, []); // Removido isProcessingFeedback da dependência

  const generateMoreInBackground = useCallback(async (dislikedTheme?: string) => {
    if (!userImage || !answers || !userProfile) {
      console.log('Missing required data for background generation');
      return;
    }

    // Add the disliked style to the list if provided
    let updatedDislikedStyles = dislikedStyles;
    if (dislikedTheme) {
      const newDislikedStyle: DislikedStyle = {
        theme: dislikedTheme,
        reason: 'User disliked',
      };
      updatedDislikedStyles = [...dislikedStyles, newDislikedStyle];
      setDislikedStyles(updatedDislikedStyles);
    }

    console.log('Starting background generation...');

    // Generate 2-3 new suggestions in background
    try {
      const answersWithGender = { ...answers, gender: detectedGender || 'Male' };
      const result = await generateStyleSuggestions(answersWithGender, userImage, updatedDislikedStyles, userProfile, 3);

      const enhancedNewSuggestions = await Promise.all(
        result.map(suggestion => VisionAnalysisService.enhanceWithAnalysis(suggestion))
      );

      setSuggestions(currentSuggestions => {
        if (!currentSuggestions) return enhancedNewSuggestions;

        // Add only new themes that don't exist yet
        const existingThemes = currentSuggestions.map(s => s.theme);
        const newSuggestions = enhancedNewSuggestions.filter(s => !existingThemes.includes(s.theme));

        // Combine and maintain a pool of 5-7 suggestions
        const combined = [...currentSuggestions, ...newSuggestions];
        const finalSuggestions = combined.slice(0, 7);

        console.log(`Background generation complete: ${finalSuggestions.length} total suggestions`);
        console.log(`Existing themes: [${existingThemes.join(', ')}]`);
        console.log(`New themes: [${newSuggestions.map(s => s.theme).join(', ')}]`);
        return finalSuggestions;
      });
    } catch (e) {
      console.error('Background regeneration failed:', e);
    }
  }, [dislikedStyles, answers, userImage, userProfile, detectedGender]);

  const generateNewSuggestionsInBackground = useCallback(async (dislikedTheme: string) => {
    await generateMoreInBackground(dislikedTheme);
  }, [generateMoreInBackground]);

  const [showFeedbackConfirmation, setShowFeedbackConfirmation] = useState(false);
  const [isGeneratingInBackground, setIsGeneratingInBackground] = useState(false);

  // Geração contínua: manter sempre 5+ sugestões disponíveis
  useEffect(() => {
    const ensureEnoughSuggestions = async () => {
      if (!suggestions || !userImage || !answers || !userProfile || isGeneratingInBackground) {
        return;
      }

      if (suggestions.length < 5) {
        console.log('Auto-generating more suggestions. Current count:', suggestions.length);
        setIsGeneratingInBackground(true);
        await generateMoreInBackground();
        setIsGeneratingInBackground(false);
      }
    };

    // Verificar a cada 10 segundos
    const interval = setInterval(ensureEnoughSuggestions, 10000);

    // Verificar imediatamente quando as sugestões mudam
    ensureEnoughSuggestions();

    return () => clearInterval(interval);
  }, [suggestions, userImage, answers, userProfile, isGeneratingInBackground, generateMoreInBackground]);

  const handleFeedbackSubmit = useCallback(async (microReasons: FeedbackReason[]) => {
    console.log('=== FEEDBACK SUBMIT DEBUG ===');
    console.log('Feedback submitted with micro-reasons:', microReasons);
    console.log('Initial state:', {
      isProcessingFeedback,
      hasDislikedSuggestion: !!dislikedSuggestion,
      hasUserProfile: !!userProfile,
      hasUserId: !!userId
    });

    // CRITICAL FIX: Force reset if stuck in processing state
    if (isProcessingFeedback) {
      console.log('🚨 Forcing reset of stuck processing state');
      setIsProcessingFeedback(false);
      setDislikedSuggestion(null);
      setCurrentOutfitAnalysis(null);

      // Wait a moment for state to update, then continue
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // CRITICAL FIX: Use backup if dislikedSuggestion was cleared
    const suggestionToUse = dislikedSuggestion || feedbackBackup?.suggestion;
    const analysisToUse = currentOutfitAnalysis || feedbackBackup?.analysis;

    if (!suggestionToUse || !userProfile || !userId) {
      console.log('❌ Invalid feedback submission - missing required data');
      console.log('isProcessingFeedback:', isProcessingFeedback);
      console.log('hasDislikedSuggestion:', !!dislikedSuggestion);
      console.log('hasFeedbackBackup:', !!feedbackBackup);
      console.log('hasUserProfile:', !!userProfile);
      console.log('hasUserId:', !!userId);

      // Reset states even on invalid submission to prevent getting stuck
      setIsProcessingFeedback(false);
      setDislikedSuggestion(null);
      setCurrentOutfitAnalysis(null);
      setFeedbackBackup(null);
      return;
    }

    console.log('✅ Processing feedback for Firebase User ID:', userId);
    console.log('Using suggestion:', suggestionToUse.theme);

    // Set processing state IMMEDIATELY to prevent race conditions
    setIsProcessingFeedback(true);

    // Add safety timeout to prevent infinite processing
    const safetyTimeout = setTimeout(() => {
      if (isProcessingFeedback) {
        console.log('🚨 Safety timeout triggered - forcing feedback processing reset');
        setIsProcessingFeedback(false);
        setDislikedSuggestion(null);
        setCurrentOutfitAnalysis(null);
      }
    }, 10000); // 10 second safety timeout

    const analysis = analysisToUse;
    if (!analysis) {
      console.error('No outfit analysis available for feedback processing');
      setIsProcessingFeedback(false);
      setError('We could not read the outfit details. Please try again.');
      return;
    }

    let handledSuccessfully = false;

    try {
      console.log('🔄 Starting feedback processing operations...');

      await PreferenceServiceSupabase.saveFeedback(
        userId,
        undefined,
        suggestionToUse.theme,
        'dislike',
        analysis,
        microReasons
      );

      console.log('✅ Feedback saved to database');

      const updatedProfile = await PreferenceServiceSupabase.updatePreferencesFromFeedback(
        userProfile,
        analysis,
        'dislike',
        microReasons
      );

      console.log('✅ User profile updated');
      setUserProfile(updatedProfile);

      const newDislikedStyle: DislikedStyle = {
        theme: suggestionToUse.theme,
        reason: microReasons.join(', '),
      };
      const updatedDislikedStyles = [...dislikedStyles, newDislikedStyle];
      setDislikedStyles(updatedDislikedStyles);

      console.log('✅ Disliked styles updated');

      setShowFeedbackConfirmation(true);
      setAppState(AppState.RESULTS);

      setTimeout(() => {
        setShowFeedbackConfirmation(false);
      }, 3000);

      handledSuccessfully = true;
      console.log('✅ All feedback operations completed successfully');

      try {
        const constraints = updatedProfile.onboardingConstraints;
        const contexts = constraints.contexts;
        const seasons = constraints.seasons;

        const prompts = PromptGenerationService.generateOutfitPrompt(
          updatedProfile,
          contexts?.[0],
          seasons?.[0],
          3  // Generate 3 new styles for variety
        );

        const answersWithGender = { ...answers, gender: detectedGender || 'Male' };
        const result = await generateStyleSuggestions(answersWithGender, userImage, updatedDislikedStyles, updatedProfile, 3);

        const enhancedNewSuggestions = await Promise.all(
          result.map(suggestion => VisionAnalysisService.enhanceWithAnalysis(suggestion))
        );

        // A remoção já foi feita imediatamente no handleDislike
        // Agora só adicionamos novas sugestões
        setSuggestions(currentSuggestions => {
          if (!currentSuggestions) return enhancedNewSuggestions;

          // Adicionar novas sugestões que ainda não existem
          const existingThemes = currentSuggestions.map(s => s.theme);
          const newSuggestions = enhancedNewSuggestions.filter(s => !existingThemes.includes(s.theme));

          // Combinar e manter pool de até 7 sugestões
          const combined = [...currentSuggestions, ...newSuggestions];
          console.log(`Added ${newSuggestions.length} new suggestions. Total: ${combined.length}`);
          console.log(`After feedback - Existing: [${existingThemes.join(', ')}]`);
          console.log(`After feedback - New: [${newSuggestions.map(s => s.theme).join(', ')}]`);

          return combined.slice(0, 7);
        });
      } catch (e) {
        console.error('Background regeneration failed:', e);
      }
    } catch (error) {
      console.error('Error processing feedback:', error);
      setError('Failed to process feedback. Please try again.');
    } finally {
      // Clear the safety timeout
      clearTimeout(safetyTimeout);

      // CRITICAL: Reset states IMMEDIATELY and also as backup
      console.log('🔄 FINALLY BLOCK: Resetting all feedback states');
      setIsProcessingFeedback(false);
      setDislikedSuggestion(null);
      setCurrentOutfitAnalysis(null);
      setFeedbackBackup(null);

      // Backup reset with delay to guarantee states are cleared
      setTimeout(() => {
        setIsProcessingFeedback(false);
        setDislikedSuggestion(null);
        setCurrentOutfitAnalysis(null);
        setFeedbackBackup(null);
        console.log('✅ Feedback processing completed and states reset (backup)');
      }, 200);
    }
  }, [isProcessingFeedback, dislikedSuggestion, userProfile, userId, dislikedStyles, answers, detectedGender, currentOutfitAnalysis, userImage]);

  const renderContent = () => {
    switch (appState) {
      case AppState.ONBOARDING:
        return <Onboarding onComplete={handleQuestionnaireComplete} />;
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
        return <Feedback onFeedbackSubmit={handleFeedbackSubmit} outfitAnalysis={currentOutfitAnalysis} />;
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <UserHeader />
      <main className="w-full" style={{ height: 'calc(100vh - 64px)' }}>
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

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

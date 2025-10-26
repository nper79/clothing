import React, { useState, useCallback } from 'react';
import Questionnaire from './components/Questionnaire';
import ImageUploader from './components/ImageUploader';
import StyleResults from './components/StyleResults';
import LoadingSpinner from './components/LoadingSpinner';
import Feedback from './components/Feedback';
import { generateStyleSuggestions } from './services/geminiService';
import type { Answers, StyleSuggestion, DislikedStyle } from './types';
import { AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.QUESTIONNAIRE);
  const [answers, setAnswers] = useState<Answers>({});
  const [userImage, setUserImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [suggestions, setSuggestions] = useState<StyleSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dislikedStyles, setDislikedStyles] = useState<DislikedStyle[]>([]);
  const [dislikedSuggestion, setDislikedSuggestion] = useState<StyleSuggestion | null>(null);


  const handleQuestionnaireComplete = useCallback((finalAnswers: Answers) => {
    setAnswers(finalAnswers);
    setAppState(AppState.IMAGE_UPLOAD);
  }, []);

  const handleGenerate = async (image: { base64: string; mimeType: string }) => {
    setUserImage(image);
    setAppState(AppState.LOADING);
    setError(null);
    try {
      const result = await generateStyleSuggestions(answers, image, dislikedStyles);
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
  }, []);

  const handleDislike = useCallback((suggestion: StyleSuggestion) => {
    setDislikedSuggestion(suggestion);
    setAppState(AppState.FEEDBACK);
  }, []);

  const handleFeedbackSubmit = useCallback(async (reason: string) => {
    if (!dislikedSuggestion || !userImage) return;

    const newDislikedStyle: DislikedStyle = {
      theme: dislikedSuggestion.theme,
      reason: reason,
    };
    const updatedDislikedStyles = [...dislikedStyles, newDislikedStyle];
    setDislikedStyles(updatedDislikedStyles);

    // Regenerate suggestions
    setAppState(AppState.LOADING);
    setError(null);
    try {
      const result = await generateStyleSuggestions(answers, userImage, updatedDislikedStyles);
      setSuggestions(result);
      setAppState(AppState.RESULTS);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      setAppState(AppState.ERROR);
    }
  }, [dislikedSuggestion, userImage, dislikedStyles, answers]);

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
        return suggestions ? <StyleResults suggestions={suggestions} onDislike={handleDislike} /> : null;
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
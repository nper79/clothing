import React, { useState, useEffect } from 'react';
import type { StyleSuggestion } from '../types';

// Extend Window interface for our click tracking
declare global {
  interface Window {
    lastDislikeClick?: number;
  }
}

interface StyleResultsProps {
  suggestions: StyleSuggestion[];
  onDislike: (suggestion: StyleSuggestion) => void;
  showFeedbackConfirmation?: boolean;
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex">
        <span className="w-28 flex-shrink-0 font-semibold">{label}</span>
        <span className="text-muted-light dark:text-muted-dark">{value}</span>
    </div>
);

const StyleResults: React.FC<StyleResultsProps> = ({ suggestions, onDislike, showFeedbackConfirmation = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [disloadingIndex, setDisloadingIndex] = useState<number | null>(null);
  const [showWhyThis, setShowWhyThis] = useState(false);
  const [likedIndex, setLikedIndex] = useState<number | null>(null);
  const [loveIndex, setLoveIndex] = useState<number | null>(null);

  // Removido indicador de geração em background

  // Reset activeIndex se ficar fora dos limites (quando sugestões são removidas)
  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setActiveIndex(prev => {
        const newIndex = Math.min(prev, suggestions.length - 1);
        console.log('Adjusting activeIndex from', prev, 'to', newIndex, 'Total suggestions:', suggestions.length);
        return newIndex;
      });

      // Reset loading states when suggestions change
      setDisloadingIndex(null);
      console.log('Reset loading states due to suggestions change');
    }
  }, [suggestions]);

  const handleNext = () => {
    if (!suggestions || suggestions.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % suggestions.length);
    console.log('Moving to next suggestion, new index:', (activeIndex + 1) % suggestions.length);
  };

  const handlePrev = () => {
    if (!suggestions || suggestions.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    console.log('Moving to previous suggestion, new index:', (activeIndex - 1 + suggestions.length) % suggestions.length);
  };

  const handleDislikeClick = (suggestion: StyleSuggestion, index: number) => {
    console.log('=== DISLIKE CLICK DEBUG ===');
    console.log('Clicked index:', index);
    console.log('Active index:', activeIndex);
    console.log('Current suggestions count:', suggestions.length);
    console.log('Suggestion theme:', suggestion.theme);
    console.log('disloadingIndex:', disloadingIndex);

    // Prevent multiple clicks on the same button
    if (disloadingIndex === activeIndex) {
      console.log('❌ Button already processing, ignoring click');
      return;
    }

    // Additional safeguard: prevent rapid successive clicks
    const now = Date.now();
    if (window.lastDislikeClick && (now - window.lastDislikeClick < 500)) {
      console.log('❌ Rapid click detected, ignoring');
      return;
    }
    window.lastDislikeClick = now;

    // IMPORTANT: Always use activeIndex, not the passed index
    const actualIndex = activeIndex;
    console.log('Using actualIndex:', actualIndex, 'instead of passed index:', index);

    // Set loading state
    console.log('✅ Setting loading state for index:', actualIndex);
    setDisloadingIndex(actualIndex);

    // Call the parent function
    console.log('✅ Calling onDislike with suggestion:', suggestion.theme);
    onDislike(suggestion);

    // Reset loading state
    setTimeout(() => {
      console.log('✅ Resetting loading state for index:', actualIndex);
      setDisloadingIndex(null);
    }, 300);

    console.log('=== END DISLIKE CLICK DEBUG ===');
  };

  const handleLikeClick = (suggestion: StyleSuggestion, index: number) => {
    console.log('Like button clicked for:', suggestion.theme);
    setLikedIndex(index);

    // Animar o botão
    setTimeout(() => {
      setLikedIndex(null);
    }, 1500);

    // TODO: Aqui podes adicionar a lógica de like no futuro
    console.log('Like functionality to be implemented');
  };

  const handleLoveClick = (suggestion: StyleSuggestion, index: number) => {
    console.log('Love button clicked for:', suggestion.theme);
    setLoveIndex(index);

    // Animar o botão com duração maior
    setTimeout(() => {
      setLoveIndex(null);
    }, 2000);

    // TODO: Aqui podes adicionar a lógica de love no futuro
    console.log('Love functionality to be implemented');
  };

  const activeSuggestion = suggestions[activeIndex];
  if (!activeSuggestion) return null;

  const { explanation, whyThis, score } = activeSuggestion;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-text-light dark:text-text-dark">
      {/* Feedback Confirmation Message */}
      {showFeedbackConfirmation && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-medium">Thanks! We'll improve recommendations based on your feedback.</span>
          </div>
        </div>
      )}

      {/* Like Feedback Animation */}
      {likedIndex === activeIndex && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="relative">
            <div className="text-6xl text-green-500 animate-bounce">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1, 'wght' 700"}}>favorite</span>
            </div>
            <div className="absolute -inset-4 bg-green-400/20 rounded-full animate-ping"></div>
            <div className="absolute top-0 left-0 text-white font-bold text-xl animate-pulse">+1</div>
          </div>
        </div>
      )}

      {/* Love Feedback Animation */}
      {loveIndex === activeIndex && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="relative">
            <div className="text-6xl bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent animate-spin">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1, 'wght' 700"}}>auto_awesome</span>
            </div>
            <div className="absolute -inset-4 bg-gradient-to-r from-pink-300/30 to-purple-300/30 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 text-white font-bold text-xl animate-bounce">+2</div>
            {/* Particles animados */}
            <div className="absolute -top-8 -left-8 text-yellow-400 text-2xl animate-ping">
              <span className="material-symbols-outlined">star</span>
            </div>
            <div className="absolute -top-4 -right-6 text-pink-400 text-xl animate-ping" style={{animationDelay: '0.2s'}}>
              <span className="material-symbols-outlined">star</span>
            </div>
            <div className="absolute -bottom-6 -left-4 text-purple-400 text-xl animate-ping" style={{animationDelay: '0.4s'}}>
              <span className="material-symbols-outlined">star</span>
            </div>
          </div>
        </div>
      )}

      {/* Large Image Section - mostra a outfit completa */}
      <div className="relative h-[85vh] w-full bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        {/* Container para imagem com proporção controlada */}
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <img
            src={activeSuggestion.image}
            alt={activeSuggestion.theme}
            className="max-h-[75vh] max-w-full object-contain shadow-2xl rounded-lg"
            style={{
              objectFit: 'contain',
              maxHeight: '75vh',
              width: 'auto'
            }}
          />
        </div>
        {/* Gradiente suave sobre a imagem */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none"></div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 transform rounded-full bg-white/70 p-2 text-text-light shadow-md backdrop-blur-sm transition hover:bg-white"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 transform rounded-full bg-white/70 p-2 text-text-light shadow-md backdrop-blur-sm transition hover:bg-white"
        >
          <span className="material-symbols-outlined">arrow_forward_ios</span>
        </button>

              </div>

      {/* Content Section - below image */}
      <div className="bg-background-light dark:bg-background-dark">
        {/* Action Buttons */}
        <div className="flex w-full items-center justify-center gap-2 px-4 py-3">
          <button
            onClick={() => setShowWhyThis(!showWhyThis)}
            className={`flex flex-col items-center justify-center h-14 w-20 rounded-lg transition-all duration-300 ${
              showWhyThis
                ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">info</span>
            <span className="text-xs font-medium">Why this?</span>
          </button>
          <button
            onClick={() => handleDislikeClick(activeSuggestion, activeIndex)}
            disabled={disloadingIndex === activeIndex}
            className={`flex flex-col items-center justify-center h-16 w-24 rounded-lg transition-all duration-300 relative overflow-hidden ${
              disloadingIndex === activeIndex
                ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-surface-light dark:bg-surface-dark shadow-md text-red-500 hover:scale-105 active:scale-95 cursor-pointer'
            }`}
            style={{ pointerEvents: disloadingIndex === activeIndex ? 'none' : 'auto' }}
          >
            {disloadingIndex === activeIndex ? (
              <>
                <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin mb-1"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">Loading</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'wght' 500"}}>close</span>
                <span className="text-xs font-bold uppercase tracking-wider">Dislike</span>
              </>
            )}
            {/* Animação de ripple effect */}
            {disloadingIndex === activeIndex && (
              <div className="absolute inset-0 bg-red-200/20 animate-ping"></div>
            )}
          </button>

          <button
            onClick={() => handleLikeClick(activeSuggestion, activeIndex)}
            className={`flex flex-col items-center justify-center h-20 w-32 rounded-lg bg-primary text-white shadow-lg transition-all duration-300 relative overflow-hidden ${
              likedIndex === activeIndex
                ? 'bg-green-500 scale-110'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            {/* Animação de corações */}
            {likedIndex === activeIndex && (
              <>
                <div className="absolute inset-0 bg-white/30 animate-ping"></div>
                <div className="absolute top-2 left-2 text-white/80 animate-bounce">
                  <span className="material-symbols-outlined text-sm">favorite</span>
                </div>
                <div className="absolute top-4 right-4 text-white/60 animate-bounce" style={{animationDelay: '0.2s'}}>
                  <span className="material-symbols-outlined text-xs">favorite</span>
                </div>
                <div className="absolute bottom-6 left-6 text-white/40 animate-bounce" style={{animationDelay: '0.4s'}}>
                  <span className="material-symbols-outlined text-xs">favorite</span>
                </div>
              </>
            )}

            <span className={`material-symbols-outlined text-4xl transition-transform duration-300 ${
              likedIndex === activeIndex ? 'scale-125 animate-pulse' : ''
            }`} style={{fontVariationSettings: "'FILL' 1, 'wght' 600"}}>
              {likedIndex === activeIndex ? 'favorite' : 'favorite'}
            </span>
            <span className="text-sm font-bold uppercase tracking-wider">
              {likedIndex === activeIndex ? 'Liked!' : 'Like'}
            </span>
          </button>

          <button
            onClick={() => handleLoveClick(activeSuggestion, activeIndex)}
            className={`flex flex-col items-center justify-center h-16 w-24 rounded-lg bg-surface-light dark:bg-surface-dark shadow-md text-primary dark:text-primary-light transition-all duration-300 relative overflow-hidden ${
              loveIndex === activeIndex
                ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white scale-110'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            {/* Animação de sparkles */}
            {loveIndex === activeIndex && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/40 to-pink-300/40 animate-pulse"></div>
                <div className="absolute top-1 left-2 text-yellow-400 animate-spin">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                </div>
                <div className="absolute top-3 right-3 text-pink-400 animate-spin" style={{animationDelay: '0.3s', animationDuration: '2s'}}>
                  <span className="material-symbols-outlined text-xs">auto_awesome</span>
                </div>
                <div className="absolute bottom-2 left-4 text-purple-400 animate-spin" style={{animationDelay: '0.6s', animationDuration: '1.5s'}}>
                  <span className="material-symbols-outlined text-xs">auto_awesome</span>
                </div>
              </>
            )}

            <span className={`material-symbols-outlined text-3xl transition-all duration-300 ${
              loveIndex === activeIndex ? 'scale-125 animate-bounce' : ''
            }`} style={{fontVariationSettings: "'FILL' 1, 'wght' 500"}}>
              auto_awesome
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              loveIndex === activeIndex ? 'text-white' : ''
            }`}>
              {loveIndex === activeIndex ? 'Loved!' : 'Love It'}
            </span>
          </button>
        </div>

        {/* Counter de sugestões disponíveis */}
        <div className="flex justify-center mb-2">
          <div className="text-xs text-muted-light dark:text-muted-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            {suggestions.length} estilos disponíveis
          </div>
        </div>

        {/* Why This Explanation */}
        {showWhyThis && whyThis && (
          <div className="mx-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mt-0.5">
                lightbulb
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Why we chose this for you:
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {whyThis}
                </p>
                {score !== undefined && (
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                    Match score: {Math.round(score * 100)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-16">
          <div className="space-y-4">
            <h1 className="font-serif text-2xl font-bold">{explanation.title}</h1>
            <div>
              <h2 className="text-lg font-bold text-primary dark:text-primary-light">Why it Works for You</h2>
              <p className="mt-1 text-muted-light dark:text-muted-dark">
                {explanation.whyItWorks}
              </p>
            </div>
            <div className="space-y-2">
              <DetailRow label="Occasions" value={explanation.occasions} />
              <DetailRow label="Base Outfit" value="White T-shirt, Straight-leg Jeans" />
              <DetailRow label="Preferred Fit" value={explanation.preferredFit} />
              <DetailRow label="Go-to Shoes" value="White Sneakers, Loafers" />
              <DetailRow label="Constraints" value={explanation.constraints} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleResults;
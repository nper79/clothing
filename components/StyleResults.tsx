import React, { useState } from 'react';
import type { StyleSuggestion } from '../types';

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

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % suggestions.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
  };

  const handleDislikeClick = (suggestion: StyleSuggestion, index: number) => {
    console.log('Dislike button clicked in StyleResults');
    setDisloadingIndex(index);
    onDislike(suggestion);
    // Reset loading state after a delay
    setTimeout(() => setDisloadingIndex(null), 2000);
  };

  const activeSuggestion = suggestions[activeIndex];
  if (!activeSuggestion) return null;

  const { explanation } = activeSuggestion;

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

      {/* Large Image Section - scrolls normally */}
      <div className="relative h-screen w-full bg-cover bg-center bg-no-repeat"
           style={{ backgroundImage: `url("${activeSuggestion.image}")` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

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
        <div className="flex w-full items-center justify-center gap-4 px-4 py-3">
          <button
            onClick={() => handleDislikeClick(activeSuggestion, activeIndex)}
            disabled={disloadingIndex === activeIndex}
            className={`flex flex-col items-center justify-center h-16 w-24 rounded-lg transition-all duration-300 ${
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
          </button>
          <button className="flex flex-col items-center justify-center h-20 w-32 rounded-lg bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1, 'wght' 600"}}>favorite</span>
            <span className="text-sm font-bold uppercase tracking-wider">Like</span>
          </button>
          <button className="flex flex-col items-center justify-center h-16 w-24 rounded-lg bg-surface-light dark:bg-surface-dark shadow-md text-primary dark:text-primary-light transition-transform hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1, 'wght' 500"}}>auto_awesome</span>
            <span className="text-xs font-bold uppercase tracking-wider">Love It</span>
          </button>
        </div>

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
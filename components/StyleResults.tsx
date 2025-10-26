import React, { useState } from 'react';
import type { StyleSuggestion } from '../types';

interface StyleResultsProps {
  suggestions: StyleSuggestion[];
  onDislike: (suggestion: StyleSuggestion) => void;
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex">
        <span className="w-28 flex-shrink-0 font-semibold">{label}</span>
        <span className="text-muted-light">{value}</span>
    </div>
);

const StyleResults: React.FC<StyleResultsProps> = ({ suggestions, onDislike }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % suggestions.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
  };
  
  const activeSuggestion = suggestions[activeIndex];
  if (!activeSuggestion) return null;

  const { explanation } = activeSuggestion;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden animate-fade-in">
        <div 
            className="relative h-[65dvh] w-full flex-shrink-0 bg-cover bg-center bg-no-repeat transition-all duration-500" 
            style={{ backgroundImage: `url("${activeSuggestion.image}")` }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
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

        <div className="flex h-[35dvh] w-full flex-col bg-background-light">
            <div className="flex w-full items-center justify-center gap-4 px-4 py-3">
                <button onClick={() => onDislike(activeSuggestion)} className="flex flex-col items-center justify-center h-16 w-24 rounded-lg bg-surface-light shadow-md text-red-500 transition-transform hover:scale-105 active:scale-95">
                    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'wght' 500"}}>close</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Dislike</span>
                </button>
                <button className="flex flex-col items-center justify-center h-20 w-32 rounded-lg bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                    <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1, 'wght' 600"}}>favorite</span>
                    <span className="text-sm font-bold uppercase tracking-wider">Like</span>
                </button>
                <button className="flex flex-col items-center justify-center h-16 w-24 rounded-lg bg-surface-light shadow-md text-primary transition-transform hover:scale-105 active:scale-95">
                    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1, 'wght' 500"}}>auto_awesome</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Love It</span>
                </button>
            </div>

            <div className="flex-grow overflow-y-auto px-6 pb-6">
                <div className="space-y-4">
                    <h1 className="font-serif text-2xl font-bold">{explanation.title}</h1>
                    <div>
                        <h2 className="text-lg font-bold text-primary">Why it Works for You</h2>
                        <p className="mt-1 text-muted-light">{explanation.whyItWorks}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <DetailRow label="Occasions" value={explanation.occasions} />
                        <DetailRow label="Preferred Fit" value={explanation.preferredFit} />
                        <DetailRow label="Constraints" value={explanation.constraints} />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StyleResults;
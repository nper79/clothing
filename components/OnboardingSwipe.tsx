import React, { useState } from 'react';
import type { Answers } from '../types';

interface OnboardingSwipeProps {
  onComplete: (answers: Answers) => void;
}

const OnboardingSwipe: React.FC<OnboardingSwipeProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  // Question 1: Gender selection
  const genderOptions = [
    { id: 'male', label: 'Male', icon: '👨' },
    { id: 'female', label: 'Female', icon: '👩' },
    { id: 'other', label: 'Other', icon: '🧑' },
    { id: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' }
  ];

  // Question 2: Types of clothes
  const clothesTypes = [
    { id: 'casual', label: 'Casual', icon: '👕' },
    { id: 'business_casual', label: 'Business casual', icon: '👔' },
    { id: 'night_out', label: 'Night out', icon: '✨' },
    { id: 'active', label: 'Active', icon: '🏃' },
    { id: 'leisure', label: 'Leisure', icon: '🛋️' },
    { id: 'special_occasions', label: 'Special occasions', icon: '🎉' }
  ];

  // Question 2: Comfort zone slider
  const getComfortLabel = (value: number): string => {
    if (value <= 2) return 'Very Conservative';
    if (value <= 4) return 'Conservative';
    if (value <= 6) return 'Balanced';
    if (value <= 8) return 'Experimental';
    return 'Very Experimental';
  };

  // Question 3: Style keywords
  const styleKeywords = [
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'bold', label: 'Bold' },
    { id: 'classic', label: 'Classic' },
    { id: 'colorful', label: 'Colorful' },
    { id: 'edgy', label: 'Edgy' },
    { id: 'elegant', label: 'Elegant' },
    { id: 'relaxed', label: 'Relaxed' },
    { id: 'vintage', label: 'Vintage' }
  ];

  // Question 4: Deal-breakers
  const dealbreakers = [
    { id: 'formal_wear', label: 'Formal wear' },
    { id: 'tight_fits', label: 'Tight fits' },
    { id: 'bright_colors', label: 'Bright colors' },
    { id: 'bold_patterns', label: 'Bold patterns' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'layering', label: 'Layering' }
  ];

  const totalSteps = 5;

  const handleGenderSelect = (genderId: string) => {
    setAnswers(prev => ({ ...prev, gender: genderId }));
  };

  const handleClothesTypeToggle = (typeId: string) => {
    setAnswers(prev => {
      const currentTypes = prev.context || [];
      const updatedTypes = currentTypes.includes(typeId)
        ? currentTypes.filter((t: string) => t !== typeId)
        : [...currentTypes, typeId];
      return { ...prev, context: updatedTypes };
    });
  };

  const handleComfortChange = (value: number) => {
    setAnswers(prev => ({ ...prev, comfortLevel: value }));
  };

  const handleKeywordToggle = (keywordId: string) => {
    setAnswers(prev => {
      const currentKeywords = prev.keywords || [];
      const updatedKeywords = currentKeywords.includes(keywordId)
        ? currentKeywords.filter((k: string) => k !== keywordId)
        : [...currentKeywords, keywordId];
      return { ...prev, keywords: updatedKeywords };
    });
  };

  const handleDealbreakerToggle = (dealbreakerId: string) => {
    setAnswers(prev => {
      const currentDealbreakers = prev.dealbreakers || [];
      const updatedDealbreakers = currentDealbreakers.includes(dealbreakerId)
        ? currentDealbreakers.filter((d: string) => d !== dealbreakerId)
        : [...currentDealbreakers, dealbreakerId];
      return { ...prev, dealbreakers: updatedDealbreakers };
    });
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return answers.gender !== undefined; // Gender selection
      case 1:
        return (answers.context || []).length > 0; // Clothes types
      case 2:
        return answers.comfortLevel !== undefined; // Comfort level
      case 3:
        return (answers.keywords || []).length > 0; // Style keywords
      case 4:
        return true; // Deal-breakers are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(answers);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === totalSteps - 1) {
      onComplete(answers);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const getProgressPercentage = () => ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Question 1: Gender selection */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                What's your gender?
              </h2>
              <p className="text-gray-600">This helps us show you the most relevant styles</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {genderOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleGenderSelect(option.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    answers.gender === option.id
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 2: Types of clothes */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                What types of clothes are you looking for?
              </h2>
              <p className="text-gray-600">Select all that apply</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {clothesTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleClothesTypeToggle(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    (answers.context || []).includes(type.id)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 3: Comfort level */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                How would you describe your comfort zone?
              </h2>
              <p className="text-gray-600">Find your sweet spot</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Conservative</span>
                <span>Experimental</span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={answers.comfortLevel || 5}
                  onChange={(e) => handleComfortChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((answers.comfortLevel || 5) - 1) * 11.11}%, #e5e7eb ${((answers.comfortLevel || 5) - 1) * 11.11}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                  <span>6</span>
                  <span>7</span>
                  <span>8</span>
                  <span>9</span>
                  <span>10</span>
                </div>
              </div>

              <div className="text-center">
                <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-medium">
                  {getComfortLabel(answers.comfortLevel || 5)}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  Level: {answers.comfortLevel || 5}/10
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question 4: Style keywords */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Pick up to 3 words that describe your vibe
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Select keywords</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {(answers.keywords || []).length}/3 selected
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {styleKeywords.map(keyword => (
                <button
                  key={keyword.id}
                  onClick={() => handleKeywordToggle(keyword.id)}
                  disabled={!(answers.keywords || []).includes(keyword.id) && (answers.keywords || []).length >= 3}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    (answers.keywords || []).includes(keyword.id)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : (answers.keywords || []).length >= 3
                      ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{keyword.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 5: Deal-breakers */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Any deal-breakers?
              </h2>
              <p className="text-gray-600">Select what you definitely don't want to see (optional)</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {dealbreakers.map(dealbreaker => (
                <button
                  key={dealbreaker.id}
                  onClick={() => handleDealbreakerToggle(dealbreaker.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    (answers.dealbreakers || []).includes(dealbreaker.id)
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{dealbreaker.label}</div>
                </button>
              ))}
            </div>

            {(answers.dealbreakers || []).length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No deal-breakers selected - we'll show you everything!</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ← Previous
          </button>

          <div className="flex gap-3">
            {currentStep === totalSteps - 1 ? (
              <>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext()}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    canGoNext()
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Finish →
                </button>
              </>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  canGoNext()
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.3);
          border: 3px solid white;
          margin-top: -10px;
        }

        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.3);
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.5);
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.5);
        }

        .slider:focus {
          outline: none;
        }

        .slider::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 4px;
        }

        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default OnboardingSwipe;
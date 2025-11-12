import React, { useState, useEffect } from 'react';

interface OnboardingTransitionProps {
  onComplete: () => void;
}

const OnboardingTransition: React.FC<OnboardingTransitionProps> = ({ onComplete }) => {
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Animate content appearing
    setTimeout(() => setShowContent(true), 300);
    setTimeout(() => setShowButton(true), 800);
  }, []);

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Animated Eye Icon */}
        <div className={`mb-6 transition-all duration-1000 transform ${
          showContent ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}>
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-4">
            <span className="text-5xl animate-pulse">👀</span>
          </div>
        </div>

        {/* Main Message */}
        <div className={`space-y-4 transition-all duration-1000 transform ${
          showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Perfect! Now let's see what catches your eye 👀
          </h2>

          <p className="text-lg text-gray-600 mb-6">
            We'll show you a variety of styles. Swipe to rate how much you like each look.
          </p>

          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-700 font-medium mb-2">
              🎯 How it works:
            </p>
            <ul className="text-sm text-purple-600 text-left space-y-1">
              <li>• Swipe through 15 different style looks</li>
              <li>• Rate each look from 0-10</li>
              <li>• Give detailed feedback on specific pieces</li>
              <li>• We'll learn your unique style preferences</li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span>⏱️</span>
              <span>~3 minutes</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🎨</span>
              <span>15 styles</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🧠</span>
              <span>Smart learning</span>
            </span>
          </div>
        </div>

        {/* Continue Button */}
        <div className={`mt-8 transition-all duration-1000 transform ${
          showButton ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <button
            onClick={handleContinue}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-medium text-lg hover:scale-105"
          >
            Let's Start →
          </button>

          <p className="text-sm text-gray-500 mt-3">
            This will help us personalize your style recommendations
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTransition;
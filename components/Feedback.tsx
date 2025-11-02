import React, { useState } from 'react';
import type { FeedbackReason, OutfitAnalysis } from '../types';

interface FeedbackProps {
  onFeedbackSubmit: (reasons: FeedbackReason[]) => void;
  outfitAnalysis?: OutfitAnalysis;
}

const MICRO_REASON_OPTIONS: { reason: FeedbackReason; label: string; icon: string }[] = [
    { reason: 'Top', label: 'Top/Shirt', icon: 'checkroom' },
    { reason: 'Bottom', label: 'Bottom/Pants', icon: 'straighten' },
    { reason: 'Shoes', label: 'Shoes', icon: 'hiking' },
    { reason: 'Outerwear', label: 'Jacket/Outerwear', icon: 'dry_cleaning' },
    { reason: 'Accessories', label: 'Accessories', icon: 'watch' },
    { reason: 'Color', label: 'Colors', icon: 'palette' },
    { reason: 'Fit', label: 'Fit/Size', icon: 'fit_screen' },
    { reason: 'Pattern', label: 'Pattern', icon: 'texture' },
    { reason: 'Material', label: 'Material', icon: 'layers' },
    { reason: 'Overall vibe', label: 'Overall Style', icon: 'style' },
];

const Feedback: React.FC<FeedbackProps> = ({ onFeedbackSubmit, outfitAnalysis }) => {
    const [selectedReasons, setSelectedReasons] = useState<FeedbackReason[]>([]);

    const toggleReason = (reason: FeedbackReason) => {
        const newReasons = selectedReasons.includes(reason)
            ? selectedReasons.filter(r => r !== reason)
            : [...selectedReasons, reason];
        setSelectedReasons(newReasons);
    };

    const handleSubmit = () => {
        if (selectedReasons.length > 0) {
            onFeedbackSubmit(selectedReasons);
        }
    };

    const handleSkip = () => {
        onFeedbackSubmit([]); // No specific reasons
    };

    // Filter reasons based on outfit analysis if available
    const availableReasons = outfitAnalysis
        ? MICRO_REASON_OPTIONS.filter(option => {
              if (option.reason === 'Outerwear' || option.reason === 'Accessories') {
                  // Only show if the outfit actually has these items
                  return outfitAnalysis.items.some(item => item.id === option.reason.toLowerCase());
              }
              return true; // Always show other options
          })
        : MICRO_REASON_OPTIONS;

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-xl border border-gray-300 shadow-lg">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-gray-900">
                        What didn't you like about this outfit?
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Select one or more elements you'd like us to avoid in future looks
                    </p>
                </div>

                {/* Chip Selection */}
                <div className="mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {availableReasons.map((option) => {
                            const isSelected = selectedReasons.includes(option.reason);
                            return (
                                <button
                                    key={option.reason}
                                    onClick={() => toggleReason(option.reason)}
                                    className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                                        isSelected
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined">
                                            {option.icon}
                                        </span>
                                        <span>{option.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Reasons Display */}
                {selectedReasons.length > 0 && (
                    <div className="mb-8 p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm font-medium text-red-800 mb-2">
                            Selected reasons ({selectedReasons.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {selectedReasons.map(reason => (
                                <span
                                    key={reason}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                                >
                                    {MICRO_REASON_OPTIONS.find(opt => opt.reason === reason)?.label || reason}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={handleSkip}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedReasons.length === 0}
                        className={`flex-1 px-6 py-3 font-medium rounded-lg transition-colors ${
                            selectedReasons.length > 0
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Submit Feedback
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        Your feedback helps us learn your style preferences and avoid what you don't like.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Feedback;
import React from 'react';

interface FeedbackProps {
  onFeedbackSubmit: (reason: string) => void;
}

const FEEDBACK_OPTIONS = [
  "Not my style",
  "I don’t like the colors",
  "Too formal / not casual enough",
  "Doesn’t fit my body type",
  "Looks uncomfortable",
  "Wouldn’t fit my lifestyle",
];

const Feedback: React.FC<FeedbackProps> = ({ onFeedbackSubmit }) => {
  return (
    <div className="w-full h-full flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md mx-auto p-8 text-center bg-surface-light rounded-xl border border-border-light shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-text-light">What you didn't like?</h2>
        <div className="space-y-3">
          {FEEDBACK_OPTIONS.map(option => (
            <button
              key={option}
              onClick={() => onFeedbackSubmit(option)}
              className="w-full px-6 py-3 text-text-light font-semibold bg-background-light border border-border-light rounded-lg hover:bg-primary-light/50 hover:border-primary/50 transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Feedback;
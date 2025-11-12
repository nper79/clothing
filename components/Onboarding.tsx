import React, { useState } from 'react';
import type { Answers } from '../types';

interface OnboardingProps {
  onComplete: (answers: Answers) => void;
}

interface Question {
  id: string;
  title: string;
  isRequired: boolean;
  allowMultiple: boolean;
  maxSelections?: number;
  options: string[];
  type: 'single' | 'multiple';
}

const questions: Question[] = [
  // Screen 1 - About You
  {
    id: 'ageRange',
    title: "What's your age range?",
    isRequired: true,
    allowMultiple: false,
    options: ['18-24', '25-34', '35-44', '45-54', '55+'],
    type: 'single'
  },
  {
    id: 'stylePreference',
    title: '(Optional) How do you prefer to present your style?',
    isRequired: false,
    allowMultiple: false,
    options: ['Masculine', 'Feminine', 'Androgynous', 'Other', 'Prefer not to say'],
    type: 'single'
  },
  {
    id: 'height',
    title: '(Optional) Your height (approx.)?',
    isRequired: false,
    allowMultiple: false,
    options: ['<160 cm', '160-169', '170-179', '180-189', '190+'],
    type: 'single'
  },
  {
    id: 'bodyType',
    title: '(Optional) Which best describes your body type?',
    isRequired: false,
    allowMultiple: false,
    options: ['Slim', 'Athletic', 'Average', 'Broad', 'Plus'],
    type: 'single'
  },

  // Screen 2 - When & How You'll Wear It
  {
    id: 'contexts',
    title: 'Which contexts do you want outfits for? (pick 1+)',
    isRequired: true,
    allowMultiple: true,
    options: ['Work', 'Casual (everyday)', 'Night out', 'Events', 'Outdoor & Gym'],
    type: 'multiple'
  },
  {
    id: 'seasons',
    title: 'Main climate/season where you\'ll wear these? (pick 1+)',
    isRequired: true,
    allowMultiple: true,
    options: ['All year', 'Spring-Summer', 'Fall-Winter'],
    type: 'multiple'
  },
  {
    id: 'budget',
    title: 'Typical budget per item?',
    isRequired: true,
    allowMultiple: false,
    options: ['Low', 'Medium', 'High'],
    type: 'single'
  },
  {
    id: 'logosPreference',
    title: '(Optional) How do you feel about visible logos?',
    isRequired: false,
    allowMultiple: false,
    options: ['Avoid logos', 'I\'m fine with logos'],
    type: 'single'
  },
  {
    id: 'styleVibes',
    title: '(Optional) Any starting style vibes? (pick up to 2)',
    isRequired: false,
    allowMultiple: true,
    maxSelections: 2,
    options: ['Minimal', 'Classic', 'Streetwear', 'Techwear', 'Smart-casual', 'Sporty'],
    type: 'multiple'
  },

  // Screen 3 - What to Avoid
  {
    id: 'itemsToAvoid',
    title: 'Do you want your stylist to avoid any of these items? (multi-select)',
    isRequired: false,
    allowMultiple: true,
    options: [
      'Neckwear (ties/scarves)', 'Graphic T-shirts', 'Short sleeves',
      'Button-down collars', 'V-neck tops', 'Pants (trousers/chinos/jeans)',
      'Denim', 'Coats & Jackets', 'Blazers', 'Tank tops', 'Belts', 'Shorts', 'Socks', 'Shoes'
    ],
    type: 'multiple'
  },
  {
    id: 'colorsToAvoid',
    title: '(Optional) Colors to avoid?',
    isRequired: false,
    allowMultiple: true,
    options: ['Beige', 'Brown', 'White', 'All-black', 'Neon', 'Pastels', 'Bright red', 'Bright yellow'],
    type: 'multiple'
  },
  {
    id: 'fitsToAvoid',
    title: '(Optional) Fits to avoid?',
    isRequired: false,
    allowMultiple: true,
    options: ['Wide-leg', 'Skinny', 'Oversized', 'Cropped', 'Slim', 'Baggy'],
    type: 'multiple'
  },
  {
    id: 'patternsToAvoid',
    title: '(Optional) Patterns or materials to avoid?',
    isRequired: false,
    allowMultiple: true,
    options: ['Graphics', 'Stripes', 'Checks', 'Animal print', 'Leather', 'Chunky wool'],
    type: 'multiple'
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (currentQuestion.type === 'single') {
      setAnswers({ ...answers, [currentQuestion.id]: option });
    } else {
      const currentAnswer = (answers[currentQuestion.id] as string[]) || [];
      const maxSelections = currentQuestion.maxSelections || currentQuestion.options.length;

      if (currentAnswer.includes(option)) {
        // Remove if already selected
        setAnswers({
          ...answers,
          [currentQuestion.id]: currentAnswer.filter(item => item !== option)
        });
      } else if (currentAnswer.length < maxSelections) {
        // Add if under max selections
        setAnswers({
          ...answers,
          [currentQuestion.id]: [...currentAnswer, option]
        });
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onComplete(answers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const isCurrentQuestionValid = () => {
    const currentAnswer = answers[currentQuestion.id];

    if (!currentQuestion.isRequired) {
      return true; // Optional questions are always valid
    }

    if (currentQuestion.type === 'single') {
      return currentAnswer !== undefined && currentAnswer !== '';
    } else {
      const selectedItems = currentAnswer as string[] || [];
      return selectedItems.length > 0;
    }
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  const getCurrentSelection = () => {
    return answers[currentQuestion.id] || (currentQuestion.type === 'multiple' ? [] : '');
  };

  const renderCurrentQuestion = () => {
    const currentAnswer = getCurrentSelection();
    const isMultiSelect = currentQuestion.type === 'multiple';
    const selectedItems = isMultiSelect ? (currentAnswer as string[]) : [];
    const isDisabled = isMultiSelect && currentQuestion.maxSelections &&
                      selectedItems.length >= currentQuestion.maxSelections;

    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center mb-8">
          {currentQuestion.title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {currentQuestion.options.map((option) => {
            const isSelected = isMultiSelect
              ? selectedItems.includes(option)
              : currentAnswer === option;

            const shouldDisable = isDisabled && !isSelected;

            return (
              <button
                key={option}
                onClick={() => handleOptionSelect(option)}
                disabled={shouldDisable}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : shouldDisable
                    ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Selection counter for questions with max selections */}
        {isMultiSelect && currentQuestion.maxSelections && (
          <p className="text-sm text-gray-500 text-center">
            {selectedItems.length}/{currentQuestion.maxSelections} selected
          </p>
        )}

        {/* Minimum selection indicator for required multi-select questions */}
        {isMultiSelect && currentQuestion.isRequired && selectedItems.length === 0 && (
          <p className="text-sm text-orange-500 text-center">
            Please select at least one option
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(getProgressPercentage())}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        {renderCurrentQuestion()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            currentQuestionIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!isCurrentQuestionValid()}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isCurrentQuestionValid()
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentQuestionIndex === questions.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;

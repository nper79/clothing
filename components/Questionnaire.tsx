import React, { useState } from 'react';
import { STYLE_QUESTIONS, COLOR_MAP } from '../constants';
import type { Answers, Answer } from '../types';

interface QuestionnaireProps {
  onComplete: (answers: Answers) => void;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({ onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const currentQuestion = STYLE_QUESTIONS[currentQuestionIndex];
  const totalQuestions = STYLE_QUESTIONS.length;

  const handleAnswer = (questionId: string, answer: Answer) => {
    if (currentQuestion.type === 'multiple') {
        const existingAnswers = (answers[questionId] as string[] | undefined) || [];
        const newAnswers = existingAnswers.includes(answer as string)
            ? existingAnswers.filter(a => a !== answer)
            : [...existingAnswers, answer as string];
        setAnswers(prev => ({ ...prev, [questionId]: newAnswers }));
    } else {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    }
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const renderQuestion = () => {
    const answer = answers[currentQuestion.id];

    if (currentQuestion.id === 'colors') {
        return (
          <div className="grid grid-cols-5 gap-4 px-4 py-4 flex-grow content-start">
            {currentQuestion.options?.map(option => {
              const isSelected = ((answer as string[]) || []).includes(option);
              const colorHex = COLOR_MAP[option as keyof typeof COLOR_MAP] || '#CCCCCC';
              const isWhite = option === 'White';

              return (
                <div
                  key={option}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  className={`relative group cursor-pointer flex flex-col items-center gap-2 ${isSelected ? 'selected' : ''}`}
                >
                  <div
                    className={`relative w-full aspect-square flex items-center justify-center rounded-full transition-all ${isSelected ? 'ring-4 ring-primary' : 'ring-2 ring-gray-200 group-hover:ring-primary/50'}`}
                    style={{ backgroundColor: colorHex }}
                  >
                    <div
                      className={`checkmark absolute flex h-8 w-8 items-center justify-center rounded-full opacity-0 scale-90 transition-all duration-300 ease-in-out ${
                        isWhite ? 'bg-primary text-white' : 'bg-white text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">check</span>
                    </div>
                  </div>
                  <p className="text-text-light text-xs font-medium leading-tight text-center">{option}</p>
                </div>
              );
            })}
          </div>
        );
    }


    switch (currentQuestion.type) {
      case 'single':
      case 'multiple':
        return (
          <div className="grid grid-cols-2 gap-4 px-4 py-4 flex-grow content-start">
            {currentQuestion.options?.map(option => {
               const isSelected = currentQuestion.type === 'multiple' 
                    ? ((answer as string[]) || []).includes(option)
                    : answer === option;
               return (
                <button
                    key={option}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                    className={`flex items-center justify-start rounded-lg border-2 p-4 text-left text-base font-bold text-text-light transition-colors ${
                        isSelected 
                        ? 'border-primary bg-primary-light' 
                        : 'border-border-light bg-transparent hover:bg-primary-light/50'
                    }`}
                >
                    {option}
                </button>
               )
            })}
          </div>
        );
      case 'slider':
        return (
            <div className="w-full flex flex-col items-center pt-2 px-4 py-4">
                 <input
                    type="range"
                    min="1"
                    max="5"
                    value={(answer as number) || 3}
                    onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
                    className="w-full h-2 bg-progress-light rounded-lg appearance-none cursor-pointer range-slider"
                />
                <div className="w-full flex justify-between text-sm text-muted-light mt-2 px-1">
                    <span>Relaxed</span>
                    <span>Tailored</span>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  const percentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-full bg-background-light">
      <header className="flex items-center p-4 pb-2 justify-between">
        <button onClick={handleBack} className="flex size-12 shrink-0 items-center justify-start text-text-light disabled:opacity-0" disabled={currentQuestionIndex === 0}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">
            Question {currentQuestionIndex + 1}/{totalQuestions}
        </h2>
        <div className="flex size-12 shrink-0 items-center"></div>
      </header>

      <div className="flex flex-col gap-1 px-4 pt-2 pb-4">
        <div className="rounded-full bg-progress-light">
          <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
      
      <main className="flex flex-col flex-grow">
        <h1 className="tracking-tight text-[32px] font-bold leading-tight px-4 text-left pb-1 pt-6">{currentQuestion.text}</h1>
        {(currentQuestion.type === 'multiple' || currentQuestion.id === 'colors') && <p className="text-muted-light text-base font-normal leading-normal pb-3 pt-1 px-4">Select all that apply.</p>}
        {renderQuestion()}
      </main>

      <div className="sticky bottom-0 w-full bg-background-light p-4 pt-2 border-t border-border-light">
        <button onClick={handleNext} className="flex w-full items-center justify-center rounded-lg bg-primary p-4 text-center text-base font-bold text-white transition-colors hover:bg-primary/90">
            {currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Continue'}
        </button>
      </div>

       <style>{`
          .range-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            background: #84A98C; /* primary color */
            cursor: pointer;
            border-radius: 50%;
            margin-top: -8px;
          }

          .range-slider::-moz-range-thumb {
            width: 24px;
            height: 24px;
            background: #84A98C; /* primary color */
            cursor: pointer;
            border-radius: 50%;
          }
        `}</style>
    </div>
  );
};

export default Questionnaire;
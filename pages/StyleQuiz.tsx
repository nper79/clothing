import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface StyleProfile {
  perceptionStyle: string[];
  wearPlaces: string[];
  currentStyle: string[];
  desiredStyle: string[];
  outfitGoals: string[];
  colorPreferences: string[];
  dislikedColors: string;
  outfitComplexity: string;
  neverWearItems: string[];
}

const StyleQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<StyleProfile>({
    perceptionStyle: [],
    wearPlaces: [],
    currentStyle: [],
    desiredStyle: [],
    outfitGoals: [],
    colorPreferences: [],
    dislikedColors: '',
    outfitComplexity: '',
    neverWearItems: []
  });

  const questions = [
    {
      title: "How would you LIKE to be perceived?",
      subtitle: "Select up to 3",
      key: "perceptionStyle" as keyof StyleProfile,
      options: [
        "Modern", "Elegant", "Creative", "Sexy", "Minimalist",
        "Sophisticated", "Confident", "Relaxed / Casual", "Professional",
        "Discreet", "Bold / Edgy", "Soft / Gentle"
      ],
      multiSelect: true,
      maxSelections: 3
    },
    {
      title: "Where do you plan to wear these outfits?",
      subtitle: "Select all that apply",
      key: "wearPlaces" as keyof StyleProfile,
      options: [
        "Work", "Dates", "Everyday street style", "Nights out",
        "Weekends", "University", "Photos / Social media", "Travel",
        "Gym", "Events / Parties"
      ],
      multiSelect: true
    },
    {
      title: "What is your CURRENT style?",
      subtitle: "Select one or two",
      key: "currentStyle" as keyof StyleProfile,
      options: [
        "Basic casual", "Modern casual", "Streetwear", "Sporty", "Minimalist",
        "Soft / feminine", "Edgy / dark", "Old money", "Techwear",
        "Y2K", "Vintage / retro"
      ],
      multiSelect: true,
      maxSelections: 2
    },
    {
      title: "What style do you WANT to move toward?",
      subtitle: "Select up to 3",
      key: "desiredStyle" as keyof StyleProfile,
      options: [
        "Clean girl / clean fit", "Korean aesthetic", "Old money", "Soft elegant",
        "Modern chic", "Smart casual", "Edgy / dark", "Streetwear",
        "Classic business", "Quiet luxury", "Vintage-inspired"
      ],
      multiSelect: true,
      maxSelections: 3
    },
    {
      title: "What do you want your outfits to do for your image?",
      subtitle: "Select up to 2",
      key: "outfitGoals" as keyof StyleProfile,
      options: [
        "Make me look more put-together", "Make me look modern", "Make me look more elegant",
        "Make me look more confident", "Make me look more creative", "Make me look more mature",
        "Make me look more stylish", "Help me define my identity"
      ],
      multiSelect: true,
      maxSelections: 2
    },
    {
      title: "Color preferences",
      subtitle: "Select all that apply",
      key: "colorPreferences" as keyof StyleProfile,
      options: [
        "Neutral tones", "Earth tones", "Bright colors", "Pastel / soft colors",
        "High contrast", "Monochrome", "Dark palette"
      ],
      multiSelect: true
    },
    {
      title: "Outfit complexity",
      subtitle: "Select one",
      key: "outfitComplexity" as keyof StyleProfile,
      options: [
        "I prefer simple, clean outfits",
        "I like balanced but interesting outfits",
        "I enjoy more expressive, detailed outfits"
      ],
      multiSelect: false
    },
    {
      title: "Clothing items you NEVER wear",
      subtitle: "Select any",
      key: "neverWearItems" as keyof StyleProfile,
      options: [
        "Crop tops", "Oversized fits", "Skinny jeans", "Wide-leg trousers",
        "Mini skirts", "Heels", "Leather", "Bold prints",
        "Bright colors", "Tight fits", "Short shorts", "Anything Y2K"
      ],
      multiSelect: true
    }
  ];

  const handleOptionToggle = (option: string) => {
    const question = questions[currentQuestion];
    const currentValue = responses[question.key] as string[] | string;

    if (typeof currentValue === 'string') {
      // Single select
      setResponses({ ...responses, [question.key]: option });
    } else {
      // Multi select
      const values = currentValue as string[];
      if (values.includes(option)) {
        // Remove option
        const newValues = values.filter(v => v !== option);
        setResponses({ ...responses, [question.key]: newValues });
      } else {
        // Add option (check max selections)
        const maxSelections = question.maxSelections || 999;
        if (values.length < maxSelections) {
          setResponses({ ...responses, [question.key]: [...values, option] });
        }
      }
    }
  };

  const handleTextChange = (value: string) => {
    setResponses({ ...responses, dislikedColors: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    console.log('Submitting quiz with responses:', responses);

    try {
      // Save profile to backend
      const response = await fetch('/api/style-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(responses)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile saved successfully:', data);
        // Navigate to explore with profile
        navigate('/explore', { state: { profileCompleted: true } });
      } else {
        console.error('Failed to save profile. Status:', response.status);
        // Still navigate even if save fails
        navigate('/explore', { state: { profileCompleted: true } });
      }
    } catch (error) {
      console.error('Failed to save style profile:', error);
      // Still navigate even if save fails
      navigate('/explore', { state: { profileCompleted: true } });
    }
  };

  const question = questions[currentQuestion];
  const currentValues = Array.isArray(responses[question.key])
    ? responses[question.key] as string[]
    : typeof responses[question.key] === 'string'
    ? [responses[question.key]]
    : [];

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  
return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold">Style Quiz</h1>
        <div className="text-sm text-white/60">
          Question {currentQuestion + 1} of {questions.length}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-3xl">
        <div className="space-y-8">
          {/* Question */}
          <div className="space-y-3">
            <h2 className="text-4xl font-bold">{question.title}</h2>
            <p className="text-lg text-white/70">{question.subtitle}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option) => {
              const isSelected = currentValues.includes(option);
              const isDisabled = question.multiSelect &&
                question.maxSelections &&
                currentValues.length >= question.maxSelections &&
                !isSelected;

              return (
                <button
                  key={option}
                  onClick={() => handleOptionToggle(option)}
                  disabled={isDisabled}
                  className={`w-full text-left px-6 py-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-white text-black border-white'
                      : isDisabled
                      ? 'bg-white/5 border-white/20 text-white/30 cursor-not-allowed'
                      : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 text-white'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Text input for disliked colors */}
          {currentQuestion === 5 && (
            <div className="space-y-3">
              <label className="text-white/70">
                Colors you dislike (optional)
              </label>
              <input
                type="text"
                value={responses.dislikedColors}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="e.g., neon green, orange, brown..."
                className="w-full px-6 py-4 rounded-2xl border border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
            </div>
          )}

          {/* Selection count for multi-select */}
          {question.multiSelect && question.maxSelections && (
            <p className="text-sm text-white/50">
              Selected: {currentValues.length} / {question.maxSelections}
            </p>
          )}
        </div>
      </main>

      {/* Navigation */}
      <div className="flex items-center justify-between p-6 border-t border-white/10">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 ${
            currentQuestion === 0
              ? 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentQuestion
                  ? 'bg-white w-8'
                  : index < currentQuestion
                  ? 'bg-white/50'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={question.multiSelect ? currentValues.length === 0 : false}
          className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 ${
            question.multiSelect && currentValues.length === 0
              ? 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold'
          }`}
        >
          {currentQuestion === questions.length - 1 ? (
            <>
              <Sparkles className="w-5 h-5" />
              Complete
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StyleQuiz;
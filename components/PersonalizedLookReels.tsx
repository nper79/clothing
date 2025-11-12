import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Loader2, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import { PersonalLook, UserPreferences, PersonalStylingService } from '../services/personalStylingService';

interface PersonalizedLookReelsProps {
  userPhotoUrl: string;
  gender: 'male' | 'female';
  onComplete?: (preferences: UserPreferences) => void;
}

export const PersonalizedLookReels: React.FC<PersonalizedLookReelsProps> = ({
  userPhotoUrl,
  gender,
  onComplete
}) => {
  const navigate = useNavigate();
  const [looks, setLooks] = useState<PersonalLook[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedLookup, setLikedLookup] = useState<Record<string, boolean>>({});
  const [likedSignals, setLikedSignals] = useState(PersonalStylingService.getPositiveSignals());
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedDislikedItems, setSelectedDislikedItems] = useState<string[]>([]);
  const [feedbackTarget, setFeedbackTarget] = useState<PersonalLook | null>(null);

  const generationRef = useRef<{ isGenerating: boolean; generationKey: string }>({
    isGenerating: false,
    generationKey: ''
  });

  const userPreferences = useMemo(() => PersonalStylingService.getUserPreferences(), []);

  useEffect(() => {
    const generationKey = `${userPhotoUrl}_${gender}`;
    if (userPhotoUrl && gender && generationRef.current.generationKey !== generationKey) {
      generationRef.current.generationKey = generationKey;
      fetchLooks();
    }
  }, [userPhotoUrl, gender]);

  const fetchLooks = async () => {
    if (generationRef.current.isGenerating) return;
    generationRef.current.isGenerating = true;
    setError(null);

    try {
      setIsLoading(true);
      const generatedLooks = await PersonalStylingService.generatePersonalizedLooks(
        userPhotoUrl,
        gender,
        userPreferences
      );

      const sorted = [...generatedLooks].sort((a, b) => {
        if (a.isGenerated && !b.isGenerated) return -1;
        if (!a.isGenerated && b.isGenerated) return 1;
        return 0;
      });

      setLooks(sorted.slice(0, 5));
      setActiveIndex(0);
    } catch (err) {
      console.error(err);
      setError('We could not generate looks right now. Please try again in a moment.');
    } finally {
      setIsLoading(false);
      generationRef.current.isGenerating = false;
    }
  };

  const handleLike = (look: PersonalLook) => {
    if (!look.isGenerated || !look.styledPhotoUrl || likedLookup[look.id]) return;

    PersonalStylingService.recordPositiveSignal(look);
    setLikedLookup(prev => ({ ...prev, [look.id]: true }));
    setLikedSignals(PersonalStylingService.getPositiveSignals());
  };

  const handleRequestFeedback = (look: PersonalLook) => {
    setFeedbackTarget(look);
    setShowFeedbackModal(true);
    setSelectedDislikedItems([]);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackTarget) return;
    PersonalStylingService.saveFeedback(feedbackTarget.lookId, false, selectedDislikedItems);
    setShowFeedbackModal(false);
    setSelectedDislikedItems([]);
    setFeedbackTarget(null);
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete(PersonalStylingService.getUserPreferences());
    }
  };

  const handlePrev = () => setActiveIndex(prev => (prev === 0 ? prev : prev - 1));
  const handleNext = () => setActiveIndex(prev => (prev >= looks.length - 1 ? prev : prev + 1));

  const currentLook = looks[activeIndex];
  const likedCount = Object.values(likedLookup).filter(Boolean).length;

  const feedbackOptions = () => {
    if (!feedbackTarget) return [];
    const prompt = feedbackTarget.editPrompt || feedbackTarget.originalPrompt;
    const items: string[] = [];
    const patterns = [
      /(\w+\s+(?:blazer|jacket|coat|cardigan|sweater|hoodie|top|shirt|blouse|t[-]?shirt|polo|tank))/gi,
      /(\w+\s+(?:pants|trousers|jeans|leggings|skirt|shorts|dress))/gi,
      /(\w+\s+(?:shoes|boots|sneakers|heels|flats|sandals))/gi,
      /(bag|purse|hat|scarf|jewelry|accessories)/gi
    ];

    patterns.forEach(pattern => {
      const matches = prompt.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const clean = match.toLowerCase().trim();
          if (!items.includes(clean)) {
            items.push(clean);
          }
        });
      }
    });

    return [...new Set([...items, 'fit/size', 'colors', 'overall vibe'])];
  };

  const renderLookCard = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
          <p>Generating exclusive looks for you...</p>
        </div>
      );
    }

    if (error || !currentLook) {
      return (
        <div className="bg-white/5 border border-white/10 rounded-[36px] p-12 text-center text-gray-200">
          <p className="mb-6">{error || 'No looks available right now.'}</p>
          <button
            onClick={fetchLooks}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-semibold"
          >
            <Loader2 className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }

    const liked = likedLookup[currentLook.id];
    const canInteract = currentLook.isGenerated && Boolean(currentLook.styledPhotoUrl);

    return (
      <div className="bg-black rounded-[36px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.45)] relative w-full max-w-[420px] mx-auto">
        <div className="relative aspect-[9/16] bg-gradient-to-b from-slate-800 via-gray-900 to-black">
          {currentLook.isGenerated && currentLook.styledPhotoUrl ? (
            <img src={currentLook.styledPhotoUrl} alt={currentLook.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm px-6 text-center">
              We could not generate this look.
            </div>
          )}

          <div className="absolute inset-x-6 bottom-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-300">{currentLook.category}</p>
            <h2 className="text-2xl font-semibold">{currentLook.name}</h2>
            <p className="text-sm text-white/70">{currentLook.level}</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4 text-white/90">
          <p className="text-sm text-white/70 line-clamp-4">
            {currentLook.editPrompt || currentLook.originalPrompt}
          </p>

          <div className="flex justify-between items-center">
            <button
              onClick={() => handleRequestFeedback(currentLook)}
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <MessageSquare className="w-4 h-4" />
              Not my style
            </button>
            <button
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                liked ? 'bg-green-500 text-white' : 'bg-white text-black'
              }`}
              disabled={!canInteract}
              onClick={() => handleLike(currentLook)}
            >
              {liked ? <CheckCircle2 className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
              {liked ? 'Saved' : 'Love it'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-white/10 p-8 gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Wardrobe AI</p>
          <h1 className="text-3xl font-bold mt-2">Style Feed</h1>
        </div>

        <nav className="flex flex-col gap-4 text-white/70">
          <button className="text-left hover:text-white transition">Looks you liked ({likedCount})</button>
          <button className="text-left hover:text-white transition">Profile</button>
          <button
            onClick={() => navigate('/explore')}
            className="text-left hover:text-white transition underline underline-offset-4 decoration-white/50"
          >
            Explore looks feed
          </button>
        </nav>

        <div className="mt-auto">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Recent favorites</p>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {likedSignals.length === 0 && (
              <p className="text-sm text-white/40">You have not saved any looks yet.</p>
            )}
            {likedSignals.slice(0, 5).map(signal => (
              <div key={`${signal.lookId}-${signal.timestamp}`} className="flex items-center gap-3 text-sm">
                {signal.styledPhotoUrl ? (
                  <img src={signal.styledPhotoUrl} alt={signal.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                )}
                <div>
                  <p className="font-medium text-white">{signal.name}</p>
                  <p className="text-white/40 text-xs">{signal.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleFinish} className="px-4 py-3 rounded-2xl bg-white text-black font-semibold text-center">
          Save preferences
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 relative">
        {renderLookCard()}

        {/* Arrow Controls */}
        <div className="hidden md:flex flex-col gap-4 absolute right-12 top-1/2 -translate-y-1/2">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              activeIndex === 0 ? 'bg-white/10 text-white/30' : 'bg-white text-black'
            }`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={activeIndex >= looks.length - 1}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              activeIndex >= looks.length - 1 ? 'bg-white/10 text-white/30' : 'bg-white text-black'
            }`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">What is off with this look?</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-gray-500 hover:text-gray-800">×</button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Select the elements that do not match your style. We will fine tune future suggestions based on this.
            </p>

            <div className="space-y-3 mb-6">
              {feedbackOptions().map(item => (
                <label
                  key={item}
                  className={`flex items-center p-3 rounded-2xl border cursor-pointer transition ${
                    selectedDislikedItems.includes(item)
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDislikedItems.includes(item)}
                    onChange={() =>
                      setSelectedDislikedItems(prev =>
                        prev.includes(item) ? prev.filter(entry => entry !== item) : [...prev, item]
                      )
                    }
                    className="mr-3 text-red-500"
                  />
                  <span className="capitalize">{item}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-2xl"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-2xl"
              >
                Save feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

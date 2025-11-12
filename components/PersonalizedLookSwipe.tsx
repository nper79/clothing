import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, HeartCrack, MessageSquare, Sparkles, User } from 'lucide-react';
import { PersonalLook, UserPreferences, PersonalStylingService } from '../services/personalStylingService';

interface PersonalizedLookSwipeProps {
  userPhotoUrl: string;
  gender: 'male' | 'female';
  onComplete?: (preferences: UserPreferences) => void;
}

export const PersonalizedLookSwipe: React.FC<PersonalizedLookSwipeProps> = ({
  userPhotoUrl,
  gender,
  onComplete
}) => {
  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [looks, setLooks] = useState<PersonalLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedDislikedItems, setSelectedDislikedItems] = useState<string[]>([]);
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const [currentLook, setCurrentLook] = useState<PersonalLook | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Use ref to track generation state across component re-renders
  const generationRef = useRef<{
    isGenerating: boolean;
    generationKey: string;
  }>({
    isGenerating: false,
    generationKey: ''
  });

  // Load user preferences
  const userPreferences = PersonalStylingService.getUserPreferences();

  useEffect(() => {
    // Create unique generation key based on userPhotoUrl and gender
    const generationKey = `${userPhotoUrl}_${gender}`;

    if (!hasGenerated && userPhotoUrl && gender && generationRef.current.generationKey !== generationKey) {
      console.log('🎯 Starting generation with key:', generationKey);
      generationRef.current.generationKey = generationKey;
      setHasGenerated(true);
      generateLooks();
    }
  }, [userPhotoUrl, gender, hasGenerated]);

  // Cleanup effect to reset generation state when component unmounts
  useEffect(() => {
    return () => {
      generationRef.current.isGenerating = false;
    };
  }, []);

  const generateLooks = async () => {
    // Early return if already generating
    if (generationRef.current.isGenerating) {
      console.log('⚠️ Generation already in progress, skipping...');
      return;
    }
    generationRef.current.isGenerating = true;

    try {
      setIsLoading(true);
      console.log('🚀 Generating personalized looks...');

      const generatedLooks = await PersonalStylingService.generatePersonalizedLooks(
        userPhotoUrl,
        gender,
        userPreferences,
        (current, total, currentLook) => {
          console.log(`Progress: ${current}/${total} - ${currentLook}`);
        }
      );

      // Sort to put successful generations first
      const sortedLooks = [...generatedLooks].sort((a, b) => {
        if (a.isGenerated && !b.isGenerated) return -1;
        if (!a.isGenerated && b.isGenerated) return 1;
        return 0;
      });

      setLooks(sortedLooks);
      console.log('Generated looks:', sortedLooks.length);
      sortedLooks.forEach((look, index) => {
        console.log(`Look ${index}: ${look.name} - Generated: ${look.isGenerated} - URL: ${look.styledPhotoUrl}`);
      });

      if (sortedLooks.length > 0) {
        console.log('Setting current look to:', sortedLooks[0].name, sortedLooks[0].styledPhotoUrl);
        setCurrentLook(sortedLooks[0]);
      }
    } catch (error) {
      console.error('Error generating looks:', error);
    } finally {
      setIsLoading(false);
      generationRef.current.isGenerating = false;
    }
  };

  const handleLike = () => {
    if (!currentLook) return;

    // Save positive feedback
    PersonalStylingService.saveFeedback(currentLook.lookId, true);

    // Move to next look
    nextLook();
  };

  const handleDislike = () => {
    if (!currentLook) return;

    // Show feedback modal
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!currentLook) return;

    setIsProcessingFeedback(true);

    try {
      // Save negative feedback with disliked items
      PersonalStylingService.saveFeedback(
        currentLook.lookId,
        false,
        selectedDislikedItems
      );

      // Close modal and move to next look
      setShowFeedbackModal(false);
      setSelectedDislikedItems([]);
      nextLook();
    } catch (error) {
      console.error('Error saving feedback:', error);
    } finally {
      setIsProcessingFeedback(false);
    }
  };

  const nextLook = () => {
    const nextIndex = currentLookIndex + 1;
    if (nextIndex < looks.length) {
      setCurrentLookIndex(nextIndex);
      setCurrentLook(looks[nextIndex]);
    } else {
      // All looks processed
      if (onComplete) {
        const finalPreferences = PersonalStylingService.getUserPreferences();
        onComplete(finalPreferences);
      }
    }
  };

  const getClothingOptions = () => {
    if (!currentLook) return [];
    return PersonalStylingService.extractClothingItems(currentLook);
  };

  const toggleDislikedItem = (item: string) => {
    setSelectedDislikedItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const getProgressPercentage = () => {
    return Math.round(((currentLookIndex + 1) / looks.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              A Criar os Teus Looks
            </h2>
            <p className="text-gray-600">
              Estamos a gerar looks personalizados baseados na tua foto
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: '60%' }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">
              Isto pode demorar alguns minutos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentLook || looks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Não foi possível gerar os looks.</p>
          <button
            onClick={generateLooks}
            className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (currentLookIndex >= looks.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Obrigado pelo Teu Feedback!
            </h2>
            <p className="text-gray-600">
              As tuas preferências foram guardadas e vamos usá-las para melhorar as nossas recomendações.
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Looks que gostaste: {userPreferences.likedLooks.length}</p>
            <p>Looks que não gostaste: {userPreferences.dislikedLooks.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 bg-white shadow-sm">
        <div className="max-w-md mx-auto p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Look {currentLookIndex + 1} de {looks.length}
            </span>
            <span className="text-sm font-medium text-purple-600">
              {getProgressPercentage()}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="max-w-md w-full mt-20 mb-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Look Image - Full Body */}
          <div className="relative w-full h-[500px] flex items-center justify-center bg-gray-50">
            {currentLook.isGenerated ? (
              <img
                src={currentLook.styledPhotoUrl!}
                alt={currentLook.name}
                className="max-w-full max-h-full object-contain"
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <p className="text-gray-500">Não foi possível gerar este look</p>
              </div>
            )}

            {/* User Photo Comparison */}
            <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
              <img
                src={userPhotoUrl}
                alt="Original"
                className="w-12 h-12 rounded-full object-cover"
              />
            </div>
          </div>

          {/* Look Details */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {currentLook.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {currentLook.category} • {currentLook.level}
                </p>
              </div>
              <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                Personalizado
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleDislike}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
              >
                <HeartCrack className="w-5 h-5" />
                Não Gostei
              </button>
              <button
                onClick={handleLike}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors font-medium"
              >
                <Heart className="w-5 h-5" />
                Gostei
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Arrasta para o lado ou usa os botões para dar feedback
          </p>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                O que não gostaste neste look?
              </h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Seleciona os itens que não gostaste para ajudarmos a melhorar as tuas recomendações:
            </p>

            <div className="space-y-3 mb-6">
              {getClothingOptions().map((item) => (
                <label
                  key={item}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDislikedItems.includes(item)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDislikedItems.includes(item)}
                    onChange={() => toggleDislikedItem(item)}
                    className="mr-3 text-red-500 focus:ring-red-500"
                  />
                  <span className="capitalize">{item}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={isProcessingFeedback}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
              >
                {isProcessingFeedback ? 'A processar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

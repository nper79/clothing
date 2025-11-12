import React, { useState } from 'react';
import { PersonalStylingUpload } from './PersonalStylingUpload';
import { PersonalizedLookSwipe } from './PersonalizedLookSwipe';
import { UserPreferences } from '../services/personalStylingService';

type FlowStep = 'upload' | 'styling' | 'complete';

interface PersonalStylingFlowProps {
  onComplete?: (preferences: UserPreferences) => void;
}

export const PersonalStylingFlow: React.FC<PersonalStylingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>('');
  const [userGender, setUserGender] = useState<'male' | 'female'>('female');

  const handlePhotoUploaded = (photoUrl: string) => {
    setUserPhotoUrl(photoUrl);

    // Auto-detect gender or ask (for now, default to female - could be enhanced with gender detection)
    // In a real app, you might want to add a gender selection step
    setCurrentStep('styling');
  };

  const handleStylingComplete = (preferences: UserPreferences) => {
    setCurrentStep('complete');
    if (onComplete) {
      onComplete(preferences);
    }
  };

  const handleRestart = () => {
    setCurrentStep('upload');
    setUserPhotoUrl('');
  };

  switch (currentStep) {
    case 'upload':
      return (
        <PersonalStylingUpload
          onPhotoUploaded={handlePhotoUploaded}
        />
      );

    case 'styling':
      return (
        <PersonalizedLookSwipe
          userPhotoUrl={userPhotoUrl}
          gender={userGender}
          onComplete={handleStylingComplete}
        />
      );

    case 'complete':
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Perfil de Estilo Criado!
              </h2>
              <p className="text-gray-600 mb-4">
                As tuas preferências foram guardadas com sucesso. A partir de agora, vamos mostrar-te looks mais adequados ao teu gosto pessoal.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleRestart}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
                >
                  Experimentar com Outra Foto
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Voltar
                </button>
              </div>
            </div>

            {/* Stats Preview */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-3">O Teu Perfil</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {preferences.likedLooks.length}
                  </div>
                  <div className="text-gray-500">Looks Gostados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {preferences.dislikedLooks.length}
                  </div>
                  <div className="text-gray-500">Feedback Detalhado</div>
                </div>
              </div>
              {preferences.dislikedItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Itens a evitar:</span> {preferences.dislikedItems.slice(0, 3).join(', ')}
                    {preferences.dislikedItems.length > 3 && ` +${preferences.dislikedItems.length - 3}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

// Quick access to current preferences for the complete screen
const preferences = JSON.parse(localStorage.getItem('personal_styling_preferences') || '{}');
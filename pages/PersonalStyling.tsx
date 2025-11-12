import React from 'react';
import { PersonalStylingFlow } from '../components/PersonalStylingFlow';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const PersonalStylingPage: React.FC = () => {
  const handleComplete = (preferences: any) => {
    console.log('Personal styling completed!', preferences);
    // Here you could navigate to a recommendations page or back to main app
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main Flow */}
      <PersonalStylingFlow onComplete={handleComplete} />
    </div>
  );
};

export default PersonalStylingPage;

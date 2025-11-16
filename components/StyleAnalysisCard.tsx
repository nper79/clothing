import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Check } from 'lucide-react';
import StyleAnalysisService, { type StyleAnalysis } from '../services/styleAnalysisService';

interface StyleAnalysisCardProps {
  outfitDescription: string;
  lookName?: string;
  userHasProfile?: boolean;
}

const StyleAnalysisCard: React.FC<StyleAnalysisCardProps> = ({
  outfitDescription,
  lookName,
  userHasProfile = false
}) => {
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (outfitDescription && userHasProfile) {
      analyzeOutfit();
    }
  }, [outfitDescription, userHasProfile]);

  const analyzeOutfit = async () => {
    setLoading(true);
    try {
      const result = await StyleAnalysisService.analyzeOutfitForUser(outfitDescription, lookName);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze outfit:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userHasProfile) {
    return (
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-purple-300">Complete Your Style Profile</h3>
        </div>
        <p className="text-sm text-white/70">
          Take our style quiz to get personalized outfit analysis and recommendations!
        </p>
        <button
          onClick={() => window.location.href = '/style-quiz'}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition"
        >
          Take Quiz Now
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <h3 className="font-semibold">Analyzing Style Match...</h3>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return Check;
    if (score >= 60) return TrendingUp;
    return AlertCircle;
  };

  const ScoreIcon = getScoreIcon(analysis.score);

  return (
    <div className={`bg-white/5 border rounded-2xl p-4 space-y-4 ${
      analysis.matchesProfile ? 'border-green-500/30' : 'border-yellow-500/30'
    }`}>
      {/* Header with Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold">Style Analysis</h3>
        </div>
        <div className={`flex items-center gap-2 ${getScoreColor(analysis.score)}`}>
          <ScoreIcon className="w-4 h-4" />
          <span className="font-bold">{analysis.score}% Match</span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-white/80">Why this works for you:</p>
        <p className="text-sm text-white/70">{analysis.reasoning}</p>
      </div>

      {/* Style Alignment */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Perception</p>
          <p className="text-sm">{analysis.styleAlignment.perception.join(', ') || 'Versatile'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Complexity</p>
          <p className="text-sm capitalize">{analysis.styleAlignment.complexity}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Best For</p>
          <p className="text-sm">{analysis.styleAlignment.occasions.slice(0, 2).join(', ')}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Color Style</p>
          <p className="text-sm">{analysis.styleAlignment.colors.join(', ') || 'Neutral'}</p>
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">Style Tips:</p>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-white/70 flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Match Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
        analysis.matchesProfile
          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
      }`}>
        {analysis.matchesProfile ? 'Perfect Match!' : 'Consider Styling'}
      </div>
    </div>
  );
};

export default StyleAnalysisCard;
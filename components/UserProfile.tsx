import React from 'react';
import type { UserProfile } from '../types';

interface UserProfileProps {
  profile: UserProfile;
}

const UserProfile: React.FC<UserProfileProps> = ({ profile }) => {
  const { style_vector, liked_colors, disliked_colors, feedback_history } = profile;

  const formatAttributeValue = (value: number, attribute: string): string => {
    const percentage = Math.round(value * 100);
    let label = '';

    switch (attribute) {
      case 'formality':
        label = value > 0.7 ? 'Very Formal' : value < 0.3 ? 'Very Casual' : 'Balanced';
        break;
      case 'color_neutrality':
        label = value > 0.7 ? 'Neutral Tones' : value < 0.3 ? 'Bold Colors' : 'Mixed Palette';
        break;
      case 'comfort':
        label = value > 0.7 ? 'Comfort First' : value < 0.3 ? 'Style First' : 'Balanced';
        break;
      case 'trendiness':
        label = value > 0.7 ? 'Trendy' : value < 0.3 ? 'Classic' : 'Timeless';
        break;
      case 'minimalism':
        label = value > 0.7 ? 'Minimalist' : value < 0.3 ? 'Detailed' : 'Simple';
        break;
      default:
        label = `${percentage}%`;
    }

    return `${label} (${percentage}%)`;
  };

  const getProgressBarColor = (value: number): string => {
    if (value > 0.7) return 'bg-green-500';
    if (value < 0.3) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="bg-surface-light rounded-xl border border-border-light shadow-lg p-6 max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4 text-text-light">Your Style Profile</h3>

      {/* Style Preferences */}
      <div className="space-y-3 mb-6">
        <h4 className="font-semibold text-text-light">Style Preferences</h4>

        {Object.entries(style_vector).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm text-text-light">
              <span className="capitalize">{key.replace('_', ' ')}</span>
              <span>{formatAttributeValue(value, key)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(value)}`}
                style={{ width: `${value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Color Preferences */}
      <div className="space-y-3 mb-6">
        <h4 className="font-semibold text-text-light">Color Preferences</h4>

        {liked_colors.length > 0 && (
          <div>
            <span className="text-sm text-text-light">Liked: </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {liked_colors.map(color => (
                <span
                  key={color}
                  className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {disliked_colors.length > 0 && (
          <div>
            <span className="text-sm text-text-light">Disliked: </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {disliked_colors.map(color => (
                <span
                  key={color}
                  className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {liked_colors.length === 0 && disliked_colors.length === 0 && (
          <p className="text-sm text-muted-light">No color preferences yet. Keep giving feedback!</p>
        )}
      </div>

      {/* Learning Progress */}
      <div className="pt-4 border-t border-border-light">
        <div className="flex justify-between items-center">
          <span className="text-sm text-text-light">Feedback received:</span>
          <span className="text-sm font-medium text-primary">
            {feedback_history.length} {feedback_history.length === 1 ? 'outfit' : 'outfits'}
          </span>
        </div>
        {feedback_history.length < 5 && (
          <p className="text-xs text-muted-light mt-1">
            Keep giving feedback to improve your recommendations!
          </p>
        )}
        {feedback_history.length >= 5 && feedback_history.length < 10 && (
          <p className="text-xs text-green-600 mt-1">
            Good progress! Your style profile is getting more accurate.
          </p>
        )}
        {feedback_history.length >= 10 && (
          <p className="text-xs text-green-600 mt-1">
            Excellent! Your recommendations are now highly personalized.
          </p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
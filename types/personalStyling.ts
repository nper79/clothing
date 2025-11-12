export interface PersonalLook {
  id: string;
  lookId: string;
  name: string;
  category: string;
  level: string;
  originalPrompt: string;
  editPrompt: string;
  originalPhotoUrl: string;
  styledPhotoUrl?: string;
  isGenerated: boolean;
  error?: string;
  generatedAt: Date;
  feedback?: {
    liked: boolean;
    dislikedItems?: string[];
    timestamp: Date;
  };
}

export interface UserPreferences {
  preferredStyles: string[];
  dislikedItems: string[];
  preferredColors: string[];
  preferredFit: string[];
  likedLooks: string[];
  dislikedLooks: string[];
  fineTuningHistory: Array<{
    lookId: string;
    feedback: string[];
    timestamp: Date;
  }>;
}

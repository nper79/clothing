export interface ShopItem {
  id: string;
  label: string;
  searchQuery: string;
  category: string;
  gender: 'male' | 'female';
}

export interface ExploreLook {
  id: string;
  gender: 'male' | 'female';
  title: string;
  description: string;
  prompt: string;
  imagePrompt?: string;
  items?: ShopItem[];
  imageUrl: string;
  vibe: string;
  styleTag?: string;
}

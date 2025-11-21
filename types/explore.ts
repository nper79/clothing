export interface CachedShoppingProduct {
  title: string;
  link: string;
  price?: string;
  source?: string;
  imageUrl?: string;
  rating?: number;
  ratingCount?: number;
  position?: number;
}

export interface ShopItem {
  id: string;
  label: string;
  searchQuery: string;
  category: string;
  gender: 'male' | 'female';
  gridPosition?: number;
  gridCellUrl?: string;
  cachedProducts?: CachedShoppingProduct[];
  cachedAt?: string;
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
  gridImageUrl?: string;
  gridCellUrls?: string[];
  referenceImageUrl?: string;
}

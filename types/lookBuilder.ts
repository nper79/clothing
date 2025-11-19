export interface LikedItem {
  id: string;
  name: string;
  imageUrl: string;
  category: Category;
  lookId: string;
  lookTitle: string;
  likedAt: string;
}

export interface DroppedItem {
  id: string;
  name: string;
  imageUrl: string;
  category: Category;
  zone: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface OutfitBuilderItem {
  id: string;
  imageUrl: string;
  itemName: string;
  category: 'top' | 'bottom' | 'outerwear' | 'dress' | 'shoes' | 'accessories';
  position?: {
    x: number;
    y: number;
  };
}

export interface SavedOutfit {
  id: string;
  name: string;
  items: OutfitBuilderItem[];
  createdAt: Date;
}

export interface LookBuilderState {
  likedItems: LikedItem[];
  currentOutfit: OutfitBuilderItem[];
  savedOutfits: SavedOutfit[];
}
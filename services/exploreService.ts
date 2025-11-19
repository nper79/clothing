import type { ExploreLook, ShopItem } from '../types/explore';
import { PersonalStylingService } from './personalStylingService';

export interface SavedRemix {
  id: string;
  lookId: string;
  lookName: string;
  gender?: 'male' | 'female';
  storagePath?: string;
  createdAt: string;
  imageUrl?: string;
}

const LIKE_STORAGE_KEY = 'explore_likes';
const REMIX_STORAGE_PREFIX = 'explore_remixes_';
const PHOTO_STORAGE_PREFIX = 'latest_user_photo_';
const LEGACY_PHOTO_KEY = 'latest_user_photo';

type LikeMap = Record<string, boolean>;

const loadLikes = (): LikeMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LIKE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLikes = (likes: LikeMap) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LIKE_STORAGE_KEY, JSON.stringify(likes));
  } catch (error) {
    console.error('Failed to save likes', error);
  }
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

const remixKey = (userId: string) => `${REMIX_STORAGE_PREFIX}${userId}`;
const photoKey = (userId: string) => `${PHOTO_STORAGE_PREFIX}${userId}`;

export const ExploreService = {
  async getLooks(gender: 'male' | 'female'): Promise<ExploreLook[]> {
    console.log(`[ExploreService] Fetching looks for gender: ${gender}`);
    const response = await fetch(`/api/explore/dataset?gender=${gender}`);
    console.log(`[ExploreService] Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[ExploreService] Error response:`, text);
      throw new Error(text || 'Failed to load explore dataset');
    }

    const payload = await response.json();
    console.log(`[ExploreService] Received ${payload.looks?.length || 0} looks`);
    return payload.looks ?? [];
  },

  async generateLooks(gender: 'male' | 'female', count: number, styleTag?: string): Promise<ExploreLook[]> {
    const response = await fetch('/api/explore/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, count, styleTag })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to generate explore looks');
    }

    const payload = await response.json();
    return payload.looks ?? [];
  },

  async generateLooksFromReferences(
    gender: 'male' | 'female',
    count: number,
    images: string[],
    styleTag?: string
  ): Promise<ExploreLook[]> {
    const response = await fetch('/api/explore/inspire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, count: images.length, images, styleTag })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to generate reference-inspired looks');
    }

    const payload = await response.json();
    return payload.looks ?? [];
  },

  async clearLooks(gender: 'male' | 'female'): Promise<ExploreLook[]> {
    const response = await fetch('/api/explore/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to clear dataset');
    }

    const payload = await response.json();
    return payload.looks ?? [];
  },

  async deleteLook(gender: 'male' | 'female', id: string): Promise<ExploreLook[]> {
    const response = await fetch('/api/explore/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, id })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to delete look');
    }

    const payload = await response.json();
    return payload.looks ?? [];
  },

  async ensureLookItems(look: ExploreLook): Promise<ExploreLook> {
    if (look.imagePrompt && look.items?.length) {
      return look;
    }

    const response = await fetch('/api/explore/itemize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookId: look.id }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to enrich look items');
    }

    const payload = await response.json();
    return payload.look ?? look;
  },

  async regenerateGrid(gender: 'male' | 'female', lookId: string): Promise<ExploreLook> {
    const response = await fetch('/api/explore/regenerate-grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, lookId }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to regenerate grid');
    }

    const payload = await response.json();
    return payload.look;
  },

  async regenerateAllGrids(gender: 'male' | 'female'): Promise<ExploreLook[]> {
    const response = await fetch('/api/explore/regenerate-grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to regenerate grids');
    }

    const payload = await response.json();
    return payload.looks ?? [];
  },

  async getLookWithItems(lookId: string): Promise<ExploreLook> {
    const response = await fetch('/api/explore/itemize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookId }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to load look details');
    }

    const payload = await response.json();
    if (!payload.look) {
      throw new Error('Look not found');
    }
    return payload.look as ExploreLook;
  },

  getLikes(): LikeMap {
    return loadLikes();
  },

  likeLook(look: ExploreLook): LikeMap {
    const likes = loadLikes();
    likes[look.id] = true;
    saveLikes(likes);
    return likes;
  },

  async remixLook(userId: string, userPhotoUrl: string, look: ExploreLook) {
    const imagePrompt = look.imagePrompt || look.prompt;
    return PersonalStylingService.remixLook(userId, userPhotoUrl, imagePrompt, {
      lookId: look.id,
      name: look.title,
      category: look.vibe,
      level: 'explore',
      originalPrompt: imagePrompt,
      referenceImage: look.imageUrl
    });
  },

  getLatestUserPhoto(userId?: string): string | null {
    if (typeof window === 'undefined') return null;
    if (!userId) {
      return localStorage.getItem(LEGACY_PHOTO_KEY);
    }
    return localStorage.getItem(photoKey(userId)) || localStorage.getItem(LEGACY_PHOTO_KEY);
  },

  setLatestUserPhoto(userId: string, dataUrl: string) {
    if (typeof window === 'undefined') return;

    try {
      // Clean up old photos first to free space
      this.cleanupOldPhotos();

      // Check if dataUrl is too large (>5MB)
      const dataSizeKB = Math.round(dataUrl.length * 0.75 / 1024);
      if (dataSizeKB > 5120) { // 5MB
        console.warn('[ExploreService] Photo too large for localStorage:', dataSizeKB, 'KB');
        throw new Error('Photo is too large to save locally');
      }

      // Check available space (rough estimate)
      const storageUsage = JSON.stringify(localStorage).length;
      const storageLimit = 5 * 1024 * 1024; // 5MB
      const availableSpace = storageLimit - storageUsage;

      if (dataUrl.length > availableSpace) {
        console.warn('[ExploreService] Not enough space in localStorage');
        this.clearAllPhotos(); // Emergency cleanup
        throw new Error('Not enough storage space. Please clear your browser data.');
      }

      localStorage.setItem(photoKey(userId), dataUrl);
      localStorage.setItem(LEGACY_PHOTO_KEY, dataUrl);
      console.log('[ExploreService] Photo saved successfully, size:', dataSizeKB, 'KB');
    } catch (error) {
      console.error('[ExploreService] Failed to save photo:', error);
      // Clear and retry once
      this.clearAllPhotos();
      try {
        localStorage.setItem(photoKey(userId), dataUrl);
        localStorage.setItem(LEGACY_PHOTO_KEY, dataUrl);
      } catch (retryError) {
        console.error('[ExploreService] Failed to save photo even after cleanup:', retryError);
        throw retryError;
      }
    }
  },

  getRemixes(userId: string): SavedRemix[] {
    const stored = readJson<SavedRemix[]>(remixKey(userId), []);
    return stored.map((entry) => {
      if (entry.storagePath) {
        return {
          ...entry,
          imageUrl: undefined,
        };
      }
      return entry;
    });
  },

  async getRemixImageUrl(path: string): Promise<string> {
    const response = await fetch(`/api/remix-image?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to fetch remix image');
    }
    const payload = await response.json();
    return payload.url;
  },

  saveRemix(userId: string, remix: Omit<SavedRemix, 'id' | 'createdAt'>): SavedRemix[] {
    const current = readJson<SavedRemix[]>(remixKey(userId), []);
    const entry: SavedRemix = {
      id: `${remix.lookId}_${Date.now()}`,
      lookId: remix.lookId,
      lookName: remix.lookName,
      gender: remix.gender,
      storagePath: remix.storagePath,
      imageUrl: remix.storagePath ? undefined : remix.imageUrl,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...current].slice(0, 60);
    writeJson(remixKey(userId), updated);
    return updated;
  },

  clearRemixes(userId: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(remixKey(userId));
  },

  getLatestUserGender(): 'male' | 'female' {
    if (typeof window === 'undefined') {
      return 'female';
    }
    return (localStorage.getItem('latest_user_gender') as 'male' | 'female') || 'female';
  },

  cleanupOldPhotos() {
    if (typeof window === 'undefined') return;

    const photoKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('user_photo_')) {
        photoKeys.push(key);
      }
    }

    // Keep only the most recent 3 photos
    photoKeys.sort().slice(0, -3).forEach(key => {
      console.log('[ExploreService] Removing old photo:', key);
      localStorage.removeItem(key);
    });
  },

  clearAllPhotos() {
    if (typeof window === 'undefined') return;

    console.log('[ExploreService] Clearing all photos from localStorage');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('user_photo_') || key === 'latest_user_photo')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
};

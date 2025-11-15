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
    const response = await fetch(`/api/explore/dataset?gender=${gender}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to load explore dataset');
    }
    const payload = await response.json();
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

  async remixLook(userPhotoUrl: string, look: ExploreLook) {
    const imagePrompt = look.imagePrompt || look.prompt;
    return PersonalStylingService.remixLook(userPhotoUrl, imagePrompt, {
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
    localStorage.setItem(photoKey(userId), dataUrl);
    localStorage.setItem(LEGACY_PHOTO_KEY, dataUrl);
  },

  getRemixes(userId: string): SavedRemix[] {
    return readJson<SavedRemix[]>(remixKey(userId), []);
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
      imageUrl: remix.imageUrl,
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
  }
};

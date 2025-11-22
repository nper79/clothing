import type { ExploreLook, ShopItem } from '../types/explore';
import { PersonalStylingService } from './personalStylingService';

export interface SavedRemixItem {
  id: string;
  name: string;
  imageUrl?: string;
  category?: string;
}

export interface SavedRemix {
  id: string;
  lookId: string;
  lookName: string;
  gender?: 'male' | 'female';
  storagePath?: string;
  createdAt: string;
  imageUrl?: string;
  customItems?: SavedRemixItem[];
  customPrompt?: string;
}

const LIKE_STORAGE_KEY = 'explore_likes';
const REMIX_STORAGE_PREFIX = 'explore_remixes_';
const PHOTO_STORAGE_PREFIX = 'latest_user_photo_';
const LEGACY_PHOTO_KEY = 'latest_user_photo';
const MAX_RECENT_PHOTOS = 3;
const SIZE_LIMIT_BYTES = 4.5 * 1024 * 1024; // ~4.5MB to stay under the 5MB Web Storage limit
const PHOTO_URL_TTL_MS = 55 * 60 * 1000; // 55 minutes
const PHOTO_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh when <5 minutes left

type StoredPhotoRecord = {
  path?: string;
  url?: string;
  expiresAt?: number;
  storedAt?: number;
  source?: 'supabase' | 'local';
};

type LikeMap = Record<string, boolean>;

const isDataUrl = (value?: string | null): value is string =>
  typeof value === 'string' && value.startsWith('data:');

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
const parsePhotoRecord = (raw: string | null): StoredPhotoRecord | null => {
  if (!raw) return null;
  if (isDataUrl(raw) || raw.startsWith('http')) {
    return { url: raw, storedAt: Date.now(), source: isDataUrl(raw) ? 'local' : 'supabase' };
  }
  try {
    const parsed = JSON.parse(raw) as StoredPhotoRecord;
    if (!parsed.storedAt) {
      parsed.storedAt = Date.now();
    }
    if (!parsed.source) {
      parsed.source = parsed.path ? 'supabase' : 'local';
    }
    return parsed;
  } catch {
    return { url: raw, storedAt: Date.now() };
  }
};

const storePhotoRecord = (userId: string, record: StoredPhotoRecord) => {
  if (typeof window === 'undefined') return;
  const normalized: StoredPhotoRecord = {
    ...record,
    storedAt: record.storedAt ?? Date.now(),
    source: record.source ?? (record.path ? 'supabase' : 'local'),
  };
  const serialized = JSON.stringify(normalized);
  const shouldMirrorLegacy = Boolean(normalized.path || (normalized.url && !isDataUrl(normalized.url)));

  try {
    localStorage.setItem(photoKey(userId), serialized);
    if (shouldMirrorLegacy) {
      localStorage.setItem(LEGACY_PHOTO_KEY, serialized);
    }
  } catch (error) {
    console.warn(
      '[ExploreService] Storage quota hit while saving photo record, falling back to minimal data.',
      error
    );
    try {
      const fallback = normalized.path
        ? JSON.stringify({ path: normalized.path, storedAt: normalized.storedAt })
        : JSON.stringify({ url: normalized.url ?? '' });
      localStorage.setItem(photoKey(userId), fallback);
      if (shouldMirrorLegacy) {
        localStorage.setItem(LEGACY_PHOTO_KEY, fallback);
      }
    } catch (fallbackError) {
      console.error('[ExploreService] Failed to store photo even after fallback.', fallbackError);
    }
  }
};

const getPhotoRecord = (userId: string): StoredPhotoRecord | null => {
  if (typeof window === 'undefined') return null;
  return parsePhotoRecord(localStorage.getItem(photoKey(userId)));
};

const getLegacyPhotoRecord = (): StoredPhotoRecord | null => {
  if (typeof window === 'undefined') return null;
  return parsePhotoRecord(localStorage.getItem(LEGACY_PHOTO_KEY));
};

const uploadLocalPhotoRecord = async (userId: string, dataUrl: string): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch('/api/profile-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, photoDataUrl: dataUrl }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to upload local profile photo.');
    }
    const payload = await response.json();
    if (typeof payload?.url !== 'string' || typeof payload?.path !== 'string') {
      throw new Error('Upload response missing photo URL.');
    }
    const record: StoredPhotoRecord = {
      path: payload.path,
      url: payload.url,
      expiresAt: Date.now() + PHOTO_URL_TTL_MS,
      source: 'supabase',
    };
    storePhotoRecord(userId, record);
    return record.url;
  } catch (error) {
    console.warn('[ExploreService] Failed to upload existing photo to Supabase', error);
    return dataUrl;
  }
};

const ensureRemotePhoto = async (userId: string, currentUrl?: string | null): Promise<string | null> => {
  if (typeof window === 'undefined') return currentUrl ?? null;
  const record = getPhotoRecord(userId);
  const existing = currentUrl ?? record?.url ?? getLegacyPhotoRecord()?.url ?? null;
  if (!existing) {
    return null;
  }
  if (isDataUrl(existing)) {
    return uploadLocalPhotoRecord(userId, existing);
  }
  return existing;
};

const refreshPhotoUrl = async (userId: string): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  const record = getPhotoRecord(userId);
  if (!record?.path) {
    return record?.url ?? null;
  }
  const needsRefresh =
    !record.url || !record.expiresAt || record.expiresAt - Date.now() < PHOTO_REFRESH_BUFFER_MS;
  if (!needsRefresh) {
    return record.url ?? null;
  }
  try {
    const response = await fetch(`/api/profile-photo/url?path=${encodeURIComponent(record.path)}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to refresh profile photo URL.');
    }
    const payload = await response.json();
    const url = payload?.url;
    if (typeof url !== 'string') {
      throw new Error('Invalid photo URL response.');
    }
    const updated: StoredPhotoRecord = {
      ...record,
      url,
      expiresAt: Date.now() + PHOTO_URL_TTL_MS,
    };
    storePhotoRecord(userId, updated);
    return url;
  } catch (error) {
    console.warn('[ExploreService] Failed to refresh profile photo URL', error);
    return record.url ?? null;
  }
};

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
      try {
        const payload = JSON.parse(text);
        throw new Error(payload?.error || 'Failed to regenerate grid');
      } catch {
        throw new Error(text || 'Failed to regenerate grid');
      }
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
      try {
        const payload = JSON.parse(text);
        throw new Error(payload?.error || 'Failed to regenerate grids');
      } catch {
        throw new Error(text || 'Failed to regenerate grids');
      }
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

  async remixLook(userId: string, userPhotoUrl: string | null, look: ExploreLook) {
    if (!userId) {
      throw new Error('You need to be signed in to remix looks.');
    }
    const imagePrompt = look.imagePrompt || look.prompt;
    const gridCells = look.gridCellUrls ?? [];
    const itemCellUrls =
      look.items
        ?.map((item) => item.gridCellUrl)
        .filter((url): url is string => typeof url === 'string' && url.trim().length > 0) ?? [];
    const itemImages = Array.from(
      new Set(
        [...gridCells, ...itemCellUrls].filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
      )
    );
    let resolvedPhoto = userPhotoUrl ?? null;
    const refreshed = await refreshPhotoUrl(userId);
    if (refreshed) {
      resolvedPhoto = refreshed;
    }
    if (!resolvedPhoto) {
      resolvedPhoto = getLegacyPhotoRecord()?.url ?? null;
    }
    if (!resolvedPhoto) {
      throw new Error('Upload a profile photo before remixing looks.');
    }
    resolvedPhoto = (await ensureRemotePhoto(userId, resolvedPhoto)) ?? resolvedPhoto;
    return PersonalStylingService.remixLook(
      userId,
      resolvedPhoto,
      imagePrompt,
      {
        lookId: look.id,
        name: look.title,
        category: look.vibe,
        level: 'explore',
        originalPrompt: imagePrompt,
      },
      itemImages
    );
  },

  async ensureRemoteUserPhoto(userId: string, providedUrl?: string | null) {
    if (!userId) return null;
    return ensureRemotePhoto(userId, providedUrl);
  },

  getLatestUserPhoto(userId?: string): string | null {
    if (typeof window === 'undefined') return null;
    if (!userId) {
      return getLegacyPhotoRecord()?.url ?? null;
    }
    return getPhotoRecord(userId)?.url ?? getLegacyPhotoRecord()?.url ?? null;
  },

  async setLatestUserPhoto(userId: string, dataUrl: string) {
    if (typeof window === 'undefined') return null;

    const saveLocally = () => {
      const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
      if (approxBytes > SIZE_LIMIT_BYTES) {
        throw new Error('Photo is too large to save locally. Please use a smaller image.');
      }
      const record: StoredPhotoRecord = { url: dataUrl, source: 'local', storedAt: Date.now() };
      storePhotoRecord(userId, record);
      return dataUrl;
    };

    try {
      const response = await fetch('/api/profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, photoDataUrl: dataUrl }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to upload profile photo.');
      }
      const payload = await response.json();
      if (typeof payload?.url !== 'string') {
        throw new Error('Upload did not return a photo URL.');
      }
      const record: StoredPhotoRecord = {
        path: payload.path,
        url: payload.url,
        expiresAt: Date.now() + PHOTO_URL_TTL_MS,
        source: 'supabase',
      };
      storePhotoRecord(userId, record);
      this.pruneRecentPhotos();
      return payload.url;
    } catch (error) {
      console.warn('[ExploreService] Failed to upload photo to Supabase. Falling back to local storage.', error);
      return saveLocally();
    }
  },

  refreshLatestUserPhoto: refreshPhotoUrl,

  getRemixes(userId: string): SavedRemix[] {
    const stored = readJson<SavedRemix[]>(remixKey(userId), []);
    return stored.map((entry) => {
      if (entry.storagePath && !entry.imageUrl) {
        return { ...entry, imageUrl: undefined };
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
      imageUrl: remix.imageUrl,
      customItems: remix.customItems,
      customPrompt: remix.customPrompt,
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

  pruneRecentPhotos(forceCleanup = false) {
    if (typeof window === 'undefined') return;

    const entries: Array<{ key: string; timestamp: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PHOTO_STORAGE_PREFIX)) {
        entries.push({ key, timestamp: Number(key.split('_').pop()) || 0 });
      }
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);
    const toRemove = forceCleanup
      ? entries.slice(1) // keep only the newest
      : entries.slice(MAX_RECENT_PHOTOS);

    toRemove.forEach(({ key }) => localStorage.removeItem(key));
  },

  clearAllPhotos() {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(PHOTO_STORAGE_PREFIX) || key === LEGACY_PHOTO_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },

  refreshLatestUserPhoto: refreshPhotoUrl,
};

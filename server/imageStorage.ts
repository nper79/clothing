import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPLORE_BUCKET = process.env.SUPABASE_EXPLORE_BUCKET || 'explore-images';
const REMIX_BUCKET = process.env.SUPABASE_REMIX_BUCKET || 'remix-images';
const PROFILE_BUCKET = process.env.SUPABASE_PROFILE_BUCKET || 'profilepics';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (!supabase) {
  console.warn('[storage] Supabase Storage is not configured. Images will use temporary Replicate URLs.');
}

const uploadToSupabase = async (bucket: string, path: string, remoteUrl: string): Promise<string> => {
  if (!supabase) {
    return remoteUrl;
  }

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image for upload (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, Buffer.from(arrayBuffer), { contentType, upsert: true });

    if (error) {
      throw new Error(`[storage] Supabase upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    console.log(`[storage] Uploaded image to ${bucket}/${path}`);
    return data.publicUrl;
  } catch (error) {
    console.error('[storage] Falling back to Replicate URL:', error);
    return remoteUrl;
  }
};

const uploadBufferToSupabase = async (
  bucket: string,
  path: string,
  buffer: Buffer,
  mime: string
): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured.');
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mime, upsert: true });

  if (error) {
    throw new Error(`[storage] Supabase buffer upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const persistExploreImage = async (
  sourceUrl: string,
  gender: string,
  lookId: string
): Promise<string> => {
  const safeLookId = lookId.replace(/[^a-zA-Z0-9-_]/g, '') || 'look';
  const path = `${gender}/${safeLookId}-${Date.now()}.jpg`;
  return uploadToSupabase(EXPLORE_BUCKET, path, sourceUrl);
};

export const persistRemixImage = async (sourceUrl: string): Promise<string> => {
  const path = `remix/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  await uploadToSupabase(REMIX_BUCKET, path, sourceUrl);
  return path;
};

const parseDataUri = (dataUri: string) => {
  const match = dataUri.match(/^data:(?<mime>.+);base64,(?<data>.+)$/);
  if (!match?.groups?.data || !match.groups.mime) {
    throw new Error('Invalid data URI provided.');
  }
  return {
    mime: match.groups.mime,
    buffer: Buffer.from(match.groups.data, 'base64'),
  };
};

const inferExtension = (mime: string): string => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
};

export const persistReferenceImage = async (
  dataUri: string,
  gender: 'male' | 'female',
  label: string
): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured.');
  }

  const { mime, buffer } = parseDataUri(dataUri);
  const ext = inferExtension(mime);
  const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, '') || 'reference';
  const path = `references/${gender}/${safeLabel}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(EXPLORE_BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true });

  if (error) {
    throw new Error(`[storage] Failed to upload reference image: ${error.message}`);
  }

  const { data } = supabase.storage.from(EXPLORE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

const safeSegment = (value: string, fallback: string) =>
  (value || fallback).replace(/[^a-zA-Z0-9-_]/g, '') || fallback;

export const persistExploreAssetBuffer = async (
  buffer: Buffer,
  gender: string,
  lookId: string,
  label: string,
  mime = 'image/jpeg'
): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured.');
  }

  const ext = inferExtension(mime);
  const safeId = safeSegment(lookId, 'look');
  const safeLabel = safeSegment(label, 'asset');
  const path = `${gender}/${safeId}/${safeLabel}-${Date.now()}.${ext}`;
  return uploadBufferToSupabase(EXPLORE_BUCKET, path, buffer, mime);
};

export const getRemixSignedUrl = async (path: string): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured.');
  }
  const { data, error } = await supabase.storage
    .from(REMIX_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Failed to create signed URL');
  }
  return data.signedUrl;
};

export const persistProfilePhoto = async (
  dataUri: string,
  userId: string
): Promise<{ path: string; url: string }> => {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured.');
  }
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = inferExtension(mime);
  const safeUser = safeSegment(userId, 'user');
  const path = `${safeUser}/profile-${Date.now()}.${ext}`;
  await uploadBufferToSupabase(PROFILE_BUCKET, path, buffer, mime);
  const url = await getProfilePhotoUrl(path);
  return { path, url };
};

export const getProfilePhotoUrl = async (path: string): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured.');
  }
  const { data, error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Failed to create profile photo URL');
  }
  return data.signedUrl;
};

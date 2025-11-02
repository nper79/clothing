-- Supabase schema for StyleAI preference learning system

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Profile (onboarding)
CREATE TABLE IF NOT EXISTS user_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_band TEXT,
  presenting_gender TEXT,
  contexts TEXT[],
  seasons TEXT[],
  budget_tier TEXT,
  hard_avoid_colors TEXT[],
  hard_avoid_fits TEXT[],
  avoid_items TEXT[],
  logo_visibility TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Outfits
CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  tags JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Interactions (swipes)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like','dislike')),
  reasons TEXT[] DEFAULT '{}',
  session_no INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Preferences (weights per tag)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weights JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5) Per-attribute stats (progressive rejection)
CREATE TABLE IF NOT EXISTS user_attr_stats (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attr_key TEXT NOT NULL,
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  streak_dislikes INT DEFAULT 0,
  cooldown_until_session INT,
  last_seen_session INT,
  PRIMARY KEY (user_id, attr_key)
);

-- Row Level Security
ALTER TABLE user_profile      ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attr_stats   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_owner_rw" ON user_profile
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "interactions_owner_rw" ON interactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "prefs_owner_rw" ON user_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "attrstats_owner_rw" ON user_attr_stats
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outfits_tags_gin ON outfits USING GIN (tags);

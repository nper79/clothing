-- Fix for Supabase RLS policies to allow anonymous access with local user IDs
-- This disables RLS for the tables to allow the app to work with locally generated user IDs

-- Disable RLS for all tables
ALTER TABLE user_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_attr_stats DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profile_owner_rw" ON user_profile;
DROP POLICY IF EXISTS "interactions_owner_rw" ON interactions;
DROP POLICY IF EXISTS "prefs_owner_rw" ON user_preferences;
DROP POLICY IF EXISTS "attrstats_owner_rw" ON user_attr_stats;
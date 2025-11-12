-- Desativar RLS para permitir Firebase User IDs no Supabase
-- Execute este SQL no Supabase SQL Editor

-- Desativar Row Level Security para permitir Firebase UIDs
ALTER TABLE user_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_attr_stats DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "profile_owner_rw" ON user_profile;
DROP POLICY IF EXISTS "interactions_owner_rw" ON interactions;
DROP POLICY IF EXISTS "prefs_owner_rw" ON user_preferences;
DROP POLICY IF EXISTS "attrstats_owner_rw" ON user_attr_stats;

-- Opcional: Criar políticas mais flexíveis para Firebase UIDs (se quiser alguma segurança)
CREATE POLICY "allow_firebase_users" ON user_profile
  FOR ALL USING (user_id::text ~ '^G-[a-zA-Z0-9]+$');

CREATE POLICY "allow_firebase_users_interactions" ON interactions
  FOR ALL USING (user_id::text ~ '^G-[a-zA-Z0-9]+$');

CREATE POLICY "allow_firebase_users_preferences" ON user_preferences
  FOR ALL USING (user_id::text ~ '^G-[a-zA-Z0-9]+$');

CREATE POLICY "allow_firebase_users_attrstats" ON user_attr_stats
  FOR ALL USING (user_id::text ~ '^G-[a-zA-Z0-9]+$');

-- Re-enable RLS com políticas flexíveis (se quiser alguma segurança)
-- Se preferir sem segurança, comente as linhas abaixo
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attr_stats ENABLE ROW LEVEL SECURITY;

-- Verificar se as tabelas estão acessíveis
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profile', 'interactions', 'user_preferences', 'user_attr_stats')
ORDER BY tablename;
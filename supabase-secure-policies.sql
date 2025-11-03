-- Políticas RLS Seguras para Produção
-- Uso com Supabase Auth (não Firebase)

-- Políticas que permitem acesso apenas ao utilizador autenticado

CREATE POLICY "Users can view own profile" ON user_profile
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profile
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON user_profile
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own interactions" ON interactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own interactions" ON interactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own attr stats" ON user_attr_stats
  FOR ALL USING (user_id = auth.uid());

-- Re-enable RLS
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attr_stats ENABLE ROW LEVEL SECURITY;
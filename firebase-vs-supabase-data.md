# Firebase vs Supabase - Gestão de Dados

## Firebase Firestore Console

### O que tem:
✅ **Console Web** para visualizar dados
✅ **Data viewer** hierárquico
✅ **Regras de segurança** (similar a RLS)
✅ **Índices compostos**
✅ **Import/Export** de dados

### O que NÃO tem:
❌ **SQL Editor** (não usa SQL)
❌ **Queries JOIN** complexas
❌ **Foreign keys** tradicionais
❌ **Stored procedures**
❌ **Relational integrity**

## Supabase Dashboard

### O que tem:
✅ **SQL Editor completo** (como pgAdmin)
✅ **Table editor visual**
✅ **Relational diagram**
✅ **Foreign keys & constraints**
✅ **Migrations tracking**
✅ **Backup scheduling**
✅ **Query performance**

### Queries que podes fazer no Supabase:
```sql
-- Analytics complexas
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_feedback,
  AVG(CASE WHEN action = 'like' THEN 1 ELSE 0 END) as like_ratio
FROM interactions
WHERE user_id = 'xxx'
GROUP BY week
ORDER BY week DESC;

-- Joins múltiplos
SELECT
  u.email,
  COUNT(DISTINCT o.id) as outfits_rated,
  ARRAY_AGG(DISTINCT o.theme) as favorite_themes
FROM users u
JOIN interactions i ON u.id = i.user_id
JOIN outfits o ON i.outfit_id = o.id
WHERE u.age_band = '25-34'
GROUP BY u.email;
```

## Exemplos Comparativos

### Buscar feedback recente do utilizador:

**Firebase (JavaScript):**
```javascript
const feedback = await db.collection('interactions')
  .where('userId', '==', userId)
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get();

// Precisa de processar no client
const likeRatio = feedback.docs
  .filter(doc => doc.data().action === 'like').length / feedback.size;
```

**Supabase (SQL):**
```sql
SELECT
  action,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM interactions
WHERE user_id = $1
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY action;
```

## Qual é melhor para o teu caso?

### Para o teu app de clothing:

**Firebase - Vantagens:**
✅ Mais rápido para protótipos
✅ Não precisas de aprender SQL
✅ Offline sync automático
✅ Real-time updates fáceis

**Supabase - Vantagens:**
✅ Queries de analytics mais poderosas
✅ Migração de dados mais fácil
✅ Controlo total da base de dados
✅ SQL que já conheces

## Recomendação Final

**Se queres analytics avançadas:** Supabase
**Se queres rapidez de desenvolvimento:** Firebase
**Se gostas de SQL:** Supabase
**Se preferisses NoSQL:** Firebase
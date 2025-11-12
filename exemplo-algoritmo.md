# Como o Teu Algoritmo Funciona na Prática

## Fluxo Completo

### 1. Usuário recebe outfit:
```json
{
  "outfit": {
    "items": [
      {"type": "coat", "color": "black", "style": "wool"},
      {"type": "pants", "color": "blue", "style": "jeans"},
      {"type": "shoes", "color": "yellow", "style": "sneakers"}
    ]
  }
}
```

### 2. Usuário feedback:
- ❌ Clica em "Sapatos" (chip Shoes)
- Action: "dislike"
- Reasons: ["Shoes", "Color"]

### 3. Sistema atualiza pesos:
```sql
-- Em user_preferences.weights:
{
  "color:yellow": -1.2,     // Sapato amarelo = peso forte negativo
  "item:shoes": -0.5,       // Sapatos em geral = leve negativo
  "color:black": 0.1,       // Casaco preto = neutro/positivo
  "color:blue": 0.1         // Calças azuis = neutro/positivo
}

-- Em user_attr_stats:
[
  {"user_id": "xxx", "attr_key": "color:yellow", "dislikes": 3, "streak_dislikes": 1},
  {"user_id": "xxx", "attr_key": "item:shoes", "dislikes": 1, "streak_dislikes": 1}
]
```

### 4. Próxima geração (IA com pesos):
```javascript
// Prompt para Gemini API inclui:
const prompt = `
  Generate outfit for user with preferences:
  - AVOID: color:yellow (weight: -1.2)
  - AVOID: item:shoes (weight: -0.5)
  - PREFER: color:black (weight: +0.1)
  - PREFER: color:blue (weight: +0.1)

  Do NOT include yellow shoes or any yellow items.
  Prefer black or blue items instead.
`;
```

### 5. Resultado:
Novo outfit sem sapatos amarelos! 🎉

## Tabelas em Ação

### user_preferences
```sql
SELECT weights FROM user_preferences WHERE user_id = 'user123';

-- Resultado JSON:
{
  "color:yellow": -1.2,
  "color:brown": -0.8,
  "fit:baggy": -0.5,
  "color:black": 0.3,
  "material:denim": 0.4,
  "style:casual": 0.6
}
```

### user_attr_stats
```sql
SELECT * FROM user_attr_stats WHERE user_id = 'user123' AND dislikes > 0;

-- Resultado:
user_id    | attr_key      | likes | dislikes | streak_dislikes
user123    | color:yellow  |   0   |    3     |        2
user123    | fit:wide_leg  |   1   |    5     |        3
user123    | item:skirt    |   0   |    2     |        1
```

## Como o Sistema Previne Repetição

### Progressive Rejection:
- **streak_dislikes >= 3** = Hard ban (3+ rejeições seguidas)
- **cooldown_until_session** = Evita mostrar durante X sessões
- **Dislikes totais** = Peso negativo acumulado

### Query para evitar itens indesejados:
```sql
-- Buscar sugestões EVITando o que usuário não gosta
SELECT o.*,
       (CASE WHEN uas.dislikes > 2 THEN 1 ELSE 0 END) as should_avoid
FROM outfits o
LEFT JOIN user_attr_stats uas ON (
  uas.user_id = $1
  AND (
    o.tags->>'color' = split_part(uas.attr_key, ':', 2)
    OR o.tags->>'item_type' = split_part(uas.attr_key, ':', 2)
  )
)
WHERE should_avoid IS NULL
ORDER BY RANDOM();
```

## Vantagens do Teu Schema

✅ **Poderoso**: SQL permite queries complexas de preferências
✅ **Escalável**: Postgres maneja milhões de interações
✅ **Flexível**: JSON weights permitem qualquer atributo
✅ **Inteligente**: Progressive rejection aprende rápido
✅ **Analytics**: Fácil extrair insights do comportamento

**Este sistema é MUITO mais poderoso em SQL do que seria em NoSQL!**
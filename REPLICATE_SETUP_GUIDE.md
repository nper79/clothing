# Guia de Configuração do Replicate API

## 🎯 Por que usar Replicate em vez de Gemini para imagens?

- **Custos controlados**: Replicate usa modelos com custos previsíveis (~$0.018 por imagem)
- **Sem surpresas**: Sem risco de passar o plafond inesperadamente
- **Modelos especializados**: Stable Diffusion XL otimizado para moda
- **Alta qualidade**: Imagens de 512x768 perfeitas para calibração visual

## 🚀 Passo a Passo:

### 1. Criar Conta Replicate
1. Acesse: https://replicate.com/
2. Crie sua conta gratuita
3. Verifique seu email

### 2. Obter API Token
1. Faça login em: https://replicate.com/account
2. Copie seu API token
3. Adicione ao arquivo `.env`:
```
VITE_REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Configurar Plano (Opcional)
- **Plano gratuito**: $10 crédito mensal (~555 imagens)
- **Plano pago**: Configurar limites de uso

## 💰 Custos Estimados:

- **1 imagem**: ~$0.018 USD
- **15 imagens** (calibração completa): ~$0.27 USD
- **100 imagens**: ~$1.80 USD

## 🔧 Como Funciona:

### Modelos Utilizados:
- **Stable Diffusion XL**: `stability-ai/stable-diffusion`
- **Resolução**: 512x768 (ideal para moda)
- **Qualidade**: 25 steps de inferência
- **Estilo**: Fashion photography

### Prompts Especializados:
- **Gênero específico**: Masculino, Feminino, Neutro
- **15 categorias de estilo**: Do minimalista ao techwear
- **Instruções detalhadas**: Lighting, background, poses

## 🧪 Como Testar:

1. **Configurar .env:**
```bash
# No seu arquivo .env local
VITE_REPLICATE_API_TOKEN=seu_token_aqui
```

2. **Iniciar o app:**
```bash
npm run dev
```

3. **Fazer onboarding:**
   - Selecione gênero na primeira pergunta
   - Continue até a calibração visual

4. **Testar geração:**
   - Clique em "🎨 Testar Geração de Imagem"
   - Aguarde ~30 segundos
   - Imagem aparecerá automaticamente

## 📊 Exemplo de Prompt Gerado:

**Para Streetwear Urbano Masculino:**
```
Full body fashion photograph of a man in streetwear urban outfit. Hoodie or graphic t-shirt, baggy jeans or cargo pants, trendy sneakers. Modern urban style with contemporary accessories. Urban setting, dynamic lighting, street style photography.
```

## ⚙️ Configurações Avançadas:

### Personalização de Prompts:
- **Negative prompts**: Evita imagens de baixa qualidade
- **Guidance scale**: 7.5 (equilíbrio criatividade/realismo)
- **Scheduler**: DPMSolverMultistep (melhor qualidade)

### Rate Limiting:
- **Delay automático**: 2 segundos entre imagens
- **Tratamento de erros**: Graceful degradation
- **Cache**: Evita geração duplicada

## 🛡️ Segurança:

- ✅ **Tokens seguros**: Variáveis de ambiente
- ✅ **Rate limiting**: Proteção contra abuso
- ✅ **Error handling**: Tratamento robusto de erros
- ✅ **Cost control**: Sem surpresas nos custos

## 🔍 Troubleshooting:

### Erro Comum: "API token not configured"
**Solução**: Adicionar `VITE_REPLICATE_API_TOKEN` ao `.env`

### Erro Comum: "Insufficient credits"
**Solução**: Verificar saldo em replicate.com/account

### Imagem demora muito:
**Solução**: Normal, Stable Diffusion leva ~30 segundos

### Qualidade da imagem:
**Solução**: Ajustar prompt ou tentar novamente

## 📱 Experiência do Usuário:

1. **Onboarding**: 5 perguntas (incluindo gênero)
2. **Transição**: Tela explicativa
3. **Calibração**: 15 looks com opção de gerar imagens
4. **Feedback**: Like/Dislike com detalhes
5. **Resultados**: Sistema de aprendizado baseado nas preferências

## 🚀 Próximo Passo:

Depois de configurar o Replicate, seu app estará pronto para gerar imagens reais de forma segura e controlada!
# Guia de Geração de Imagens para Calibração Visual

## 🎯 O que foi implementado:

1. **Serviço de Geração de Imagens** (`visualCalibrationService.ts`)
   - 15 categorias de estilo diferentes
   - Prompts específicos para cada gênero (Male, Female, Neutral)
   - Integração com API Gemini

2. **Sistema de Calibração Atualizado**
   - Carrega imagens baseadas no gênero selecionado
   - Interface para testar geração de imagens
   - Suporte para imagens geradas dinamicamente

## 🚀 Como ativar a geração de imagens reais:

### Passo 1: Verificar configuração da API
Certifique-se de que a API key do Gemini está configurada no `.env`:
```
VITE_API_KEY=sua_api_key_aqui
```

### Passo 2: Ativar geração automática (opcional)
No componente `VisualCalibrationSwipe.tsx`, descomente as linhas 44-51:

```typescript
// TODO: Uncomment when ready to generate actual images
// const images = await VisualCalibrationService.generateCalibrationImages(gender);
// const imageMap: { [key: string]: string } = {};
// images.forEach(img => {
//   if (img.imageData) {
//     imageMap[img.id] = img.imageData;
//   }
// });
// setGeneratedImages(imageMap);
```

### Passo 3: Testar geração manual
Use o botão "🎨 Testar Geração de Imagem" em qualquer look para testar a funcionalidade.

## 📋 Categorias de Estilo Disponíveis:

1. **Minimalista Executivo** - Profissional, clean lines
2. **Streetwear Urbano** - Moderno, descontraído
3. **Boêmio Artístico** - Criativo, orgânico
4. **Punk Rock Attitude** - Rebelde, ousado
5. **Vintage Charmoso** - Clássico, nostálgico
6. **Hip-Hop Urban** - Estilo rua, baggy
7. **Skate Punk** - Funcional, skatista
8. **Gótico Dark** - Misterioso, elegante
9. **Preppy Collegiate** - Universitário, polido
10. **Business Formal** - Corporativo, poder
11. **Artístico Ecletico** - Criativo, ousado
12. **Minimalista Casual** - Simples, confortável
13. **Indie Alternative** - Vintage, alternativo
14. **Luxury Designer** - Alta moda, sofisticado
15. **Techwear Modern** - Tecnológico, funcional

## 🎨 Exemplo de Prompt Gerado:

**Para gênero Masculino - Streetwear Urbano:**
```
Create a full-body fashion photograph showing the complete outfit.
The image should be professional, well-lit, and clearly display all clothing items and accessories.
Style: Streetwear Urbano.
Description: Estilo descontraído com influência urbana.

Create a streetwear urban outfit for a man. Hoodie or graphic t-shirt, baggy jeans or cargo pants, trendy sneakers. Modern urban style with contemporary accessories. Urban setting, dynamic lighting.
```

## ⚙️ Funcionalidades Implementadas:

- ✅ Detecção automática de gênero
- ✅ Prompts específicos por gênero
- ✅ Sistema de cache para imagens geradas
- ✅ Interface de carregamento
- ✅ Botão de teste por look
- ✅ Tratamento de erros
- ✅ Logging para debug

## 🔧 Próximos Passos:

1. **Configurar API Gemini** para geração de imagens reais
2. **Testar prompts** com diferentes parâmetros
3. **Otimizar desempenho** de cache
4. **Adicionar mais estilos** conforme necessário
5. **Implementar feedback loop** baseado nas imagens geradas

## 📱 Como Testar:

1. Faça o onboarding completo
2. Selecione um gênero na primeira pergunta
3. Continue até a calibração visual
4. Clique em "🎨 Testar Geração de Imagem" em qualquer look
5. Verifique o console para os prompts gerados

O sistema está pronto para gerar imagens reais quando a API Gemini estiver configurada!
# Lemon Squeezy vs Stripe para Supabase Integration

## Lemon Squeezy - Vantagens

### ✅ Mais Fácil de Integrar:
- **API mais simples** que Stripe
- **Dashboard mais intuitivo**
- **Tax management** incluído (VAT, sales tax automático)
- **No-code checkout links**
- **Documentação mais simples**

### ✅ Benefícios para EU:
- **Merchant of Record** - eles cuidam de todos os impostos
- **Suporte global** mais simples
- **Menos paperwork**
- **Preços mais transparentes**

### Exemplo de Código Lemon Squeezy:
```typescript
// Supabase Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import LemonSqueezy from 'https://esm.sh/@lemonsqueezy/lemonsqueezy.js'

const lemon = new LemonSqueezy({
  apiKey: Deno.env.get('LEMONSQUEEZY_API_KEY'),
})

serve(async (req) => {
  try {
    // Criar checkout URL (mais simples que Stripe)
    const checkout = await lemon.createCheckout({
      storeId: 'your_store_id',
      variantId: 'variant_id',
      customerEmail: 'user@example.com',
      customData: {
        user_id: 'user123',
      }
    })

    return Response.json({ url: checkout.url })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }
})
```

## Stripe - Desvantagens para Supabase

### ❌ Mais Complexo:
- **API mais complexa** com mais endpoints
- **Tax management manual** (precisas de calcular VAT)
- **Mais configurações** necessárias
- **Documentação mais extensa**

### ❌ Para EU/Portugal:
- **Precisas de registo de empresa**
- **VAT/Sales tax manual**
- **Mais compliance requirements**

## Comparação de Features

| Feature | Lemon Squeezy | Stripe |
|---------|---------------|--------|
| **Setup Time** | ⚡ 15 minutos | 🐌 2-4 horas |
| **API Complexity** | ✅ Simples | ❌ Complexa |
| **Tax Management** | ✅ Automático | ❌ Manual |
| **Webhooks** | ✅ Completos | ✅ Completos |
| **Dashboard** | ✅ Intuitivo | ⚠️ Enterprise |
| **Documentation** | ✅ Simples | ⚠️ Extensa |
| **EU Support** | ✅ Nativo | ⚠️ Requer setup |
| **Pricing** | 5% + €0.50 | 2.9% + €0.30 |

## Webhook Implementation - Lemon Squeezy

```typescript
// Mais simples que Stripe
export async function handleLemonSqueezyWebhook(req: Request) {
  const signature = req.headers.get('x-signature')
  const body = await req.text()

  // Verificar webhook (mais simples)
  const event = lemon.verifyWebhook(body, signature)

  switch (event.event) {
    case 'order_created':
      const order = event.data
      await updateUserPlan(order.attributes.user_id, 'premium')
      break

    case 'subscription_created':
      const sub = event.data
      await activateSubscription(sub.attributes.user_id, sub.id)
      break

    case 'subscription_cancelled':
      await cancelSubscription(event.data.attributes.user_id)
      break
  }

  return Response.json({ received: true })
}
```

## Veredito Final

### Lemon Squeezy é MELHOR para:
- ✅ **Desenvolvedores individuais/startups**
- ✅ **Integração rápida** (horas vs dias)
- ✅ **Mercado global** sem preocupações fiscais
- ✅ **Simplicidade** na API e dashboard
- ✅ **Suporte a PT/EU** nativo

### Stripe é MELHOR para:
- ✅ **Empresas estabelecidas**
- ✅ **Feature requirements complexas**
- ✅ **Volume muito alto** de transações
- ✅ **Customização avançada**

## Recomendação para o Teu Caso

**Lemon Squeezy é PERFEITO para:**
- App de clothing individual
- Queres começar rápido
- Não te queres preocupar com impostos EU
- Integração simples com Supabase

**Próximos passos:**
1. Criar conta Lemon Squeezy (5 minutos)
2. Criar produto/variant
3. Implementar Edge Function (1-2 horas)
4. Configurar webhook (15 minutos)

**Total: 1 dia vs 1 semana com Stripe!** 🎯
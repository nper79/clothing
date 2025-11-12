// Exemplo de como seria implementar Stripe com Supabase Edge Functions
// Muito mais complexo que Firebase + Stripe Extension

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { price_id, user_id, success_url, cancel_url } = await req.json()

    // Verificar se utilizador existe (precisa de auth check manual)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    // Criar checkout session (todo manual)
    const session = await stripe.checkout.sessions.create({
      customer_email: 'user@example.com', // Precisa de buscar da BD
      billing_address_collection: 'auto',
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url,
      cancel_url,
      metadata: {
        user_id, // Para usar no webhook
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Webhook handler (precisa de implementar separadamente)
export async function handleStripeWebhook(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  const event = stripe.webhooks.constructEvent(
    body,
    signature!,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  )

  // Processar eventos manualmente
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      // Atualizar utilizador na BD manualmente
      await updateUserSubscription(session.metadata?.user_id, 'active')
      break
    // ... outros eventos
  }
}
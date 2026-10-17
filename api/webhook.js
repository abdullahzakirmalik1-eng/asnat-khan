import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gehsytzcfikikzkuzstc.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Config to disable Vercel body parsing if raw buffer is needed for webhook signature
export const config = {
  api: {
    bodyParser: false
  }
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', err => reject(err));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return res.status(503).json({
      error: 'Webhook receiver awaiting STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET configuration.'
    });
  }

  const stripe = new Stripe(stripeSecretKey);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`[Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.client_reference_id || session.metadata?.orderId;
        const sessionId = session.id;

        if (orderId) {
          // Idempotency check: check current order status
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('payment_status')
            .eq('id', orderId)
            .single();

          if (existingOrder && existingOrder.payment_status === 'paid') {
            console.log(`[Webhook] Order ${orderId} already marked paid (idempotent skip).`);
            return res.status(200).json({ received: true });
          }

          // Mark paid & confirmed
          await supabase.from('orders').update({
            payment_status: 'paid',
            order_status: 'confirmed',
            payment_reference: sessionId,
            updated_at: new Date().toISOString()
          }).eq('id', orderId);

          await supabase.from('order_events').insert([{
            order_id: orderId,
            event_type: 'stripe_checkout_session_completed',
            provider: 'stripe',
            payload: { sessionId, amountTotal: session.amount_total }
          }]);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await supabase.from('orders').update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          }).eq('id', orderId);

          await supabase.from('order_events').insert([{
            order_id: orderId,
            event_type: 'stripe_payment_failed',
            provider: 'stripe',
            payload: { error: paymentIntent.last_payment_error?.message }
          }]);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await supabase.from('orders').update({
            payment_status: 'cancelled',
            updated_at: new Date().toISOString()
          }).eq('id', orderId);

          await supabase.from('order_events').insert([{
            order_id: orderId,
            event_type: 'stripe_payment_cancelled',
            provider: 'stripe',
            payload: { canceledAt: paymentIntent.canceled_at }
          }]);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Handler error:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}

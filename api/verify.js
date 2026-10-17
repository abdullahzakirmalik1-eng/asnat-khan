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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const params = req.method === 'POST' ? req.body : req.query;
    let data = params;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }

    const { orderId, token, sessionId } = data || {};

    if (!orderId && !sessionId) {
      return res.status(400).json({ success: false, error: 'Missing order or session identifier' });
    }

    const supabase = getSupabase();
    let order = null;

    if (orderId) {
      const { data: ord, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (!error && ord) order = ord;
    } else if (sessionId) {
      const { data: ord, error } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_reference', sessionId)
        .single();
      if (!error && ord) order = ord;
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Security check
    if (token && order.access_token !== token) {
      return res.status(403).json({ success: false, error: 'Unauthorized order token' });
    }

    // Check Stripe session if applicable
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (sessionId && stripeSecretKey && stripeSecretKey.startsWith('sk_')) {
      try {
        const stripe = new Stripe(stripeSecretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session && session.payment_status === 'paid' && order.payment_status !== 'paid') {
          order.payment_status = 'paid';
          order.order_status = 'confirmed';
          order.updated_at = new Date().toISOString();

          await supabase.from('orders').update({
            payment_status: 'paid',
            order_status: 'confirmed',
            updated_at: order.updated_at
          }).eq('id', order.id);

          await supabase.from('order_events').insert([{
            order_id: order.id,
            event_type: 'stripe_payment_verified_via_retrieve',
            provider: 'stripe',
            payload: { sessionId, paymentIntent: session.payment_intent }
          }]);
        }
      } catch (stripeErr) {
        console.warn('[API /api/verify] Stripe session retrieve warning:', stripeErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      verified: order.payment_status === 'paid',
      order: {
        id: order.id,
        orderRef: order.order_ref,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerCountry: order.customer_country,
        customerBusiness: order.customer_business,
        packageName: order.package_name,
        packageId: order.package_id,
        packagePrice: order.package_price,
        additionalProductsCount: order.additional_products_count,
        additionalProductsCost: order.additional_products_cost,
        additionalServices: order.additional_services,
        lineItems: order.line_items,
        projectName: order.project_name,
        brandName: order.brand_name,
        websiteUrl: order.website_url,
        projectDescription: order.project_description,
        projectGoals: order.project_goals,
        projectReferences: order.project_references,
        specialRequirements: order.special_requirements,
        subtotal: order.subtotal,
        taxAmount: order.tax_amount,
        totalAmount: order.total_amount,
        currency: order.currency,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        paymentProvider: order.payment_provider,
        paymentReference: order.payment_reference,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });

  } catch (err) {
    console.error('[API /api/verify] Error:', err);
    return res.status(500).json({ success: false, error: 'Server error during payment verification' });
  }
}

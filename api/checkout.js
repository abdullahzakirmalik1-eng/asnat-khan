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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed.` });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
      }
    }

    const {
      orderId,
      accessToken,
      customerName = '',
      customerEmail = '',
      customerCountry = '',
      customerBusiness = '',
      billingAddress = {},
      testModeAction = '' // 'verify_success' | 'test_pending' | 'test_failed' | 'test_cancel'
    } = body;

    if (!orderId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing order identifier or security token' });
    }

    // Validate customer details
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ success: false, error: 'Full customer name is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }
    if (!customerCountry || !customerCountry.trim()) {
      return res.status(400).json({ success: false, error: 'Country selection is required for billing' });
    }

    const supabase = getSupabase();

    // 1. Fetch existing order to verify authenticity and server total
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      return res.status(404).json({ success: false, error: 'Order not found or expired' });
    }

    if (order.access_token !== accessToken) {
      return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'This order has already been paid and confirmed.'
      });
    }

    // 2. Update customer details on order record
    const updatePayload = {
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_country: customerCountry.trim(),
      customer_business: customerBusiness ? customerBusiness.trim() : order.customer_business,
      billing_address: billingAddress || {},
      updated_at: new Date().toISOString()
    };

    // Determine host for redirect URLs
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'] || 'localhost:8090';
    const baseUrl = `${proto}://${host}`;

    // 3. Check for Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (stripeSecretKey && stripeSecretKey.startsWith('sk_')) {
      // Live or Test Stripe Checkout Session
      const stripe = new Stripe(stripeSecretKey);

      // Construct Stripe line items strictly from verified order line items
      const stripeLineItems = (order.line_items || []).map(item => {
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Asnat Khan — ${item.name}`,
              description: item.description || undefined
            },
            unit_amount: Math.round(Number(item.unitPrice) * 100)
          },
          quantity: item.quantity || 1
        };
      });

      // Fallback if line items empty
      if (!stripeLineItems.length) {
        stripeLineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Asnat Khan — ${order.package_name} Package`,
              description: order.project_description?.slice(0, 200) || 'Website package delivery'
            },
            unit_amount: Math.round(Number(order.total_amount) * 100)
          },
          quantity: 1
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: stripeLineItems,
        mode: 'payment',
        customer_email: customerEmail.trim(),
        client_reference_id: order.id,
        metadata: {
          orderId: order.id,
          orderRef: order.order_ref,
          packageId: order.package_id
        },
        success_url: `${baseUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}&token=${order.access_token}`,
        cancel_url: `${baseUrl}/order-confirmation?status=cancelled&order_id=${order.id}&token=${order.access_token}`
      });

      updatePayload.payment_provider = 'stripe';
      updatePayload.payment_reference = session.id;
      updatePayload.payment_status = 'processing';

      await supabase.from('orders').update(updatePayload).eq('id', order.id);

      // Record event
      await supabase.from('order_events').insert([{
        order_id: order.id,
        event_type: 'stripe_checkout_session_created',
        provider: 'stripe',
        payload: { sessionId: session.id, url: session.url }
      }]);

      return res.status(200).json({
        success: true,
        provider: 'stripe',
        checkoutUrl: session.url,
        sessionId: session.id
      });
    }

    // 4. If Stripe is not configured: Handle transparent test mode or configuration prompt
    if (testModeAction) {
      if (testModeAction === 'verify_success') {
        updatePayload.payment_provider = 'test_mode';
        updatePayload.payment_reference = `test_ch_${Date.now()}`;
        updatePayload.payment_status = 'paid';
        updatePayload.order_status = 'confirmed';

        await supabase.from('orders').update(updatePayload).eq('id', order.id);
        await supabase.from('order_events').insert([{
          order_id: order.id,
          event_type: 'test_payment_verified',
          provider: 'test_mode',
          payload: { total: order.total_amount, note: 'Verified in developer test mode' }
        }]);

        return res.status(200).json({
          success: true,
          provider: 'test_mode',
          status: 'paid',
          redirectUrl: `${baseUrl}/order-confirmation?order_id=${order.id}&token=${order.access_token}&status=paid`
        });
      } else if (testModeAction === 'test_pending') {
        updatePayload.payment_provider = 'test_mode';
        updatePayload.payment_reference = `test_pen_${Date.now()}`;
        updatePayload.payment_status = 'processing';
        updatePayload.order_status = 'pending';

        await supabase.from('orders').update(updatePayload).eq('id', order.id);
        await supabase.from('order_events').insert([{
          order_id: order.id,
          event_type: 'test_payment_pending',
          provider: 'test_mode',
          payload: { note: 'Awaiting webhook or provider response' }
        }]);

        return res.status(200).json({
          success: true,
          provider: 'test_mode',
          status: 'processing',
          redirectUrl: `${baseUrl}/order-confirmation?order_id=${order.id}&token=${order.access_token}&status=pending`
        });
      } else if (testModeAction === 'test_failed') {
        updatePayload.payment_provider = 'test_mode';
        updatePayload.payment_reference = `test_fail_${Date.now()}`;
        updatePayload.payment_status = 'failed';

        await supabase.from('orders').update(updatePayload).eq('id', order.id);
        await supabase.from('order_events').insert([{
          order_id: order.id,
          event_type: 'test_payment_failed',
          provider: 'test_mode',
          payload: { reason: 'Simulated card declined or balance insufficient' }
        }]);

        return res.status(200).json({
          success: true,
          provider: 'test_mode',
          status: 'failed',
          redirectUrl: `${baseUrl}/checkout?order_id=${order.id}&token=${order.access_token}&error=payment_failed`
        });
      } else if (testModeAction === 'test_cancel') {
        updatePayload.payment_provider = 'test_mode';
        updatePayload.payment_reference = `test_can_${Date.now()}`;
        updatePayload.payment_status = 'cancelled';

        await supabase.from('orders').update(updatePayload).eq('id', order.id);
        await supabase.from('order_events').insert([{
          order_id: order.id,
          event_type: 'test_payment_cancelled',
          provider: 'test_mode',
          payload: { reason: 'Customer cancelled transaction before completion' }
        }]);

        return res.status(200).json({
          success: true,
          provider: 'test_mode',
          status: 'cancelled',
          redirectUrl: `${baseUrl}/order-confirmation?order_id=${order.id}&token=${order.access_token}&status=cancelled`
        });
      }
    }

    // If Stripe is not configured and no test action specified:
    await supabase.from('orders').update(updatePayload).eq('id', order.id);
    return res.status(200).json({
      success: false,
      requiresConfiguration: true,
      provider: 'stripe',
      message: 'Stripe secret key (STRIPE_SECRET_KEY) is not yet configured in environment variables. Set STRIPE_SECRET_KEY in your .env file to enable live checkout, or use Sandbox Test Mode to verify order workflows.'
    });

  } catch (err) {
    console.error('[API /api/checkout] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while initiating the checkout session.'
    });
  }
}

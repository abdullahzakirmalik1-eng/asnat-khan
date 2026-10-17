import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { calculateOrderPricing } from '../js/packages.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gehsytzcfikikzkuzstc.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function generateOrderRef() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `AK-${dateStr}-${randomSuffix}`;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET /api/order (Single order by id/ref, or customer order list by email)
  if (req.method === 'GET') {
    try {
      const { id, token, ref, email } = req.query;

      const supabase = getSupabase();

      // If email provided, fetch all orders associated with customer
      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .ilike('customer_email', cleanEmail)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[API /api/order GET email] Error:', error);
          return res.status(500).json({ success: false, error: 'Database error fetching customer orders' });
        }

        return res.status(200).json({
          success: true,
          orders: orders || []
        });
      }

      if (!id && !ref) {
        return res.status(400).json({ success: false, error: 'Missing order identifier or email' });
      }

      let query = supabase.from('orders').select('*');
      if (id) {
        query = query.eq('id', id);
      } else {
        query = query.eq('order_ref', ref);
      }

      const { data: order, error } = await query.single();
      if (error || !order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      // Security check: require access_token verification if token is provided or stored
      if (token && order.access_token && order.access_token !== token) {
        return res.status(403).json({ success: false, error: 'Unauthorized access to order' });
      }

      return res.status(200).json({
        success: true,
        order
      });
    } catch (err) {
      console.error('[API /api/order GET] Error:', err);
      return res.status(500).json({ success: false, error: 'Server error retrieving order' });
    }
  }

  // Handle PUT /api/order (Save requirements, project details, or client updates)
  if (req.method === 'PUT') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
        }
      }

      const { id, token, requirements, projectName, websiteUrl, brandName, clientNotes } = body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Missing required order id' });
      }

      const supabase = getSupabase();
      const { data: existingOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !existingOrder) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      // Verify access token if stored
      if (token && existingOrder.access_token && existingOrder.access_token !== token) {
        return res.status(403).json({ success: false, error: 'Unauthorized access to update this order' });
      }

      // Merge metadata with requirements
      const updatedMetadata = {
        ...(existingOrder.metadata || {}),
        requirements: requirements || existingOrder.metadata?.requirements || {},
        clientNotes: clientNotes || existingOrder.metadata?.clientNotes || '',
        requirementsSavedAt: new Date().toISOString()
      };

      const updateFields = {
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      };

      if (projectName !== undefined) updateFields.project_name = projectName;
      if (websiteUrl !== undefined) updateFields.website_url = websiteUrl;
      if (brandName !== undefined) updateFields.brand_name = brandName;

      const { data: updated, error: updateErr } = await supabase
        .from('orders')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        console.error('[API /api/order PUT] Supabase error:', updateErr);
        return res.status(500).json({ success: false, error: 'Failed to update order details' });
      }

      return res.status(200).json({
        success: true,
        order: updated
      });
    } catch (err) {
      console.error('[API /api/order PUT] Internal error:', err);
      return res.status(500).json({ success: false, error: 'Server error saving requirements' });
    }
  }

  // Handle POST /api/order (Create or update order draft)
  if (req.method === 'POST') {
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
        packageId = 'basic',
        additionalProducts = 0,
        additionalServices = [],
        projectName = '',
        brandName = '',
        websiteUrl = '',
        projectDescription = '',
        projectGoals = '',
        projectReferences = '',
        specialRequirements = '',
        customerName = '',
        customerEmail = '',
        customerCountry = '',
        customerBusiness = '',
        billingAddress = {},
        existingOrderId = '',
        accessToken: providedToken = ''
      } = body;

      // Validate required fields
      if (!projectDescription || !projectDescription.trim()) {
        return res.status(400).json({
          success: false,
          error: 'A brief project description is required.'
        });
      }

      // Authoritative server-side price calculation
      const calculated = calculateOrderPricing({
        packageId,
        additionalProducts,
        additionalServices
      });

      const orderId = existingOrderId || `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const orderRef = generateOrderRef();
      const accessToken = providedToken || crypto.randomUUID();

      const orderRecord = {
        id: orderId,
        order_ref: orderRef,
        customer_id: null,
        customer_name: customerName ? customerName.trim() : 'Guest Customer',
        customer_email: customerEmail ? customerEmail.trim() : '',
        customer_country: customerCountry || '',
        customer_business: customerBusiness || brandName || '',
        billing_address: billingAddress || {},
        package_id: calculated.package.id,
        package_name: calculated.package.name,
        package_price: calculated.package.price,
        additional_products_count: calculated.additionalProducts,
        additional_products_cost: calculated.additionalProductsCost,
        additional_services: calculated.additionalServices,
        line_items: calculated.lineItems,
        project_name: projectName || '',
        brand_name: brandName || '',
        website_url: websiteUrl || '',
        project_description: projectDescription.trim(),
        project_goals: projectGoals || '',
        project_references: projectReferences || '',
        special_requirements: specialRequirements || '',
        subtotal: calculated.subtotal,
        tax_amount: calculated.taxAmount,
        total_amount: calculated.totalAmount,
        currency: calculated.currency,
        order_status: 'pending',
        payment_status: 'pending',
        payment_provider: null,
        payment_reference: null,
        access_token: accessToken,
        metadata: {
          clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        },
        updated_at: new Date().toISOString()
      };

      const supabase = getSupabase();

      // Upsert order in Supabase
      const { data: savedOrder, error: dbError } = await supabase
        .from('orders')
        .upsert(orderRecord, { onConflict: 'id' })
        .select()
        .single();

      if (dbError) {
        console.warn('[API /api/order] Supabase insert warning:', dbError.message);
      }

      return res.status(200).json({
        success: true,
        order: {
          id: orderId,
          orderRef: orderRef,
          packageId: calculated.package.id,
          packageName: calculated.package.name,
          packagePrice: calculated.package.price,
          additionalProductsCount: calculated.additionalProducts,
          additionalProductsCost: calculated.additionalProductsCost,
          additionalServices: calculated.additionalServices,
          lineItems: calculated.lineItems,
          subtotal: calculated.subtotal,
          taxAmount: calculated.taxAmount,
          totalAmount: calculated.totalAmount,
          currency: calculated.currency,
          accessToken: accessToken,
          orderStatus: 'pending',
          paymentStatus: 'pending'
        }
      });
    } catch (err) {
      console.error('[API /api/order POST] Internal error:', err);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred while calculating and preparing your order.'
      });
    }
  }

  return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed.` });
}

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gehsytzcfikikzkuzstc.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I';

// Administrator credentials and session secret
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'asnat@asnatkhan.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AsnatStudio2026!';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'ak_sec_admin_d9110e062c210a6046';

// Standard 12 project lifecycle stages
export const PROJECT_STAGES = [
  { id: 'order_received', label: 'Order Received', group: 'onboarding' },
  { id: 'awaiting_requirements', label: 'Awaiting Requirements', group: 'onboarding' },
  { id: 'requirements_review', label: 'Requirements Review', group: 'onboarding' },
  { id: 'ready_to_start', label: 'Ready to Start', group: 'production' },
  { id: 'in_progress', label: 'In Progress', group: 'production' },
  { id: 'awaiting_feedback', label: 'Awaiting Customer Feedback', group: 'review' },
  { id: 'revisions', label: 'Revisions', group: 'review' },
  { id: 'final_qc', label: 'Final Quality Check', group: 'delivery' },
  { id: 'ready_for_delivery', label: 'Ready for Delivery', group: 'delivery' },
  { id: 'completed', label: 'Completed', group: 'delivery' },
  { id: 'on_hold', label: 'On Hold', group: 'special' },
  { id: 'cancelled', label: 'Cancelled', group: 'special' }
];

export const DEFAULT_MILESTONES = [
  { id: 'requirements', name: 'Requirements Confirmed', status: 'not_started', description: 'Brief and client scope aligned', updated_at: null },
  { id: 'design', name: 'Design & Visual Identity', status: 'not_started', description: 'Wireframes and visual components', updated_at: null },
  { id: 'content', name: 'Content & Copywriting', status: 'not_started', description: 'Copy integration and image curation', updated_at: null },
  { id: 'development', name: 'Development & Build', status: 'not_started', description: 'Responsive frontend and backend engineering', updated_at: null },
  { id: 'seo_performance', name: 'SEO & Performance', status: 'not_started', description: 'Page speed, metadata, and core web vitals', updated_at: null },
  { id: 'qa', name: 'Quality Assurance', status: 'not_started', description: 'Cross-browser and multi-device verification', updated_at: null },
  { id: 'deployment', name: 'Deployment & Setup', status: 'not_started', description: 'Hosting provisioning and domain connection', updated_at: null },
  { id: 'delivery', name: 'Final Delivery & Handover', status: 'not_started', description: 'Credentials transfer and project completion', updated_at: null }
];

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
}

function getLocalOrdersFilePath() {
  return path.join(process.cwd(), 'orders.json');
}

function readLocalOrders() {
  try {
    const fp = getLocalOrdersFilePath();
    if (fs.existsSync(fp)) {
      const data = fs.readFileSync(fp, 'utf8');
      const clean = data.replace(/^\uFEFF/, '').trim();
      return clean ? JSON.parse(clean) : [];
    }
  } catch (err) {
    console.warn('[readLocalOrders] fallback read error:', err.message);
  }
  return [];
}

function writeLocalOrders(orders) {
  try {
    const fp = getLocalOrdersFilePath();
    fs.writeFileSync(fp, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.warn('[writeLocalOrders] write error:', err.message);
  }
}

// Generate secure admin token
function generateAdminSessionToken(email) {
  const payload = {
    role: 'admin',
    email: email.toLowerCase(),
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const str = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(str).digest('hex');
  return Buffer.from(str).toString('base64url') + '.' + signature;
}

// Verify admin session token
function verifyAdminSession(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // Direct master secret match
  if (token === ADMIN_SECRET) {
    return { role: 'admin', email: ADMIN_EMAIL, name: 'Asnat Khan' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [b64Payload, sig] = parts;
  try {
    const jsonStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(jsonStr).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      const payload = JSON.parse(jsonStr);
      if (payload.exp && Date.now() > payload.exp) {
        return null; // Expired
      }
      if (payload.role === 'admin') {
        return {
          role: 'admin',
          email: payload.email,
          name: 'Asnat Khan'
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

// Log audit event to Supabase and console
async function logAuditEvent(orderId, action, details = {}, actor = 'Asnat Khan (Admin)') {
  const auditRecord = {
    order_id: orderId || null,
    actor,
    action,
    details,
    created_at: new Date().toISOString()
  };

  try {
    const supabase = getSupabase();
    await supabase.from('admin_audit_logs').insert([auditRecord]);
  } catch (err) {
    console.warn('[logAuditEvent] Supabase audit write note:', err.message);
  }
}

// Helper: Normalize order record metadata structure
export function normalizeOrderMetadata(order) {
  if (!order) return null;
  const meta = order.metadata || {};
  return {
    ...order,
    milestones: meta.milestones || JSON.parse(JSON.stringify(DEFAULT_MILESTONES)),
    customer_updates: meta.customer_updates || [],
    internal_notes: meta.internal_notes || [],
    requirements_data: meta.requirements_data || {
      status: 'pending',
      reviewed_at: null,
      confirmed_at: null,
      missing_items: [],
      clarification_request: null,
      reviewer_notes: ''
    },
    files: meta.files || [],
    messages: meta.messages || [],
    activity_log: meta.activity_log || [
      {
        id: `act_${Date.now()}_init`,
        timestamp: order.created_at || new Date().toISOString(),
        actor: 'System',
        type: 'order_created',
        description: `Order received (${order.package_name || 'Standard'})`,
        scope: 'customer'
      }
    ]
  };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-admin-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action || (req.body && req.body.action) || 'overview';

  // 1. PUBLIC ROUTE: Admin Login
  if (action === 'login' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON payload' }); }
    }
    const { email, password } = body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = generateAdminSessionToken(cleanEmail);
      await logAuditEvent(null, 'admin_login_success', { email: cleanEmail }, 'Asnat Khan');
      return res.status(200).json({
        success: true,
        token,
        admin: {
          name: 'Asnat Khan',
          email: cleanEmail,
          role: 'admin'
        }
      });
    }

    await logAuditEvent(null, 'admin_login_failed', { attempted_email: cleanEmail }, 'Unknown');
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator credentials'
    });
  }

  // 2. SERVER-SIDE AUTHORIZATION CHECK FOR ALL PROTECTED ADMIN ACTIONS
  const authHeader = req.headers['authorization'] || req.headers['x-admin-key'] || req.query.admin_token;
  const adminUser = verifyAdminSession(authHeader);

  if (!adminUser) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid administrator session required.'
    });
  }

  // Session verification route
  if (action === 'verify_session') {
    return res.status(200).json({
      success: true,
      admin: adminUser
    });
  }

  const supabase = getSupabase();

  // --------------------------------------------------------------------------
  // ACTION: OVERVIEW (Metrics, Attention items, Recent Orders)
  // --------------------------------------------------------------------------
  if (action === 'overview') {
    try {
      let orders = [];
      const { data: sbOrders, error: sbErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sbErr && sbOrders && sbOrders.length > 0) {
        orders = sbOrders;
      } else {
        orders = readLocalOrders();
      }

      // Compute exact metrics from real data
      const totalOrders = orders.length;
      const paidOrders = orders.filter(o => o.payment_status === 'paid').length;
      const newOrders = orders.filter(o => {
        const isRecent = (Date.now() - new Date(o.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
        return isRecent || o.order_status === 'order_received' || o.order_status === 'pending';
      }).length;

      const inProgressOrders = orders.filter(o =>
        ['in_progress', 'ready_to_start', 'revisions', 'final_qc', 'awaiting_feedback'].includes(o.order_status)
      ).length;

      const awaitingRequirements = orders.filter(o =>
        o.order_status === 'awaiting_requirements' ||
        (o.payment_status === 'paid' && (!o.metadata?.requirements_data || o.metadata.requirements_data.status === 'pending') && o.order_status !== 'completed')
      ).length;

      const completedOrders = orders.filter(o => o.order_status === 'completed').length;

      const failedOrPendingPayments = orders.filter(o =>
        ['failed', 'pending', 'processing'].includes(o.payment_status)
      ).length;

      // Needs Attention items
      const needsAttention = [];

      orders.forEach(o => {
        // Newly paid orders not yet reviewed
        if (o.payment_status === 'paid' && (!o.order_status || o.order_status === 'confirmed' || o.order_status === 'pending' || o.order_status === 'order_received')) {
          needsAttention.push({
            id: `att_paid_${o.id}`,
            order_id: o.id,
            order_ref: o.order_ref,
            customer_name: o.customer_name,
            type: 'new_paid_unreviewed',
            priority: 'high',
            message: `Order ${o.order_ref} is paid and awaiting brief review.`,
            action_url: `/admin/orders/${o.id}`
          });
        }

        // Waiting for customer requirements
        if (o.order_status === 'awaiting_requirements' || (o.metadata?.requirements_data?.status === 'clarification_requested')) {
          needsAttention.push({
            id: `att_req_${o.id}`,
            order_id: o.id,
            order_ref: o.order_ref,
            customer_name: o.customer_name,
            type: 'awaiting_requirements',
            priority: 'medium',
            message: `Order ${o.order_ref} is awaiting customer requirements input.`,
            action_url: `/admin/orders/${o.id}/requirements`
          });
        }

        // Failed payment needing review
        if (o.payment_status === 'failed') {
          needsAttention.push({
            id: `att_payfail_${o.id}`,
            order_id: o.id,
            order_ref: o.order_ref,
            customer_name: o.customer_name,
            type: 'payment_failed',
            priority: 'high',
            message: `Order ${o.order_ref} payment failed. Customer may need follow-up.`,
            action_url: `/admin/orders/${o.id}`
          });
        }
      });

      return res.status(200).json({
        success: true,
        metrics: {
          totalOrders,
          newOrders,
          paidOrders,
          inProgressOrders,
          awaitingRequirements,
          completedOrders,
          failedOrPendingPayments
        },
        needsAttention: needsAttention.slice(0, 8),
        recentOrders: orders.slice(0, 10).map(o => ({
          id: o.id,
          order_ref: o.order_ref,
          customer_name: o.customer_name,
          customer_email: o.customer_email,
          package_name: o.package_name,
          total_amount: o.total_amount,
          currency: o.currency || 'USD',
          payment_status: o.payment_status,
          order_status: o.order_status,
          created_at: o.created_at,
          updated_at: o.updated_at
        }))
      });
    } catch (err) {
      console.error('[Admin Overview Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to generate admin overview' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: ORDERS (Searchable, Filterable, Paginated Table)
  // --------------------------------------------------------------------------
  if (action === 'orders') {
    try {
      let orders = [];
      const { data: sbOrders, error: sbErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sbErr && sbOrders && sbOrders.length > 0) {
        orders = sbOrders;
      } else {
        orders = readLocalOrders();
      }

      const {
        search = '',
        status = 'all',
        paymentStatus = 'all',
        packageId = 'all',
        attentionOnly = 'false',
        page = 1,
        limit = 10
      } = req.query;

      let filtered = [...orders];

      // Text search
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(o =>
          (o.order_ref && o.order_ref.toLowerCase().includes(q)) ||
          (o.id && o.id.toLowerCase().includes(q)) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
          (o.package_name && o.package_name.toLowerCase().includes(q)) ||
          (o.project_name && o.project_name.toLowerCase().includes(q))
        );
      }

      // Project status filter
      if (status && status !== 'all') {
        filtered = filtered.filter(o => o.order_status === status);
      }

      // Payment status filter
      if (paymentStatus && paymentStatus !== 'all') {
        filtered = filtered.filter(o => o.payment_status === paymentStatus);
      }

      // Package filter
      if (packageId && packageId !== 'all') {
        filtered = filtered.filter(o => o.package_id === packageId || (o.package_name && o.package_name.toLowerCase() === packageId.toLowerCase()));
      }

      // Attention only filter
      if (attentionOnly === 'true') {
        filtered = filtered.filter(o =>
          (o.payment_status === 'paid' && ['confirmed', 'pending', 'order_received'].includes(o.order_status)) ||
          o.order_status === 'awaiting_requirements' ||
          o.payment_status === 'failed'
        );
      }

      const totalItems = filtered.length;
      const currentPage = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
      const totalPages = Math.ceil(totalItems / pageSize) || 1;
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedOrders = filtered.slice(startIndex, startIndex + pageSize);

      return res.status(200).json({
        success: true,
        orders: paginatedOrders.map(o => ({
          id: o.id,
          order_ref: o.order_ref,
          customer_name: o.customer_name,
          customer_email: o.customer_email,
          customer_business: o.customer_business,
          package_name: o.package_name,
          package_id: o.package_id,
          total_amount: o.total_amount,
          currency: o.currency || 'USD',
          payment_status: o.payment_status,
          order_status: o.order_status,
          created_at: o.created_at,
          updated_at: o.updated_at
        })),
        pagination: {
          total: totalItems,
          page: currentPage,
          limit: pageSize,
          totalPages
        }
      });
    } catch (err) {
      console.error('[Admin Orders Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve order list' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: ORDER (Full Order Details)
  // --------------------------------------------------------------------------
  if (action === 'order') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Order identifier required' });
    }

    try {
      let order = null;
      const { data: sbOrder, error: sbErr } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${id},order_ref.eq.${id}`)
        .single();

      if (!sbErr && sbOrder) {
        order = sbOrder;
      } else {
        const local = readLocalOrders();
        order = local.find(o => o.id === id || o.order_ref === id);
      }

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const normalized = normalizeOrderMetadata(order);
      return res.status(200).json({
        success: true,
        order: normalized
      });
    } catch (err) {
      console.error('[Admin Order Details Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to load order details' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: UPDATE STATUS
  // --------------------------------------------------------------------------
  if (action === 'update_status' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON payload' }); }
    }

    const { id, newStatus, customerUpdateMessage, expectedCompletionDate } = body || {};

    if (!id || !newStatus) {
      return res.status(400).json({ success: false, error: 'Missing order id or newStatus' });
    }

    const validStage = PROJECT_STAGES.find(s => s.id === newStatus);
    if (!validStage) {
      return res.status(400).json({ success: false, error: 'Invalid project status provided' });
    }

    try {
      let existingOrder = null;
      const { data: sbOrder } = await supabase.from('orders').select('*').eq('id', id).single();
      if (sbOrder) {
        existingOrder = sbOrder;
      } else {
        const local = readLocalOrders();
        existingOrder = local.find(o => o.id === id);
      }

      if (!existingOrder) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const prevStatus = existingOrder.order_status || 'order_received';
      const nowIso = new Date().toISOString();
      const meta = existingOrder.metadata || {};

      // Prepare activity log item
      const activityItem = {
        id: `act_${Date.now()}`,
        timestamp: nowIso,
        actor: 'Asnat Khan (Admin)',
        type: 'status_change',
        description: `Project status changed from ${prevStatus} to ${validStage.label}`,
        previous_value: prevStatus,
        new_value: newStatus,
        customer_update: customerUpdateMessage || null,
        scope: 'public'
      };

      const updatedActivityLog = [activityItem, ...(meta.activity_log || [])];

      // Prepare customer update if provided
      let updatedCustomerUpdates = meta.customer_updates || [];
      if (customerUpdateMessage && customerUpdateMessage.trim()) {
        updatedCustomerUpdates = [
          {
            id: `upd_${Date.now()}`,
            timestamp: nowIso,
            status: newStatus,
            status_label: validStage.label,
            message: customerUpdateMessage.trim(),
            author: 'Asnat Khan'
          },
          ...updatedCustomerUpdates
        ];
      }

      const updatedMetadata = {
        ...meta,
        activity_log: updatedActivityLog,
        customer_updates: updatedCustomerUpdates,
        expected_completion_date: expectedCompletionDate || meta.expected_completion_date || null,
        last_status_update_at: nowIso
      };

      // Persist to Supabase
      const { data: updatedRecord, error: updateErr } = await supabase
        .from('orders')
        .update({
          order_status: newStatus,
          updated_at: nowIso,
          metadata: updatedMetadata
        })
        .eq('id', id)
        .select()
        .single();

      // Mirror to local orders.json
      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        localOrders[idx].order_status = newStatus;
        localOrders[idx].updated_at = nowIso;
        localOrders[idx].metadata = updatedMetadata;
        writeLocalOrders(localOrders);
      }

      await logAuditEvent(id, 'order_status_updated', {
        previous_status: prevStatus,
        new_status: newStatus,
        customer_message: customerUpdateMessage
      });

      const finalOrder = updatedRecord || localOrders[idx];
      return res.status(200).json({
        success: true,
        order: normalizeOrderMetadata(finalOrder)
      });
    } catch (err) {
      console.error('[Admin Update Status Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: UPDATE MILESTONE
  // --------------------------------------------------------------------------
  if (action === 'update_milestone' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON payload' }); }
    }

    const { id, milestoneId, status, description, customerUpdate } = body || {};
    if (!id || !milestoneId || !status) {
      return res.status(400).json({ success: false, error: 'Missing milestone parameters' });
    }

    try {
      let order = null;
      const { data: sbOrder } = await supabase.from('orders').select('*').eq('id', id).single();
      if (sbOrder) order = sbOrder;
      else order = readLocalOrders().find(o => o.id === id);

      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      const meta = order.metadata || {};
      const milestones = meta.milestones || JSON.parse(JSON.stringify(DEFAULT_MILESTONES));
      const target = milestones.find(m => m.id === milestoneId);
      if (!target) {
        return res.status(400).json({ success: false, error: 'Milestone not found' });
      }

      const prevMilestoneStatus = target.status;
      target.status = status;
      if (description !== undefined) target.description = description;
      target.updated_at = new Date().toISOString();

      const nowIso = new Date().toISOString();
      const activityItem = {
        id: `act_${Date.now()}`,
        timestamp: nowIso,
        actor: 'Asnat Khan (Admin)',
        type: 'milestone_update',
        description: `Milestone "${target.name}" marked as ${status.replace('_', ' ')}`,
        milestone_id: milestoneId,
        previous_status: prevMilestoneStatus,
        new_status: status,
        scope: 'public'
      };

      const updatedActivityLog = [activityItem, ...(meta.activity_log || [])];

      let updatedCustomerUpdates = meta.customer_updates || [];
      if (customerUpdate && customerUpdate.trim()) {
        updatedCustomerUpdates = [
          {
            id: `upd_${Date.now()}`,
            timestamp: nowIso,
            status: order.order_status,
            status_label: `Milestone: ${target.name}`,
            message: customerUpdate.trim(),
            author: 'Asnat Khan'
          },
          ...updatedCustomerUpdates
        ];
      }

      const updatedMetadata = {
        ...meta,
        milestones,
        activity_log: updatedActivityLog,
        customer_updates: updatedCustomerUpdates
      };

      await supabase.from('orders').update({
        metadata: updatedMetadata,
        updated_at: nowIso
      }).eq('id', id);

      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        localOrders[idx].metadata = updatedMetadata;
        localOrders[idx].updated_at = nowIso;
        writeLocalOrders(localOrders);
      }

      await logAuditEvent(id, 'milestone_updated', { milestone: target.name, status });

      order.metadata = updatedMetadata;
      return res.status(200).json({
        success: true,
        order: normalizeOrderMetadata(order)
      });
    } catch (err) {
      console.error('[Admin Milestone Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to update milestone' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: UPDATE REQUIREMENTS
  // --------------------------------------------------------------------------
  if (action === 'update_requirements' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON payload' }); }
    }

    const { id, status, reviewerNotes, missingItems = [], clarificationRequest = '' } = body || {};
    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'Missing requirements parameters' });
    }

    try {
      let order = null;
      const { data: sbOrder } = await supabase.from('orders').select('*').eq('id', id).single();
      if (sbOrder) order = sbOrder;
      else order = readLocalOrders().find(o => o.id === id);

      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      const meta = order.metadata || {};
      const nowIso = new Date().toISOString();

      const requirementsData = {
        ...(meta.requirements_data || {}),
        status, // 'reviewed', 'confirmed', 'clarification_requested'
        reviewer_notes: reviewerNotes || '',
        missing_items: Array.isArray(missingItems) ? missingItems : [],
        clarification_request: clarificationRequest || null,
        reviewed_at: nowIso,
        confirmed_at: status === 'confirmed' ? nowIso : (meta.requirements_data?.confirmed_at || null)
      };

      const messages = meta.messages || [];
      // If clarification requested, post as customer message
      if (status === 'clarification_requested' && clarificationRequest.trim()) {
        messages.push({
          id: `msg_${Date.now()}`,
          sender: 'admin',
          sender_name: 'Asnat Khan',
          message: `Requirements Clarification Needed:\n${clarificationRequest.trim()}`,
          timestamp: nowIso,
          read: false
        });
      }

      const activityItem = {
        id: `act_${Date.now()}`,
        timestamp: nowIso,
        actor: 'Asnat Khan (Admin)',
        type: 'requirements_review',
        description: `Requirements marked as ${status.replace('_', ' ')}`,
        scope: status === 'clarification_requested' ? 'public' : 'internal'
      };

      const updatedMetadata = {
        ...meta,
        requirements_data: requirementsData,
        messages,
        activity_log: [activityItem, ...(meta.activity_log || [])]
      };

      // Also update overall status to 'awaiting_requirements' if clarification requested
      let newOrderStatus = order.order_status;
      if (status === 'clarification_requested') {
        newOrderStatus = 'awaiting_requirements';
      } else if (status === 'confirmed' && order.order_status === 'awaiting_requirements') {
        newOrderStatus = 'ready_to_start';
      }

      await supabase.from('orders').update({
        order_status: newOrderStatus,
        metadata: updatedMetadata,
        updated_at: nowIso
      }).eq('id', id);

      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        localOrders[idx].order_status = newOrderStatus;
        localOrders[idx].metadata = updatedMetadata;
        localOrders[idx].updated_at = nowIso;
        writeLocalOrders(localOrders);
      }

      await logAuditEvent(id, 'requirements_reviewed', { status, clarification_requested: !!clarificationRequest });

      order.order_status = newOrderStatus;
      order.metadata = updatedMetadata;
      return res.status(200).json({
        success: true,
        order: normalizeOrderMetadata(order)
      });
    } catch (err) {
      console.error('[Admin Requirements Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to update requirements' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: ADD INTERNAL NOTE (Private, Never visible to client)
  // --------------------------------------------------------------------------
  if (action === 'add_note' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON payload' }); }
    }

    const { id, text } = body || {};
    if (!id || !text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Note text is required' });
    }

    try {
      let order = null;
      const { data: sbOrder } = await supabase.from('orders').select('*').eq('id', id).single();
      if (sbOrder) order = sbOrder;
      else order = readLocalOrders().find(o => o.id === id);

      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      const meta = order.metadata || {};
      const nowIso = new Date().toISOString();

      const newNote = {
        id: `note_${Date.now()}`,
        author: 'Asnat Khan',
        text: text.trim(),
        created_at: nowIso,
        is_private: true
      };

      const updatedNotes = [newNote, ...(meta.internal_notes || [])];

      const activityItem = {
        id: `act_${Date.now()}`,
        timestamp: nowIso,
        actor: 'Asnat Khan (Admin)',
        type: 'internal_note_added',
        description: 'Internal private note recorded',
        scope: 'internal'
      };

      const updatedMetadata = {
        ...meta,
        internal_notes: updatedNotes,
        activity_log: [activityItem, ...(meta.activity_log || [])]
      };

      await supabase.from('orders').update({
        metadata: updatedMetadata,
        updated_at: nowIso
      }).eq('id', id);

      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        localOrders[idx].metadata = updatedMetadata;
        localOrders[idx].updated_at = nowIso;
        writeLocalOrders(localOrders);
      }

      await logAuditEvent(id, 'internal_note_added', { note_id: newNote.id });

      order.metadata = updatedMetadata;
      return res.status(200).json({
        success: true,
        order: normalizeOrderMetadata(order),
        note: newNote
      });
    } catch (err) {
      console.error('[Admin Note Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to add internal note' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: SEND MESSAGE (Customer Conversation)
  // --------------------------------------------------------------------------
  if (action === 'send_message' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON payload' }); }
    }

    const { id, message } = body || {};
    if (!id || !message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    try {
      let order = null;
      const { data: sbOrder } = await supabase.from('orders').select('*').eq('id', id).single();
      if (sbOrder) order = sbOrder;
      else order = readLocalOrders().find(o => o.id === id);

      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      const meta = order.metadata || {};
      const nowIso = new Date().toISOString();

      const newMsg = {
        id: `msg_${Date.now()}`,
        sender: 'admin',
        sender_name: 'Asnat Khan',
        message: message.trim(),
        timestamp: nowIso,
        read: false
      };

      const updatedMessages = [...(meta.messages || []), newMsg];

      const activityItem = {
        id: `act_${Date.now()}`,
        timestamp: nowIso,
        actor: 'Asnat Khan (Admin)',
        type: 'customer_message_sent',
        description: 'Direct message sent to client',
        scope: 'public'
      };

      const updatedMetadata = {
        ...meta,
        messages: updatedMessages,
        activity_log: [activityItem, ...(meta.activity_log || [])]
      };

      await supabase.from('orders').update({
        metadata: updatedMetadata,
        updated_at: nowIso
      }).eq('id', id);

      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        localOrders[idx].metadata = updatedMetadata;
        localOrders[idx].updated_at = nowIso;
        writeLocalOrders(localOrders);
      }

      await logAuditEvent(id, 'customer_message_sent', { message_id: newMsg.id });

      order.metadata = updatedMetadata;
      return res.status(200).json({
        success: true,
        order: normalizeOrderMetadata(order),
        message: newMsg
      });
    } catch (err) {
      console.error('[Admin Message Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: MANAGE FILE (Deliverables, WIP, Client files)
  // --------------------------------------------------------------------------
  if (action === 'manage_file' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON payload' }); }
    }

    const { id, fileAction = 'add', fileId, fileName, fileUrl, fileCategory, fileSize, fileDescription } = body || {};
    if (!id) return res.status(400).json({ success: false, error: 'Order identifier required' });

    try {
      let order = null;
      const { data: sbOrder } = await supabase.from('orders').select('*').eq('id', id).single();
      if (sbOrder) order = sbOrder;
      else order = readLocalOrders().find(o => o.id === id);

      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

      const meta = order.metadata || {};
      let files = meta.files || [];
      const nowIso = new Date().toISOString();

      if (fileAction === 'add') {
        if (!fileName || !fileUrl) {
          return res.status(400).json({ success: false, error: 'File name and URL are required' });
        }

        const newFile = {
          id: `file_${Date.now()}`,
          name: fileName.trim(),
          url: fileUrl.trim(),
          category: fileCategory || 'deliverable', // 'customer_provided', 'wip', 'deliverable'
          size: fileSize || 0,
          description: fileDescription || '',
          uploaded_by: 'Asnat Khan (Admin)',
          uploaded_at: nowIso
        };
        files = [newFile, ...files];

        const activityItem = {
          id: `act_${Date.now()}`,
          timestamp: nowIso,
          actor: 'Asnat Khan (Admin)',
          type: 'file_uploaded',
          description: `Deliverable/File "${fileName}" uploaded (${fileCategory})`,
          scope: fileCategory === 'wip' ? 'internal' : 'public'
        };

        meta.activity_log = [activityItem, ...(meta.activity_log || [])];
      } else if (fileAction === 'remove') {
        files = files.filter(f => f.id !== fileId);
      }

      meta.files = files;

      await supabase.from('orders').update({
        metadata: meta,
        updated_at: nowIso
      }).eq('id', id);

      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        localOrders[idx].metadata = meta;
        localOrders[idx].updated_at = nowIso;
        writeLocalOrders(localOrders);
      }

      await logAuditEvent(id, `file_${fileAction}`, { fileName, fileCategory });

      order.metadata = meta;
      return res.status(200).json({
        success: true,
        order: normalizeOrderMetadata(order)
      });
    } catch (err) {
      console.error('[Admin Manage File Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to manage file record' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: CUSTOMERS LIST & DETAIL
  // --------------------------------------------------------------------------
  if (action === 'customers') {
    try {
      let orders = [];
      const { data: sbOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (sbOrders && sbOrders.length > 0) orders = sbOrders;
      else orders = readLocalOrders();

      const customerMap = new Map();

      orders.forEach(o => {
        const email = (o.customer_email || '').trim().toLowerCase();
        if (!email) return;

        if (!customerMap.has(email)) {
          customerMap.set(email, {
            email,
            name: o.customer_name || 'Valued Client',
            business: o.customer_business || '',
            country: o.customer_country || '',
            order_count: 0,
            total_spent: 0,
            latest_order_date: o.created_at,
            orders: []
          });
        }

        const entry = customerMap.get(email);
        entry.order_count += 1;
        if (o.payment_status === 'paid') {
          entry.total_spent += Number(o.total_amount || 0);
        }
        if (new Date(o.created_at) > new Date(entry.latest_order_date)) {
          entry.latest_order_date = o.created_at;
          if (o.customer_name && o.customer_name !== 'Guest Customer') {
            entry.name = o.customer_name;
          }
        }
        entry.orders.push({
          id: o.id,
          order_ref: o.order_ref,
          package_name: o.package_name,
          total_amount: o.total_amount,
          payment_status: o.payment_status,
          order_status: o.order_status,
          created_at: o.created_at
        });
      });

      const customerList = Array.from(customerMap.values()).sort(
        (a, b) => new Date(b.latest_order_date) - new Date(a.latest_order_date)
      );

      return res.status(200).json({
        success: true,
        customers: customerList
      });
    } catch (err) {
      console.error('[Admin Customers Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve customers' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: NOTIFICATIONS (Real backend events)
  // --------------------------------------------------------------------------
  if (action === 'notifications') {
    try {
      let orders = [];
      const { data: sbOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (sbOrders && sbOrders.length > 0) orders = sbOrders;
      else orders = readLocalOrders();

      const notifications = [];

      orders.forEach(o => {
        const meta = o.metadata || {};

        // 1. Paid order waiting for initial kickoff
        if (o.payment_status === 'paid' && ['confirmed', 'order_received', 'pending'].includes(o.order_status)) {
          notifications.push({
            id: `notif_paid_${o.id}`,
            order_id: o.id,
            order_ref: o.order_ref,
            type: 'paid_order',
            title: 'New Paid Order Ready for Kickoff',
            message: `${o.customer_name || 'Client'} purchased the ${o.package_name} package ($${Number(o.total_amount).toFixed(2)} USD).`,
            timestamp: o.updated_at || o.created_at,
            read: false,
            link: `/admin/orders/${o.id}`
          });
        }

        // 2. Unread messages from customer
        if (meta.messages && meta.messages.length > 0) {
          const unreadCustomerMsgs = meta.messages.filter(m => m.sender === 'customer' && !m.read);
          unreadCustomerMsgs.forEach(m => {
            notifications.push({
              id: `notif_msg_${m.id}`,
              order_id: o.id,
              order_ref: o.order_ref,
              type: 'customer_message',
              title: `New Message from ${o.customer_name}`,
              message: m.message.slice(0, 100),
              timestamp: m.timestamp,
              read: false,
              link: `/admin/orders/${o.id}/messages`
            });
          });
        }

        // 3. Submitted requirements
        if (meta.requirements_data && meta.requirements_data.status === 'submitted') {
          notifications.push({
            id: `notif_req_${o.id}`,
            order_id: o.id,
            order_ref: o.order_ref,
            type: 'requirements_submitted',
            title: `Requirements Submitted: ${o.order_ref}`,
            message: `${o.customer_name} submitted comprehensive project requirements.`,
            timestamp: meta.requirements_data.submitted_at || o.updated_at,
            read: false,
            link: `/admin/orders/${o.id}/requirements`
          });
        }
      });

      // Sort notifications by timestamp desc
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return res.status(200).json({
        success: true,
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      });
    } catch (err) {
      console.error('[Admin Notifications Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: SETTINGS & SYSTEM HEALTH
  // --------------------------------------------------------------------------
  if (action === 'settings') {
    let supabaseStatus = 'disconnected';
    let supabaseOrderCount = 0;
    try {
      const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      if (!error) {
        supabaseStatus = 'connected';
        supabaseOrderCount = count || 0;
      }
    } catch {
      supabaseStatus = 'offline_fallback';
    }

    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
    const emailConfigured = false; // Phase 2 integration
    const storageConfigured = true; // Supabase / Cloud storage integration ready

    return res.status(200).json({
      success: true,
      admin: adminUser,
      integrations: {
        database: {
          provider: 'Supabase PostgreSQL',
          status: supabaseStatus,
          project_url: SUPABASE_URL,
          order_records_count: supabaseOrderCount
        },
        payments: {
          provider: 'Stripe',
          status: stripeConfigured ? 'live_configured' : 'sandbox_test_mode_ready',
          note: stripeConfigured ? 'Stripe secret key loaded' : 'Test mode active for simulated payments'
        },
        storage: {
          provider: 'Secure Object Storage',
          status: storageConfigured ? 'ready' : 'pending_configuration',
          note: 'Supports deliverable file tracking, metadata verification, and download delivery'
        },
        email: {
          provider: 'Transactional Mailer (Resend / SendGrid)',
          status: emailConfigured ? 'active' : 'pending_configuration',
          note: 'In-app real-time customer updates active. External SMTP email delivery pending provider key.'
        }
      }
    });
  }

  return res.status(400).json({ success: false, error: `Unrecognized admin action: ${action}` });
}

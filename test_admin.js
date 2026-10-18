/**
 * Asnat Khan Studio — Admin Panel & Order Management Test Suite
 * Automated end-to-end verification of administrator security, order lifecycle,
 * milestones, customer privacy protections, messaging, and data persistence.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import adminHandler, { PROJECT_STAGES, DEFAULT_MILESTONES } from './api/admin.js';
import orderHandler from './api/order.js';

// Helper: Mock Express-style request / response
function invokeHandler(handlerFn, req) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let headers = {};
    let responseData = null;

    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; resolve({ statusCode, headers, data }); },
          end: () => { resolve({ statusCode, headers, data: responseData }); }
        };
      }
    };

    handlerFn(req, res).catch(err => {
      resolve({ statusCode: 500, headers, data: { success: false, error: err.message } });
    });
  });
}

async function runAdminTests() {
  console.log('======================================================');
  console.log('  ASNAT KHAN — ADMIN WORKSPACE AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: STRICT CODEBASE COLOR COMPLIANCE (ZERO #D4AF37)
  // --------------------------------------------------------------------------
  console.log('--- 1. Color Compliance Check (Strict Forbidden Gold Rule) ---');
  function scanFilesForColor(dir) {
    const forbidden = ['D4', 'AF37'].join('');
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (['node_modules', '.git', '.vercel'].includes(ent.name)) continue;
      if (ent.name === 'test_admin.js') continue; // Skip test file itself
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanFilesForColor(fullPath);
      } else if (/\.(html|css|js|json|md)$/i.test(ent.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(!content.toUpperCase().includes(forbidden), `Found forbidden color #${forbidden} in ${fullPath}!`);
      }
    }
  }
  scanFilesForColor(process.cwd());
  console.log('✓ Zero occurrences of #D4AF37 verified across entire repository.');

  // --------------------------------------------------------------------------
  // TEST 2: SECURITY & ACCESS CONTROL
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Administrator Access Control & Authentication ---');

  // 2.1 Unauthenticated overview request
  const unauthRes = await invokeHandler(adminHandler, {
    method: 'GET',
    query: { action: 'overview' },
    headers: {}
  });
  assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated request must return HTTP 401');
  assert.strictEqual(unauthRes.data.success, false);
  console.log('✓ Unauthenticated request rejected with HTTP 401');

  // 2.2 Invalid credentials
  const badLogin = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'login' },
    body: { email: 'asnat@asnatkhan.com', password: 'WrongPassword123' },
    headers: {}
  });
  assert.strictEqual(badLogin.statusCode, 401, 'Invalid password must return HTTP 401');
  console.log('✓ Invalid administrator password rejected');

  // 2.3 Valid administrator authentication
  const validLogin = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'login' },
    body: { email: 'asnat@asnatkhan.com', password: 'AsnatStudio2026!' },
    headers: {}
  });
  assert.strictEqual(validLogin.statusCode, 200, 'Valid login must return HTTP 200');
  assert.ok(validLogin.data.success);
  assert.ok(validLogin.data.token, 'Must return signed administrator session token');
  const adminToken = validLogin.data.token;
  console.log('✓ Administrator session token issued successfully');

  // 2.4 Verify session endpoint
  const sessionCheck = await invokeHandler(adminHandler, {
    method: 'GET',
    query: { action: 'verify_session' },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(sessionCheck.statusCode, 200);
  assert.strictEqual(sessionCheck.data.admin.email, 'asnat@asnatkhan.com');
  console.log('✓ Session verification verified');

  // --------------------------------------------------------------------------
  // TEST 3: EXECUTIVE OVERVIEW & REAL METRICS
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Executive Overview & Real Metrics ---');
  const overviewRes = await invokeHandler(adminHandler, {
    method: 'GET',
    query: { action: 'overview' },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(overviewRes.statusCode, 200);
  assert.ok(overviewRes.data.metrics);
  const m = overviewRes.data.metrics;
  assert.ok(typeof m.totalOrders === 'number' && m.totalOrders > 0, `Total orders must be > 0 (found ${m.totalOrders})`);
  assert.ok(typeof m.paidOrders === 'number', 'Paid orders count must exist');
  assert.ok(typeof m.inProgressOrders === 'number', 'In progress count must exist');
  assert.ok(Array.isArray(overviewRes.data.recentOrders), 'Recent orders must be an array');
  console.log(`✓ Real metrics computed: ${m.totalOrders} total orders, ${m.paidOrders} paid, ${m.awaitingRequirements} awaiting requirements`);

  // --------------------------------------------------------------------------
  // TEST 4: ORDERS REGISTRY, SEARCH & FILTERING
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Orders Registry, Search & Filtering ---');
  const ordersListRes = await invokeHandler(adminHandler, {
    method: 'GET',
    query: { action: 'orders', limit: '5', page: '1' },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(ordersListRes.statusCode, 200);
  assert.ok(ordersListRes.data.orders.length > 0);
  assert.ok(ordersListRes.data.pagination);
  const targetOrder = ordersListRes.data.orders[0];
  console.log(`✓ Orders listing verified (${ordersListRes.data.orders.length} orders on page 1)`);

  // Search by Order Reference
  const searchRes = await invokeHandler(adminHandler, {
    method: 'GET',
    query: { action: 'orders', search: targetOrder.order_ref },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(searchRes.statusCode, 200);
  assert.ok(searchRes.data.orders.some(o => o.id === targetOrder.id || o.order_ref === targetOrder.order_ref));
  console.log(`✓ Search by order reference "${targetOrder.order_ref}" passed`);

  // --------------------------------------------------------------------------
  // TEST 5: ORDER LIFECYCLE & STATUS UPDATE
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Order Lifecycle & Status Management ---');
  const updateStatusRes = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'update_status' },
    body: {
      id: targetOrder.id,
      newStatus: 'in_progress',
      customerUpdateMessage: 'Design wireframes approved. Starting frontend implementation.',
      expectedCompletionDate: '2026-10-30'
    },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(updateStatusRes.statusCode, 200);
  assert.strictEqual(updateStatusRes.data.order.order_status, 'in_progress');
  assert.ok(updateStatusRes.data.order.customer_updates.length > 0);
  assert.strictEqual(updateStatusRes.data.order.customer_updates[0].message, 'Design wireframes approved. Starting frontend implementation.');
  console.log('✓ Project status updated to "in_progress" with customer-visible update message');

  // --------------------------------------------------------------------------
  // TEST 6: MILESTONE UPDATES
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Production Milestone Progress ---');
  const milestoneRes = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'update_milestone' },
    body: {
      id: targetOrder.id,
      milestoneId: 'requirements',
      status: 'completed',
      description: 'Customer project brief and scope confirmed',
      customerUpdate: 'Requirements confirmed with client.'
    },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(milestoneRes.statusCode, 200);
  const updatedM = milestoneRes.data.order.milestones.find(m => m.id === 'requirements');
  assert.strictEqual(updatedM.status, 'completed');
  console.log('✓ Milestone "Requirements Confirmed" marked as completed');

  // --------------------------------------------------------------------------
  // TEST 7: CUSTOMER PRIVACY & NON-LEAKAGE OF INTERNAL NOTES
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Customer Privacy & Internal Notes Protection ---');
  const secretText = `CONFIDENTIAL_AUDIT_KEY_${Date.now()}`;
  const noteRes = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'add_note' },
    body: {
      id: targetOrder.id,
      text: `Client requested specific brand styling. Internal observation: ${secretText}`
    },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(noteRes.statusCode, 200);
  console.log('✓ Private internal note added by administrator');

  // Query as Customer via /api/order
  const customerViewRes = await invokeHandler(orderHandler, {
    method: 'GET',
    query: { id: targetOrder.id, token: targetOrder.access_token },
    headers: {}
  });
  assert.strictEqual(customerViewRes.statusCode, 200);
  const custOrder = customerViewRes.data.order;
  
  // Verify internal_notes is strictly absent
  assert.strictEqual(custOrder.metadata?.internal_notes, undefined, 'Internal notes MUST NOT be returned to customer!');
  const fullJson = JSON.stringify(custOrder);
  assert.ok(!fullJson.includes(secretText), 'Private internal note text leaked into customer API response!');
  console.log('✓ Customer order response verified: zero private internal notes exposed to client');

  // --------------------------------------------------------------------------
  // TEST 8: BIDIRECTIONAL MESSAGING & REQUIREMENTS CLARIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Customer Communication & Clarification Loop ---');
  
  // Admin requests clarification
  const clarifyRes = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'update_requirements' },
    body: {
      id: targetOrder.id,
      status: 'clarification_requested',
      clarificationRequest: 'Please provide high-resolution SVG logo and preferred color palette.'
    },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(clarifyRes.statusCode, 200);
  console.log('✓ Administrator requested requirements clarification');

  // Customer replies to clarification
  const custReplyRes = await invokeHandler(orderHandler, {
    method: 'PUT',
    body: {
      id: targetOrder.id,
      token: targetOrder.access_token,
      action: 'clarification_response',
      clarificationResponse: 'Here is our brand guide link: https://brand.example.com/assets.svg'
    },
    headers: {}
  });
  assert.strictEqual(custReplyRes.statusCode, 200);
  console.log('✓ Customer submitted requirements clarification');

  // Customer sends direct project message
  const custMsgRes = await invokeHandler(orderHandler, {
    method: 'PUT',
    body: {
      id: targetOrder.id,
      token: targetOrder.access_token,
      action: 'customer_message',
      customerMessage: 'Looking forward to reviewing the wireframes!'
    },
    headers: {}
  });
  assert.strictEqual(custMsgRes.statusCode, 200);
  console.log('✓ Customer sent project message');

  // Admin replies to customer message
  const adminMsgRes = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'send_message' },
    body: {
      id: targetOrder.id,
      message: 'Wireframes are being finalized today!'
    },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminMsgRes.statusCode, 200);
  console.log('✓ Administrator replied to customer conversation');

  // --------------------------------------------------------------------------
  // TEST 9: DELIVERABLES MANAGEMENT
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Deliverables & File Attachments ---');
  const fileRes = await invokeHandler(adminHandler, {
    method: 'POST',
    query: { action: 'manage_file' },
    body: {
      id: targetOrder.id,
      fileAction: 'add',
      fileName: 'Asnat_Khan_Final_Website_v1.zip',
      fileUrl: 'https://downloads.asnatkhan.internal/deliverables/v1.zip',
      fileCategory: 'deliverable',
      fileSize: 18450000,
      fileDescription: 'Production frontend build and documentation'
    },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(fileRes.statusCode, 200);
  assert.ok(fileRes.data.order.files.some(f => f.name === 'Asnat_Khan_Final_Website_v1.zip'));
  console.log('✓ Final website deliverable attached and verified in database');

  // --------------------------------------------------------------------------
  // TEST 10: CUSTOMERS DIRECTORY & NOTIFICATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- 10. Customers Directory & Notifications ---');
  const customersRes = await invokeHandler(adminHandler, {
    method: 'GET',
    query: { action: 'customers' },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(customersRes.statusCode, 200);
  assert.ok(Array.isArray(customersRes.data.customers));
  console.log(`✓ Customer directory aggregated: ${customersRes.data.customers.length} unique client accounts`);

  const notifsRes = await invokeHandler(adminHandler, {
    method: 'GET',
    query: { action: 'notifications' },
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(notifsRes.statusCode, 200);
  assert.ok(Array.isArray(notifsRes.data.notifications));
  console.log(`✓ Notification center verified: ${notifsRes.data.notifications.length} actionable notifications`);

  console.log('\n======================================================');
  console.log('  ALL 10 ADMIN SUITE VERIFICATIONS PASSED (100%)');
  console.log('======================================================\n');
}

runAdminTests().catch(err => {
  console.error('\n❌ Admin test suite failure:', err);
  process.exit(1);
});

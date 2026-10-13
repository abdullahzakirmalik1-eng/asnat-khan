/**
 * Supabase Client Configuration & Helpers
 * Project ID: gehsytzcfikikzkuzstc
 * Project Name: Portfolio
 */

export const SUPABASE_PROJECT_ID = 'gehsytzcfikikzkuzstc';
export const SUPABASE_URL = 'https://gehsytzcfikikzkuzstc.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ihaNzfNzlUusL1Typ4odvw_NmWjnhxT';

/**
 * Direct REST client for submitting quote inquiries directly to Supabase
 * @param {Object} payload
 * @returns {Promise<boolean>}
 */
export async function submitQuoteDirectly(payload) {
  const endpoint = `${SUPABASE_URL}/rest/v1/quote_inquiries`;
  const record = {
    name: payload.name || '',
    email: payload.email || '',
    business: payload.business || '',
    website: payload.website || '',
    project_type: payload.projectType || 'Not specified',
    services: Array.isArray(payload.services) ? payload.services : [payload.services || ''],
    description: payload.description || '',
    package: payload.package || 'Not specified',
    budget: payload.budget || 'Not specified',
    timeline: payload.timeline || 'Not specified',
    submitted_at: payload.submittedAt || new Date().toISOString()
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(record)
    });
    return res.ok;
  } catch (err) {
    console.warn('[Supabase Direct] Failed to submit directly:', err);
    return false;
  }
}

// Global browser script exposure
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = {
    projectId: SUPABASE_PROJECT_ID,
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    publishableKey: SUPABASE_PUBLISHABLE_KEY
  };
  window.submitQuoteDirectly = submitQuoteDirectly;
}

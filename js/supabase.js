/**
 * Supabase Client Configuration & Initialization
 * Connected to project: Portfolio (gehsytzcfikikzkuzstc)
 */

export const SUPABASE_URL = 'https://gehsytzcfikikzkuzstc.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ihaNzfNzlUusL1Typ4odvw_NmWjnhxT';

// Helper to create client whether in Node.js, modern bundler, or browser script
export function getSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
}

// Expose on global window object for vanilla browser script usage
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };
  if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

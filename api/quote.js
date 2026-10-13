import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers for cross-origin flexibility
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed. Use POST.`
    });
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON payload'
        });
      }
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing inquiry payload'
      });
    }

    const {
      name = '',
      email = '',
      business = '',
      website = '',
      projectType = 'Not specified',
      services = [],
      description = '',
      package: selectedPackage = 'Not specified',
      budget = 'Not specified',
      timeline = 'Not specified',
      submittedAt = new Date().toISOString()
    } = payload;

    const inquiryRecord = {
      name,
      email,
      business,
      website,
      project_type: projectType,
      services: Array.isArray(services) ? services : [services],
      description,
      package: selectedPackage,
      budget,
      timeline,
      received_at: new Date().toISOString(),
      submitted_at: submittedAt
    };

    console.log('[API /api/quote] Received quote inquiry:', JSON.stringify(inquiryRecord, null, 2));

    // Supabase integration (optional / fallback-friendly)
    const supabaseUrl = process.env.SUPABASE_URL || 'https://gehsytzcfikikzkuzstc.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      'sb_publishable_ihaNzfNzlUusL1Typ4odvw_NmWjnhxT';

    let dbSaved = false;
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error: dbError } = await supabase
          .from('quote_inquiries')
          .insert([inquiryRecord]);

        if (dbError) {
          console.warn('[API /api/quote] Supabase table insert warning (check table schema):', dbError.message);
        } else {
          dbSaved = true;
          console.log('[API /api/quote] Successfully recorded inquiry in Supabase table.');
        }
      } catch (dbErr) {
        console.warn('[API /api/quote] Supabase client warning:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Inquiry received successfully',
      data: {
        name,
        email,
        dbSaved,
        receivedAt: inquiryRecord.received_at
      }
    });
  } catch (error) {
    console.error('[API /api/quote] Internal Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing your quote request.'
    });
  }
}

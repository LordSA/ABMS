const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseKey.includes('your_')
);

if (!isConfigured) {
  console.warn('ℹ️ Supabase cloud synchronization is disabled (credentials missing or placeholder). ABMS is running in local SQLite mode.');
}

const noopBuilder = () => {
  const b = {
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: [], error: null }),
    update: () => b,
    delete: () => Promise.resolve({ data: [], error: null }),
    eq: () => b,
    limit: () => b,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null })
  };
  return b;
};

const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : {
      from: () => noopBuilder()
    };

module.exports = supabase;

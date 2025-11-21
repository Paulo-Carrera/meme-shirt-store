// import dotenv from 'dotenv';
// dotenv.config(); // ✅ Ensures env vars are loaded before use

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey);

export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey);
}


import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceRole) {
  // note: don't throw here to allow local static analysis, but server routes should ensure envs exist
}

export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false }
});

export default supabaseAdmin;

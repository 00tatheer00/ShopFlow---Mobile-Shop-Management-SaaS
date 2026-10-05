import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only privileged Supabase client for administrative tasks
 * such as Super Admin user provisioning and system maintenance.
 * Never import or use this on the client side.
 */
export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

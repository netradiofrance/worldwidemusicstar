import { createClient as createSbClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * Bypasses RLS — only ever import this from server-only files (route
 * handlers, server components, server actions, cron jobs).
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars',
    );
  }
  return createSbClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Anon client for the browser. Reads only — RLS enforces this.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSbClient<Database>(url, key);
}

/**
 * Bootstrap script — creates the first admin user.
 *
 * Run after running 001_init.sql + 002_seed.sql against your Supabase project.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@worldwidemusicstar.com \
 *   ADMIN_PASSWORD='your-strong-password' \
 *   npm run seed
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD required');

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const password_hash = await bcrypt.hash(password, 12);

  const { error } = await sb.from('admin_users').upsert(
    { email: email.toLowerCase(), password_hash, role: 'admin' },
    { onConflict: 'email' }
  );
  if (error) throw error;

  console.log(`✅ Admin user ready: ${email}`);
}

main().catch(e => { console.error(e); process.exit(1); });

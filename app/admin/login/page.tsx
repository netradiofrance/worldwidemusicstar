'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = '/admin/dashboard';
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Login failed');
        setBusy(false);
      }
    } catch {
      setError('Network error');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-ink-900 border border-white/10 p-8">
        <Image src="/logo.png" alt="WorldWide Music Star" width={220} height={52} className="h-9 w-auto mx-auto mb-6" />
        <h1 className="text-center font-display uppercase text-3xl tracking-tightest mb-2">Admin Login</h1>
        <p className="text-center text-ink-300 text-sm mb-6">WorldWide Music Star backoffice</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg bg-ink-700 border border-white/10 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg bg-ink-700 border border-white/10 px-4 py-3 text-white"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}

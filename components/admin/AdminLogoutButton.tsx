'use client';

import { LogOut } from 'lucide-react';

export function AdminLogoutButton() {
  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }
  return (
    <button
      type="button"
      onClick={logout}
      className="w-full inline-flex items-center gap-2 text-sm text-ink-200 hover:text-white"
    >
      <LogOut size={14} /> Logout
    </button>
  );
}

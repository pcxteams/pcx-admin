'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

const inputClass =
  'w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-zinc-50 disabled:text-zinc-400 transition-colors';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setPending(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        setError(error.message ?? 'Unable to sign in. Please try again.');
        setPending(false);
        return;
      }
    } catch {
      // A network-layer failure rejects the promise (vs. an auth error, which
      // comes back in `error`). Without this, `pending` stays true and the
      // button is stuck on "Signing in…" with no feedback.
      setError('Unable to reach the server. Please try again.');
      setPending(false);
      return;
    }

    // Session cookie is set; land on the app home. refresh() re-runs the
    // server components (guarded layout) with the new session.
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="size-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-tight">PCx</span>
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900 leading-none">PCx Platform</p>
            <p className="text-xs text-zinc-500 mt-0.5">Admin Panel</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Sign in</h1>
          <p className="text-sm text-zinc-500 mb-6">Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={pending}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={pending}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

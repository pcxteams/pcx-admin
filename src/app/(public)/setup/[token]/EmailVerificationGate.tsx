'use client';

import { useState } from 'react';
import WorkspaceSetupForm from './WorkspaceSetupForm';

interface VerifiedContext {
  verified: true;
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'office' | 'team';
  parentWorkspaceName: string | null;
  primaryContactFirstName: string;
  primaryContactLastName: string;
  primaryContactEmail: string;
  expiresAt: string;
}

interface UnverifiedContext {
  verified: false;
  workspaceName: string;
}

type SetupContext = VerifiedContext | UnverifiedContext;

const LABEL = 'text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5';
const INPUT = 'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009689]/30 focus:border-transparent w-full';

/**
 * Sits in front of the Form 2 setup form. Each recipient's link is unique,
 * but nothing stops a leaked/forwarded link from being opened by someone
 * else — this gate requires confirming the email the link was issued to
 * before any workspace/primary-contact detail (or the form itself) renders.
 * Verification is persisted server-side on the token, so re-loading the same
 * link after verifying doesn't ask again.
 */
export default function EmailVerificationGate({
  token,
  initialContext,
}: {
  token: string;
  initialContext: SetupContext;
}) {
  const [context, setContext] = useState<SetupContext>(initialContext);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (context.verified) {
    return <WorkspaceSetupForm prefill={context} token={token} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace-setup/${token}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 410) {
        setError('This setup link has already been used or has expired. Please contact your workspace administrator for assistance.');
        return;
      }
      if (!res.ok) {
        setError("That email doesn't match this invitation. Please double-check and try again.");
        return;
      }
      const data = (await res.json()) as VerifiedContext;
      setContext(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full px-8 py-10">
        <h1 className="text-lg font-semibold text-gray-900 mb-1 text-center">Confirm your email</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          This invitation to help set up <span className="font-medium text-gray-700">{context.workspaceName}</span> was sent to a specific
          email address. Enter it below to continue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Email Address</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={INPUT}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-[#009689] disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

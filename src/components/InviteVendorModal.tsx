'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ProfileVendor } from './VendorsSection';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const LABEL_CLASS = 'block text-xs font-medium text-gray-700 mb-1';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Invite Vendor — Company Name + Email only (KAN-99). Creates one Pending
 * Vendor and immediately sends the Preferred Vendor Submission Form email;
 * there is no Copy Form Link action for this flow.
 */
export default function InviteVendorModal({
  workspaceId,
  onClose,
  onInvited,
}: {
  workspaceId: string;
  onClose: () => void;
  onInvited: (vendor: ProfileVendor) => void;
}) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit() {
    if (!companyName.trim()) return setError('Vendor Company Name is required.');
    if (!isValidEmail(email)) return setError('A valid email is required.');

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/vendors`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), email: email.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      const vendor = (await res.json()) as ProfileVendor;

      const sendRes = await fetch(`/api/workspaces/${workspaceId}/vendors/${vendor.id}/send`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!sendRes.ok) {
        setError('Vendor created, but the invitation email failed to send. Use "Send Form by Email" to retry.');
      }

      onInvited(vendor);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[440px] rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Invite Vendor</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Sends the Preferred Vendor Submission Form by email.
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL_CLASS}>
              Vendor Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Title Co."
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {error && <p className="flex-1 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !companyName.trim() || !email.trim()}
            className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

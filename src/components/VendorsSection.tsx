'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Plus, Trash2 } from 'lucide-react';
import InviteVendorModal from './InviteVendorModal';

const BRAND = '#009689';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';

export interface ProfileVendor {
  id: string;
  companyName: string;
  status: 'pending' | 'active';
  inviteEmail: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
}

function StatusBadge({ status }: { status: ProfileVendor['status'] }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
      }`}
    >
      {status}
    </span>
  );
}

/**
 * Workspace Profile → Vendors, shared by the PCx Admin and workspace-facing
 * profiles (Office Workspaces only — Vendor invitation is scoped to the
 * Office level per KAN-99). Read-only table when `!canManage`; adds Invite /
 * Send Form by Email / Delete when `canManage`. Pending Vendors stay visible
 * here for management but never appear in Agent Office until Active.
 */
export default function VendorsSection({
  workspaceId,
  initialVendors,
  canManage,
}: {
  workspaceId: string;
  initialVendors: ProfileVendor[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [showInvite, setShowInvite] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  async function handleSend(vendorId: string) {
    setPendingActionId(vendorId);
    setError(null);
    setSentId(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/vendors/${vendorId}/send`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Failed to send the form email. Please try again.');
        return;
      }
      setSentId(vendorId);
      setTimeout(() => setSentId(null), 3000);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleDelete(vendorId: string) {
    setPendingActionId(vendorId);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/vendors/${vendorId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Failed to delete the Vendor. Please try again.');
        return;
      }
      setVendors((prev) => prev.filter((v) => v.id !== vendorId));
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setPendingActionId(null);
    }
  }

  function handleInvited(vendor: ProfileVendor) {
    setVendors((prev) => [vendor, ...prev]);
    setShowInvite(false);
    router.refresh();
  }

  return (
    <div className={SECTION}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <p className={SECTION_TITLE}>Vendors</p>
          <p className="text-xs text-gray-400">
            {vendors.length} vendor{vendors.length === 1 ? '' : 's'}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors shrink-0"
            style={{ backgroundColor: BRAND }}
          >
            <Plus size={14} />
            Invite Vendor
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className="mt-5">
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {['Company Name', 'Contact', 'Email', 'Status', ...(canManage ? ['Actions'] : [])].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 5 : 4}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No vendors yet. Use Invite Vendor to request vendor profile information.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const contactName = [v.contactFirstName, v.contactLastName].filter(Boolean).join(' ');
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{v.companyName}</td>
                      <td className="px-4 py-3 text-gray-600">{contactName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{v.contactEmail || v.inviteEmail}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSend(v.id)}
                              disabled={pendingActionId === v.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            >
                              <Mail size={12} />
                              {sentId === v.id ? 'Sent!' : 'Send Form by Email'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id)}
                              disabled={pendingActionId === v.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <InviteVendorModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
          onInvited={handleInvited}
        />
      )}
    </div>
  );
}

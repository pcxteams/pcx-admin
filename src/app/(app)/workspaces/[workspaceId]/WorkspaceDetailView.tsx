'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Users, AlertTriangle, X, ExternalLink, ChevronRight,
} from 'lucide-react';
import type { WorkspaceDetail } from './page';

const BRAND = '#009689';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6 mb-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';
const SECTION_SUB = 'text-xs text-gray-400 mb-5';
const LABEL = 'text-xs font-medium text-gray-400 uppercase tracking-wider mb-1';
const VALUE = 'text-sm text-gray-900';
const FIELD = 'flex flex-col';

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function StatusBadge({ status, billingStatus }: { status: string; billingStatus: string | null }) {
  if (billingStatus === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        Suspended
      </span>
    );
  }
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-600',
    archived: 'bg-red-50 text-red-500',
    setup_pending: 'bg-gray-100 text-gray-500',
    setup_sent: 'bg-blue-50 text-blue-600',
    setup_viewed: 'bg-purple-50 text-purple-600',
    setup_submitted: 'bg-amber-50 text-amber-600',
  };
  const label = status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: 'office' | 'team' }) {
  const Icon = type === 'office' ? Building2 : Users;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <Icon size={11} />
      {type === 'office' ? 'Office' : 'Team'}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-sm text-gray-400">—</span>;
  const cls = plan === 'pro' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {plan}
    </span>
  );
}

function ColorSwatch({ color }: { color?: string }) {
  if (!color) return <span className="text-sm text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded border border-gray-200 shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm font-mono text-gray-700">{color}</span>
    </div>
  );
}

export default function WorkspaceDetailView({ data }: { data: WorkspaceDetail }) {
  const router = useRouter();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuspended = data.billing.billingStatus === 'suspended';

  async function doAction(path: string, method = 'PATCH') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${data.id}/${path}`, {
        method,
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return false;
      }
      return true;
    } catch {
      setError('Network error. Please check your connection and try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSuspend() {
    const ok = await doAction(isSuspended ? 'unsuspend' : 'suspend');
    if (ok) { setSuspendOpen(false); router.refresh(); }
  }

  async function handleArchive() {
    const ok = await doAction('archive');
    if (ok) { setArchiveOpen(false); router.refresh(); }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${data.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      router.push('/workspaces');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const addLinks = data.settingsConfig?.additional_links ?? [];

  return (
    <>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">{data.name}</h1>
            <TypeBadge type={data.type} />
            <StatusBadge status={data.status} billingStatus={data.billing.billingStatus} />
          </div>
          {data.clientFacingName && data.clientFacingName !== data.name && (
            <p className="text-sm text-gray-400">{data.clientFacingName}</p>
          )}
        </div>
        <Link
          href={`/workspaces/${data.id}/office-page`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
        >
          Office Page
          <ChevronRight size={13} />
        </Link>
      </div>

      {/* Workspace Information */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Workspace Information</p>
        <p className={SECTION_SUB}>Core workspace details and configuration.</p>
        <div className="grid grid-cols-3 gap-x-12 gap-y-6">
          <div className={FIELD}>
            <p className={LABEL}>Company Name (Client Facing Brand)</p>
            <p className={VALUE}>{data.clientFacingName || <span className="text-gray-400">—</span>}</p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Workspace Name (Internal)</p>
            <p className={VALUE}>{data.name}</p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Date Created</p>
            <p className={VALUE}>{formatDate(data.createdAt)}</p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Workspace Type</p>
            <div><TypeBadge type={data.type} /></div>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Workspace Status</p>
            <div><StatusBadge status={data.status} billingStatus={data.billing.billingStatus} /></div>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Time Zone</p>
            <p className={VALUE}>{data.timeZone || <span className="text-gray-400">—</span>}</p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Physical Address</p>
            <p className={VALUE}>{data.brandingConfig?.address || <span className="text-gray-400">—</span>}</p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Website</p>
            {data.brandingConfig?.website ? (
              <a
                href={data.brandingConfig.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-1 hover:underline"
                style={{ color: BRAND }}
              >
                {data.brandingConfig.website}
                <ExternalLink size={11} />
              </a>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Subscription</p>
        <p className={SECTION_SUB}>Billing plan and seat allocation.</p>
        <div className="grid grid-cols-4 gap-x-12 gap-y-6">
          <div className={FIELD}>
            <p className={LABEL}>Plan</p>
            <div><PlanBadge plan={data.billing.subscriptionPlan} /></div>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Users</p>
            <p className={VALUE}>
              {data.memberCount}
              {data.billing.seatLimit ? ` / ${data.billing.seatLimit} seats` : ''}
            </p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Monthly Amount</p>
            <p className={VALUE}>
              {data.billing.subscriptionAmount > 0
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.billing.subscriptionAmount) + '/mo'
                : <span className="text-gray-400">—</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Reporting Relationship */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Reporting Relationship</p>
        <p className={SECTION_SUB}>The workspace this one reports up to.</p>
        {data.reportsTo ? (
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-semibold shrink-0"
              style={{ backgroundColor: BRAND }}
            >
              {initials(data.reportsTo.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{data.reportsTo.name}</p>
              <p className="text-xs text-gray-400 capitalize">{data.reportsTo.type}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No reporting relationship assigned.</p>
        )}
      </div>

      {/* Workspace Leaders */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Workspace Leaders</p>
        <p className={SECTION_SUB}>Leaders currently assigned to this Workspace.</p>
        {data.leaders.length === 0 ? (
          <p className="text-sm text-gray-400">No leaders assigned.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Name', 'Role', 'Email', 'Phone', 'Job Title', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.leaders.map((l) => (
                  <tr key={l.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold shrink-0"
                          style={{ backgroundColor: BRAND }}
                        >
                          {initials(l.name)}
                        </div>
                        <span className="font-medium text-gray-900">{l.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{l.role}</td>
                    <td className="px-4 py-3 text-gray-600">{l.email}</td>
                    <td className="px-4 py-3 text-gray-600">{l.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{l.jobTitle ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${l.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {l.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workspace Teams */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Workspace Teams</p>
        <p className={SECTION_SUB}>Teams operating within this Workspace.</p>
        <p className="text-sm text-gray-400">No teams configured.</p>
      </div>

      {/* Branding */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Branding</p>
        <p className={SECTION_SUB}>Visual identity for this workspace.</p>
        <div className="grid grid-cols-4 gap-x-12 gap-y-6">
          {data.brandingConfig?.logo_url && (
            <div className={`${FIELD} col-span-4`}>
              <p className={LABEL}>Logo</p>
              <div className="mt-1 inline-block rounded-lg border border-gray-200 bg-gray-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.brandingConfig.logo_url}
                  alt="Workspace logo"
                  className="h-12 max-w-[200px] object-contain"
                />
              </div>
            </div>
          )}
          <div className={FIELD}>
            <p className={LABEL}>Primary Color</p>
            <ColorSwatch color={data.brandingConfig?.primary_color} />
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Secondary Color</p>
            <ColorSwatch color={data.brandingConfig?.secondary_color} />
          </div>
        </div>
      </div>

      {/* Office Resources */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Office Resources</p>
        <p className={SECTION_SUB}>Resources displayed throughout the Workspace and Agent Office page.</p>
        <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-6">
          {[
            { label: 'MLS Website', value: data.settingsConfig?.mls_website },
            { label: 'Board of Realtors Website', value: data.settingsConfig?.board_of_realtors_website },
            { label: 'Training Calendar Link', value: data.settingsConfig?.training_calendar_url },
            { label: 'Google Drive Link', value: data.settingsConfig?.google_drive_url },
          ].map(({ label, value }) => (
            <div key={label} className={FIELD}>
              <p className={LABEL}>{label}</p>
              {value ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1 hover:underline truncate"
                  style={{ color: BRAND }}
                >
                  {value}
                  <ExternalLink size={11} className="shrink-0" />
                </a>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>
          ))}
        </div>

        {addLinks.length > 0 && (
          <>
            <p className={LABEL}>Additional Links</p>
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Link Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {addLinks.map((link, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{link.label}</td>
                      <td className="px-4 py-3">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline"
                          style={{ color: BRAND }}
                        >
                          {link.url}
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Audit History */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Audit History</p>
        <p className={SECTION_SUB}>Recent Workspace administrative activity.</p>
        <div className="grid grid-cols-3 gap-x-12 gap-y-6">
          <div className={FIELD}>
            <p className={LABEL}>Created Date</p>
            <p className={VALUE}>{formatDate(data.createdAt)}</p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Primary Contact</p>
            <p className={VALUE}>{data.primaryContact.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{data.primaryContact.email}</p>
          </div>
          <div className={FIELD}>
            <p className={LABEL}>Last Updated</p>
            <p className={VALUE}>{formatDate(data.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* PCx Admin Only */}
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={15} className="text-red-500" />
          <p className="text-base font-semibold text-red-700">PCx Admin Only</p>
        </div>
        <p className="text-sm text-red-500 mb-5">These actions permanently affect this Workspace.</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setSuspendOpen(true); setError(null); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <AlertTriangle size={14} />
            {isSuspended ? 'Unsuspend Workspace' : 'Suspend Workspace'}
          </button>
          {data.status !== 'archived' && (
            <button
              type="button"
              onClick={() => { setArchiveOpen(true); setError(null); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <AlertTriangle size={14} />
              Archive Workspace
            </button>
          )}
          <button
            type="button"
            onClick={() => { setDeleteOpen(true); setError(null); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <AlertTriangle size={14} />
            Delete Workspace
          </button>
        </div>
      </div>

      {/* Suspend / Unsuspend modal */}
      {suspendOpen && (
        <ConfirmModal
          title={isSuspended ? 'Unsuspend workspace?' : 'Suspend workspace?'}
          description={
            isSuspended
              ? 'This will re-activate billing and allow workspace members to access the platform again.'
              : 'This will disable billing and prevent workspace members from accessing the platform.'
          }
          confirmLabel={isSuspended ? 'Unsuspend' : 'Suspend'}
          loading={loading}
          error={error}
          onConfirm={handleSuspend}
          onClose={() => { setSuspendOpen(false); setError(null); }}
        />
      )}

      {/* Archive modal */}
      {archiveOpen && (
        <ConfirmModal
          title="Archive workspace?"
          description="This will move the workspace to archived status. Archived workspaces remain in the database but are no longer active."
          confirmLabel="Archive"
          loading={loading}
          error={error}
          onConfirm={handleArchive}
          onClose={() => { setArchiveOpen(false); setError(null); }}
        />
      )}

      {/* Delete modal */}
      {deleteOpen && (
        <ConfirmModal
          title="Delete workspace permanently?"
          description="This action cannot be undone. All workspace data, memberships, and associated user accounts will be permanently deleted."
          confirmLabel="Delete permanently"
          danger
          loading={loading}
          error={error}
          onConfirm={handleDelete}
          onClose={() => { setDeleteOpen(false); setError(null); }}
        />
      )}
    </>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  danger = false,
  loading,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

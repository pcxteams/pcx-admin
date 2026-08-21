'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Send, Eye, Clock, ChevronDown, AlertTriangle, X, Building, Copy, FolderOpen } from 'lucide-react';

interface PendingWorkspace {
  id: string;
  name: string;
  type: 'office' | 'team';
  status: string;
  formSentAt: string | null;
  primaryContactName: string;
  primaryContactEmail: string;
  setupToken: string | null;
  reportsToName: string | null;
  cloneSourceName: string | null;
}

interface ActiveWorkspace {
  id: string;
  name: string;
  type: 'office' | 'team';
  status: string;
  primaryContactName: string;
  primaryContactEmail: string;
  reportsToName: string | null;
  subscriptionPlan: string | null;
  subscriptionAmount: number;
  seatLimit: number | null;
  billingStatus: string | null;
  memberCount: number;
}

interface WorkspacesData {
  total: number;
  totalRevenue: number;
  pending: PendingWorkspace[];
  active: ActiveWorkspace[];
}

const TH = 'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700';

function WorkspaceIcon({ type }: { type: 'office' | 'team' }) {
  const Icon = type === 'office' ? Building2 : Users;
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-500 shrink-0">
      <Icon size={13} />
    </span>
  );
}

function TypeCell({ type }: { type: 'office' | 'team' }) {
  const Icon = type === 'office' ? Building2 : Users;
  return (
    <div className="flex items-center gap-1.5 text-gray-500">
      <Icon size={13} />
      <span>{type === 'office' ? 'Office' : 'Team'}</span>
    </div>
  );
}

function FormStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    setup_pending: { label: 'Pending', icon: Clock, cls: 'bg-gray-100 text-gray-500' },
    setup_sent:    { label: 'Sent',    icon: Send,      cls: 'bg-blue-50 text-blue-600' },
    setup_viewed:  { label: 'Viewed',  icon: Eye,       cls: 'bg-purple-50 text-purple-600' },
  };
  const cfg = map[status] ?? map.setup_pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-gray-400">—</span>;
  const cls = plan === 'pro'
    ? 'bg-indigo-50 text-indigo-600'
    : 'bg-teal-50 text-teal-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {plan}
    </span>
  );
}

function formatDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface DeleteTarget {
  id: string;
  name: string;
  primaryContactName: string;
  primaryContactEmail: string;
}

export default function WorkspacesList({ data }: { data: WorkspacesData }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Always defaults unchecked — product wants this to reset on every visit
  // rather than persist across navigation.
  const [showArchived, setShowArchived] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copySetupLink(workspaceId: string, token: string) {
    const url = `${window.location.origin}/setup/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(workspaceId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/workspaces/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setDeleteError(data.message ?? 'Something went wrong. Please try again.');
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError('Network error. Please check your connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  function statusRank(w: ActiveWorkspace): number {
    if (w.billingStatus === 'suspended') return 0;
    if (w.status === 'archived') return 1;
    return 2;
  }

  const filteredActive = data.active
    .filter((w) => {
      if (!showArchived && w.status === 'archived') return false;
      const matchesSearch =
        !search ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.primaryContactName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || w.type === typeFilter;
      const matchesPlan = planFilter === 'all' || w.subscriptionPlan === planFilter;
      return matchesSearch && matchesType && matchesPlan;
    })
    .sort((a, b) => statusRank(a) - statusRank(b));

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Total Workspaces</p>
          <p className="text-3xl font-semibold text-gray-900">{data.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Total Revenue</p>
          <p className="text-3xl font-semibold text-gray-900">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.totalRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Active</p>
          <p className="text-3xl font-semibold text-gray-900">{data.active.length}</p>
        </div>
      </div>

      {/* Pending section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Pending
          {data.pending.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">({data.pending.length})</span>
          )}
        </h2>

        {data.pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-10 text-center text-sm text-gray-400">
            No pending workspaces.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className={TH}>Workspace Name</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Primary Contact</th>
                  <th className={TH}>Form Status</th>
                  <th className={TH}>Sent</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.pending.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <WorkspaceIcon type={w.type} />
                        <span className="font-medium text-gray-900">{w.name}</span>
                      </div>
                    </td>
                    <td className={TD}><TypeCell type={w.type} /></td>
                    <td className={TD}>
                      <div className="font-medium text-gray-900 leading-tight">{w.primaryContactName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{w.primaryContactEmail}</div>
                    </td>
                    <td className={TD}><FormStatusBadge status={w.status} /></td>
                    <td className={TD}>{formatDate(w.formSentAt)}</td>
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-red-200 bg-white text-xs font-medium text-red-500 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
                          onClick={() => setDeleteTarget({
                            id: w.id,
                            name: w.name,
                            primaryContactName: w.primaryContactName,
                            primaryContactEmail: w.primaryContactEmail,
                          })}
                        >
                          <X size={12} />
                          Delete
                        </button>
                        {(w.status === 'setup_sent' || w.status === 'setup_viewed') && w.setupToken && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors cursor-pointer"
                            onClick={() => copySetupLink(w.id, w.setupToken!)}
                          >
                            <Copy size={12} />
                            {copiedId === w.id ? 'Copied!' : 'Copy Link'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Active</h2>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Types</option>
              <option value="office">Office</option>
              <option value="team">Team</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="appearance-none rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Plans</option>
              <option value="essentials">Essentials</option>
              <option value="pro">Pro</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-500 hover:text-gray-700">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-teal-600 w-3.5 h-3.5"
            />
            Show Archived
          </label>
          <span className="ml-auto text-xs text-gray-400">{filteredActive.length} workspace{filteredActive.length !== 1 ? 's' : ''}</span>
        </div>

        {filteredActive.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-10 text-center text-sm text-gray-400">
            No active workspaces.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className={TH}>Workspace Name</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Primary Contact</th>
                  <th className={TH}>Reports To</th>
                  <th className={TH}>Plan</th>
                  <th className={TH}>Monthly</th>
                  <th className={TH}>Users</th>
                  <th className={TH}>Office Page</th>
                  <th className={TH}>Content</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredActive.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded shrink-0" style={{ color: '#009689' }}>
                          {w.type === 'office' ? <Building2 size={13} /> : <Users size={13} />}
                        </span>
                        <Link href={`/workspaces/${w.id}`} className="font-medium hover:underline" style={{ color: '#009689' }}>
                          {w.name}
                        </Link>
                      </div>
                    </td>
                    <td className={TD}><TypeCell type={w.type} /></td>
                    <td className={TD}>
                      {w.billingStatus === 'suspended' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Suspended
                        </span>
                      ) : w.status === 'archived' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      <div className="font-medium text-gray-900 leading-tight">{w.primaryContactName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{w.primaryContactEmail}</div>
                    </td>
                    <td className={TD}>{w.reportsToName ?? <span className="text-gray-400">—</span>}</td>
                    <td className={TD}><PlanBadge plan={w.subscriptionPlan} /></td>
                    <td className={TD}>
                      {w.subscriptionAmount > 0 ? (
                        <span>
                          <span className="font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(w.subscriptionAmount)}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">/mo</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={TD}>
                      {w.seatLimit
                        ? `${w.memberCount} / ${w.seatLimit}`
                        : w.memberCount}
                    </td>
                    <td className={TD}>
                      <Link
                        href={`/workspaces/${w.id}/office-page`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        <Building size={13} />
                        Manage
                      </Link>
                    </td>
                    <td className={TD}>
                      <Link
                        href={`/workspaces/${w.id}/content-manager`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        <FolderOpen size={13} />
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="px-6 pt-6 pb-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">Delete workspace?</h2>
                  <p className="text-sm text-gray-500 mt-0.5">This action is permanent and cannot be undone.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                  disabled={isDeleting}
                  className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Workspace info */}
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5">
                <p className="text-sm font-medium text-gray-900">{deleteTarget.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-[10px] font-semibold shrink-0">
                    {deleteTarget.primaryContactName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm text-gray-700">{deleteTarget.primaryContactName}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{deleteTarget.primaryContactEmail}</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <p className="mt-3.5 text-sm text-gray-500">
                The user account associated with this workspace will also be permanently deleted.
              </p>

              {/* Error */}
              {deleteError && (
                <p className="mt-3 text-sm text-red-600">{deleteError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

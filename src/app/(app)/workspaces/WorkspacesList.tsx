'use client';

import { useState } from 'react';
import { Building2, Users, Send, Eye, FileCheck, Clock, ChevronDown } from 'lucide-react';

interface PendingWorkspace {
  id: string;
  name: string;
  type: 'office' | 'team';
  status: string;
  formSentAt: string | null;
  primaryContactName: string;
  primaryContactEmail: string;
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
  seatLimit: number | null;
  billingStatus: string | null;
  memberCount: number;
}

interface WorkspacesData {
  total: number;
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
    setup_submitted: { label: 'Submitted', icon: FileCheck, cls: 'bg-amber-50 text-amber-600' },
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

export default function WorkspacesList({ data }: { data: WorkspacesData }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const filteredActive = data.active.filter((w) => {
    const matchesSearch =
      !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.primaryContactName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || w.type === typeFilter;
    const matchesPlan = planFilter === 'all' || w.subscriptionPlan === planFilter;
    return matchesSearch && matchesType && matchesPlan;
  });

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Workspaces', value: data.total },
          { label: 'Pending Setup',    value: data.pending.length },
          { label: 'Active',           value: data.active.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 px-6 py-5">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
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
                      {w.status === 'setup_submitted' ? (
                        <div className="flex items-center gap-2">
                          <button type="button" className="text-xs text-gray-500 hover:text-gray-700">
                            View Submission
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors"
                          >
                            Complete Setup
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button type="button" className="text-xs text-red-500 hover:text-red-700">
                            Delete
                          </button>
                          <button type="button" className="text-xs text-gray-500 hover:text-gray-700">
                            Copy Link
                          </button>
                        </div>
                      )}
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
                  <th className={TH}>Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredActive.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <WorkspaceIcon type={w.type} />
                        <span className="font-medium text-gray-900">{w.name}</span>
                      </div>
                    </td>
                    <td className={TD}><TypeCell type={w.type} /></td>
                    <td className={TD}>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                        Active
                      </span>
                    </td>
                    <td className={TD}>
                      <div className="font-medium text-gray-900 leading-tight">{w.primaryContactName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{w.primaryContactEmail}</div>
                    </td>
                    <td className={TD}>{w.reportsToName ?? <span className="text-gray-400">—</span>}</td>
                    <td className={TD}><PlanBadge plan={w.subscriptionPlan} /></td>
                    <td className={TD}>
                      {w.seatLimit
                        ? `${w.memberCount} / ${w.seatLimit}`
                        : w.memberCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

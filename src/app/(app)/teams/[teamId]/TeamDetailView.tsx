'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Check, Pencil } from 'lucide-react';
import AsyncSearchableSelect from '@/components/AsyncSearchableSelect';
import { fetchLeaderOptions } from '@/lib/users';
import { updateTeam } from '@/lib/teams';
import TeamMembersTable from './TeamMembersTable';
import type { TeamDetail } from './page';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-4';
const LABEL = 'text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5';
const FIELD = 'flex flex-col';
const INPUT =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-transparent w-full';

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_MAP: Record<string, string> = {
  active: 'bg-green-50 text-green-600',
  archived: 'bg-red-50 text-red-500',
  setup_pending: 'bg-gray-100 text-gray-500',
  setup_sent: 'bg-blue-50 text-blue-600',
  setup_viewed: 'bg-purple-50 text-purple-600',
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_MAP[status] ?? 'bg-gray-100 text-gray-500'}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-sm text-gray-400">—</span>;
  const cls = plan === 'pro' ? 'bg-indigo-50 text-indigo-600' : plan === 'free' ? 'bg-gray-100 text-gray-600' : 'bg-teal-50 text-teal-600';
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>{plan}</span>;
}

export default function TeamDetailView({ data }: { data: TeamDetail }) {
  const router = useRouter();
  const canEdit = data.canEdit;

  const [editingDetails, setEditingDetails] = useState(false);
  const [name, setName] = useState(data.name);
  const [teamLeaderId, setTeamLeaderId] = useState(data.teamLeader?.userId ?? '');
  const [teamLeaderLabel, setTeamLeaderLabel] = useState(data.teamLeader?.name ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function cancelEdit() {
    setName(data.name);
    setTeamLeaderId(data.teamLeader?.userId ?? '');
    setTeamLeaderLabel(data.teamLeader?.name ?? '');
    setSaveError(null);
    setEditingDetails(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    const payload: { name?: string; teamLeaderId?: string } = {};
    if (name.trim() && name.trim() !== data.name) payload.name = name.trim();
    if (teamLeaderId && teamLeaderId !== (data.teamLeader?.userId ?? '')) {
      payload.teamLeaderId = teamLeaderId;
    }

    if (Object.keys(payload).length === 0) {
      setEditingDetails(false);
      setIsSaving(false);
      return;
    }

    const result = await updateTeam(data.id, payload);
    setIsSaving(false);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    setEditingDetails(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    router.refresh();
  }

  const parentOfficeId = data.parentOffice?.id ?? null;
  const addMemberHref = parentOfficeId
    ? `/users/add?${new URLSearchParams({
        workspaceId: parentOfficeId,
        workspaceLabel: data.parentOffice?.name ?? '',
        teamId: data.id,
        teamLabel: data.name,
      }).toString()}`
    : null;

  return (
    <>
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <Link
            href="/teams"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2"
          >
            <ArrowLeft size={12} />
            Back to Teams
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 truncate">{data.name}</h1>
              <StatusBadge status={data.status} />
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-6">
              {saveError && <span className="text-xs text-red-500">{saveError}</span>}
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <Check size={13} />Saved
                </span>
              )}
              {canEdit && editingDetails && (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isSaving}
                    className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {data.parentOffice?.name ?? '—'}
            {data.teamLeader && <> · Primary Leader: {data.teamLeader.name}</>}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        <div className={SECTION}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold text-gray-900 mb-0">Team Details</p>
            {canEdit && !editingDetails && (
              <button
                type="button"
                onClick={() => setEditingDetails(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className={FIELD}>
              <label className={LABEL}>Team Name</label>
              {editingDetails ? (
                <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
              ) : (
                <p className="text-sm text-gray-900">{data.name}</p>
              )}
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Parent Office</p>
              <p className="text-sm text-gray-900">{data.parentOffice?.name ?? '—'}</p>
            </div>

            <div className={FIELD}>
              <label className={LABEL}>Team Leader</label>
              {editingDetails ? (
                <AsyncSearchableSelect
                  value={teamLeaderId}
                  selectedLabel={teamLeaderLabel}
                  onChange={(id, label) => {
                    setTeamLeaderId(id);
                    setTeamLeaderLabel(label);
                  }}
                  fetchOptions={(q) =>
                    parentOfficeId ? fetchLeaderOptions(parentOfficeId, q) : Promise.resolve([])
                  }
                  placeholder="Select a Team Leader"
                  disabled={!parentOfficeId}
                />
              ) : (
                <p className="text-sm text-gray-900">{data.teamLeader?.name ?? '—'}</p>
              )}
              {editingDetails && (
                <p className="mt-1 text-xs text-gray-400">
                  Must be an Active Manager or Leader in the Parent Office.
                </p>
              )}
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Status</p>
              <div className="mt-0.5">
                <StatusBadge status={data.status} />
              </div>
            </div>

            <div className={FIELD}>
              <p className={LABEL}>Team Email</p>
              <p className="text-sm text-gray-900">{data.email ?? '—'}</p>
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Team Phone</p>
              <p className="text-sm text-gray-900">{data.phone ?? '—'}</p>
            </div>

            <div className={FIELD}>
              <p className={LABEL}>Created Date</p>
              <p className="text-sm text-gray-900">{formatDate(data.createdAt)}</p>
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Last Updated</p>
              <p className="text-sm text-gray-900">{formatDate(data.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className={SECTION}>
          <p className={SECTION_TITLE}>Account Status</p>
          <div className="flex items-center gap-6">
            <div className={FIELD}>
              <p className={LABEL}>Subscription Level</p>
              <PlanBadge plan={data.plan} />
            </div>
            {data.seatLimit !== null && (
              <div className={FIELD}>
                <p className={LABEL}>Seat Limit</p>
                <p className="text-sm text-gray-900">{data.seatLimit}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6 max-w-xs">
          <p className="text-3xl font-bold text-blue-700">{data.activeAgentCount}</p>
          <p className="text-sm text-blue-600 mt-1">Active Agents</p>
        </div>

        <TeamMembersTable members={data.members} addMemberHref={addMemberHref} />
      </div>
    </>
  );
}

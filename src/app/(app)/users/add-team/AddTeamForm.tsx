'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import AsyncSearchableSelect from '@/components/AsyncSearchableSelect';
import {
  fetchOfficeOptions,
  fetchMyWorkspaceScope,
  createFreeTeam,
  type MyWorkspaceScope,
} from '@/lib/workspaces';
import { fetchLeaderOptions } from '@/lib/users';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const LABEL_CLASS = 'block text-xs font-medium text-gray-700 mb-1';
const CARD_CLASS = 'bg-white rounded-xl border border-gray-100';
const CARD_HEADER_CLASS = 'px-6 py-4 border-b border-gray-100 text-sm font-semibold text-gray-900';
const CARD_BODY_CLASS = 'p-6 space-y-4';

/**
 * KAN-97: self-service Free Team creation. Only Team Name + Team Leader are
 * collected — no invitation, no new person is ever created here, and there
 * is no setup lifecycle: submission creates one Active Free Team
 * immediately. The Parent Office is resolved, never picked from a full
 * workspace search: a scoped Manager/Leader's own Office (auto-filled, same
 * pattern as Add User's Primary Workspace), or — for a Master/PCx Admin,
 * who has no fixed home Office — whichever workspace was selected in the
 * Users page's own filter when they clicked "Add Team" (passed through as
 * query params), defaulted into a picker they can still change.
 */
export default function AddTeamForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [myScope, setMyScope] = useState<MyWorkspaceScope | null>(null);
  const [officeWorkspaceId, setOfficeWorkspaceId] = useState(
    searchParams.get('officeWorkspaceId') ?? '',
  );
  const [officeWorkspaceLabel, setOfficeWorkspaceLabel] = useState(
    searchParams.get('officeWorkspaceLabel') ?? '',
  );

  const [teamName, setTeamName] = useState('');
  const [teamLeader, setTeamLeader] = useState<{ id: string; label: string }>({ id: '', label: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyWorkspaceScope().then((scope) => {
      setMyScope(scope);
      if (scope.mode === 'workspaces') {
        const offices = scope.workspaces.filter((w) => w.type === 'office');
        if (offices.length === 1) {
          setOfficeWorkspaceId(offices[0].id);
          setOfficeWorkspaceLabel(offices[0].name);
        }
      }
    });
  }, []);

  const scopedOffices =
    myScope?.mode === 'workspaces' ? myScope.workspaces.filter((w) => w.type === 'office') : [];
  // Master/PCx Admin always gets the full picker. A scoped Manager/Leader
  // only gets one when they belong to more than one Office — a single
  // Office is auto-filled and hidden, matching Add User's Primary Workspace.
  const showOfficePicker = myScope?.mode === 'all' || scopedOffices.length > 1;
  const noEligibleOffice = myScope?.mode === 'workspaces' && scopedOffices.length === 0;
  const singleAutofilledOffice = myScope?.mode === 'workspaces' && scopedOffices.length === 1 ? scopedOffices[0] : null;

  async function fetchScopedOfficeOptions(query: string) {
    return scopedOffices
      .filter((w) => w.name.toLowerCase().includes(query.toLowerCase()))
      .map((w) => ({ id: w.id, label: w.name }));
  }

  function handleOfficeChange(id: string, label: string) {
    setOfficeWorkspaceId(id);
    setOfficeWorkspaceLabel(label);
    setTeamLeader({ id: '', label: '' });
  }

  const canSubmit = teamName.trim() !== '' && teamLeader.id !== '' && officeWorkspaceId !== '';

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createFreeTeam({
      teamName: teamName.trim(),
      teamLeaderId: teamLeader.id,
      officeWorkspaceId,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    router.push('/users');
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} />
          Back to Users
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-3">Add New Team</h1>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3.5">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          This creates a <strong>free team with limited functionality</strong>. Free teams inherit
          their office content and cannot manage an independent subscription or content library.
          Need a paid team? Contact PCx support to get set up.
        </p>
      </div>

      {noEligibleOffice ? (
        <div className={CARD_CLASS}>
          <div className={CARD_BODY_CLASS}>
            <p className="text-sm text-gray-500">
              You must belong to an Office workspace to create a Team.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={CARD_CLASS}>
            <div className={CARD_HEADER_CLASS}>1. Team Information</div>
            <div className={CARD_BODY_CLASS}>
              {showOfficePicker && (
                <div>
                  <label className={LABEL_CLASS}>
                    Office Workspace <span className="text-red-500">*</span>
                  </label>
                  <AsyncSearchableSelect
                    value={officeWorkspaceId}
                    selectedLabel={officeWorkspaceLabel}
                    onChange={handleOfficeChange}
                    fetchOptions={myScope?.mode === 'all' ? fetchOfficeOptions : fetchScopedOfficeOptions}
                    placeholder="Select office"
                  />
                </div>
              )}
              {singleAutofilledOffice && (
                <p className="text-sm text-gray-500">
                  Office: <span className="font-medium text-gray-900">{singleAutofilledOffice.name}</span>
                </p>
              )}

              <div>
                <label className={LABEL_CLASS}>
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. The Phoenix Group"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div className={CARD_CLASS}>
            <div className={CARD_HEADER_CLASS}>2. Team Leader</div>
            <div className={CARD_BODY_CLASS}>
              <p className="text-xs text-gray-400 -mt-1">Every team must have one Team Leader.</p>
              <div>
                <label className={LABEL_CLASS}>
                  Search Active Leaders <span className="text-red-500">*</span>
                </label>
                <AsyncSearchableSelect
                  value={teamLeader.id}
                  selectedLabel={teamLeader.label}
                  onChange={(id, label) => setTeamLeader({ id, label })}
                  fetchOptions={(query) => fetchLeaderOptions(officeWorkspaceId, query)}
                  placeholder={officeWorkspaceId ? 'Select leader' : 'Select an office first'}
                  disabled={!officeWorkspaceId}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Choose from the Active Managers and Leaders associated with this Office Workspace.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pb-8">
        <Link
          href="/users"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating…' : 'Create Team'}
        </button>
      </div>
    </div>
  );
}

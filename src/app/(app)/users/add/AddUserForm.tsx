'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X } from 'lucide-react';
import AsyncSearchableSelect from '@/components/AsyncSearchableSelect';
import {
  fetchWorkspaceOptions,
  fetchTeamOptions,
  fetchMyWorkspaceScope,
  type MyWorkspaceScope,
  type WorkspaceOption,
} from '@/lib/workspaces';
import { createInvitedUser, type CreateUserRole, type ProductionLevelInput } from '@/lib/users';
import ProfilePhotoUpload from './ProfilePhotoUpload';
import AssignedLeaderFields, { type LeaderValue } from './AssignedLeaderFields';
import VisibilityFields, { type AccessLevel } from './VisibilityFields';
import ProductionLevelFields from './ProductionLevelFields';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const LABEL_CLASS = 'block text-xs font-medium text-gray-700 mb-1';
// No overflow-hidden: several cards (Workspace Assignment's Additional
// Workspaces, in particular) contain AsyncSearchableSelect dropdowns whose
// options list is absolutely positioned and can extend past the card's
// bottom edge — clipping it there makes the list look like it's rendering
// behind the next card instead of on top of it.
const CARD_CLASS = 'bg-white rounded-xl border border-gray-100';
const CARD_HEADER_CLASS = 'px-6 py-4 border-b border-gray-100 text-sm font-semibold text-gray-900';
const CARD_BODY_CLASS = 'p-6 space-y-4';

const EMPTY_LEADER: LeaderValue = { id: '', label: '' };
const ROLES: { value: CreateUserRole; label: string }[] = [
  { value: 'agent', label: 'Agent' },
  { value: 'manager', label: 'Manager' },
  { value: 'leader', label: 'Leader' },
];

/**
 * KAN-96: Role options are Agent, Manager, and Leader — flat, no nested
 * "User Type"/"Workspace Manager" concept. Primary Workspace is shown to
 * PCx Admins and to Managers/Leaders who can access more than one
 * workspace; a single-workspace user has it silently autofilled and
 * hidden. "Additional Workspaces" for Leader/Manager creates one
 * workspace_membership per selected workspace, same role/visibility as
 * the Primary Workspace membership.
 */
export default function AddUserForm() {
  const router = useRouter();
  const [role, setRole] = useState<CreateUserRole>('agent');

  // 1. User Information (shared)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // 3. Workspace Assignment
  const [myScope, setMyScope] = useState<MyWorkspaceScope | null>(null);
  const [primaryWorkspaceId, setPrimaryWorkspaceId] = useState('');
  const [primaryWorkspaceLabel, setPrimaryWorkspaceLabel] = useState('');
  // A Team can never itself be the parent of another Team (hierarchy is
  // Office -> Team, one level, per the Foundational Architecture doc) — the
  // Team field only ever makes sense when the Primary Workspace is an
  // Office. Populated via workspaceTypeCache below, since neither
  // AsyncSearchableSelect's onChange nor the myScope options carry type
  // through to this handler directly.
  const [primaryWorkspaceType, setPrimaryWorkspaceType] = useState<'office' | 'team' | null>(null);
  const workspaceTypeCache = useRef<Map<string, 'office' | 'team'>>(new Map());
  const [teamId, setTeamId] = useState('');
  const [teamLabel, setTeamLabel] = useState('');
  const [additionalWorkspaces, setAdditionalWorkspaces] = useState<LeaderValue[]>([]);

  // 4. Assigned Leader (agent only)
  const [primaryLeader, setPrimaryLeader] = useState<LeaderValue>(EMPTY_LEADER);
  const [additionalLeaders, setAdditionalLeaders] = useState<LeaderValue[]>([]);

  // 4. Visibility (leader only)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('workspace');

  // 5. Production Information (agent only)
  const [productionLevel, setProductionLevel] = useState<ProductionLevelInput | ''>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyWorkspaceScope().then((scope) => {
      setMyScope(scope);
      if (scope.mode === 'workspaces' && scope.workspaces.length === 1) {
        setPrimaryWorkspaceId(scope.workspaces[0].id);
        setPrimaryWorkspaceLabel(scope.workspaces[0].name);
        setPrimaryWorkspaceType(scope.workspaces[0].type);
      }
    });
  }, []);

  // Whether any workspace other than the selected Primary Workspace exists
  // at all — with only one workspace in the system (or in scope), there is
  // nothing eligible to add as an "Additional Workspace", so the control
  // should be disabled rather than let someone re-select the same workspace.
  // Only meaningful once a check has actually run for the current
  // role/primaryWorkspaceId pair — derived below rather than reset via a
  // synchronous setState branch in the effect.
  const [fetchedHasOtherWorkspaces, setFetchedHasOtherWorkspaces] = useState(true);
  const hasOtherWorkspaces =
    (role === 'leader' || role === 'manager') && primaryWorkspaceId ? fetchedHasOtherWorkspaces : true;

  useEffect(() => {
    if ((role !== 'leader' && role !== 'manager') || !primaryWorkspaceId) return;
    let cancelled = false;
    fetchWorkspaceOptions('', 50).then((options) => {
      if (cancelled) return;
      setFetchedHasOtherWorkspaces(options.some((o) => o.id !== primaryWorkspaceId));
    });
    return () => {
      cancelled = true;
    };
  }, [role, primaryWorkspaceId]);

  function cacheWorkspaceTypes(options: WorkspaceOption[]): WorkspaceOption[] {
    options.forEach((o) => workspaceTypeCache.current.set(o.id, o.type));
    return options;
  }

  function fetchWorkspaceOptionsExcluding(excludeIds: string[]) {
    return async (query: string) => {
      const options = await fetchWorkspaceOptions(query);
      return options.filter((o) => !excludeIds.includes(o.id));
    };
  }

  const showWorkspacePicker =
    myScope?.mode === 'all' || (myScope?.mode === 'workspaces' && myScope.workspaces.length > 1);
  const singleAutofilledWorkspace =
    myScope?.mode === 'workspaces' && myScope.workspaces.length === 1 ? myScope.workspaces[0] : null;

  async function fetchMyScopeOptions(query: string): Promise<WorkspaceOption[]> {
    if (!myScope || myScope.mode !== 'workspaces') return [];
    return cacheWorkspaceTypes(
      myScope.workspaces
        .filter((w) => w.name.toLowerCase().includes(query.toLowerCase()))
        .map((w) => ({ id: w.id, label: w.name, type: w.type })),
    );
  }

  async function fetchPrimaryWorkspaceOptions(query: string): Promise<WorkspaceOption[]> {
    const options = myScope?.mode === 'all' ? await fetchWorkspaceOptions(query) : await fetchMyScopeOptions(query);
    return cacheWorkspaceTypes(options);
  }

  function handlePrimaryWorkspaceChange(id: string, label: string) {
    setPrimaryWorkspaceId(id);
    setPrimaryWorkspaceLabel(label);
    setPrimaryWorkspaceType(id ? workspaceTypeCache.current.get(id) ?? null : null);
    setTeamId('');
    setTeamLabel('');
    setPrimaryLeader(EMPTY_LEADER);
    setAdditionalLeaders([]);
    // Drop any Additional Workspace selection that now duplicates the new
    // Primary Workspace.
    setAdditionalWorkspaces((prev) => prev.filter((w) => w.id !== id));
  }

  function handleTeamChange(id: string, label: string) {
    setTeamId(id);
    setTeamLabel(label);
    setPrimaryLeader(EMPTY_LEADER);
    setAdditionalLeaders([]);
  }

  function addAdditionalWorkspace() {
    setAdditionalWorkspaces((prev) => [...prev, { id: '', label: '' }]);
  }

  function updateAdditionalWorkspace(index: number, id: string, label: string) {
    setAdditionalWorkspaces((prev) => prev.map((w, i) => (i === index ? { id, label } : w)));
  }

  function removeAdditionalWorkspace(index: number) {
    setAdditionalWorkspaces((prev) => prev.filter((_, i) => i !== index));
  }

  const leaderScopeWorkspaceId = teamId || primaryWorkspaceId;

  const canSubmit =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    primaryWorkspaceId !== '' &&
    (role !== 'agent' || (primaryLeader.id !== '' && productionLevel !== ''));

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createInvitedUser({
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      primaryWorkspaceId,
      teamId: role === 'agent' && teamId ? teamId : undefined,
      primaryLeaderId: role === 'agent' ? primaryLeader.id : undefined,
      additionalLeaderIds: role === 'agent' ? additionalLeaders.map((l) => l.id).filter(Boolean) : undefined,
      productionLevel: role === 'agent' && productionLevel ? productionLevel : undefined,
      visibilityScope: role === 'leader' ? accessLevel : undefined,
      additionalWorkspaceIds:
        role === 'leader' || role === 'manager'
          ? additionalWorkspaces.map((w) => w.id).filter(Boolean)
          : undefined,
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
        <h1 className="text-2xl font-semibold text-gray-900 mt-3">Add New User</h1>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                role === r.value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. User Information */}
      <div className={CARD_CLASS}>
        <div className={CARD_HEADER_CLASS}>1. User Information</div>
        <div className={CARD_BODY_CLASS}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>
                First Name <span className="text-red-500">*</span>
              </label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Last Name <span className="text-red-500">*</span>
              </label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Mobile Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Profile Photo</label>
            <ProfilePhotoUpload file={photoFile} onChange={setPhotoFile} />
          </div>
        </div>
      </div>

      {/* 2. Workspace & Team Assignment */}
      <div className={CARD_CLASS}>
        <div className={CARD_HEADER_CLASS}>2. Workspace &amp; Team Assignment</div>
        <div className={CARD_BODY_CLASS}>
          {showWorkspacePicker && (
            <div>
              <label className={LABEL_CLASS}>
                Primary Workspace <span className="text-red-500">*</span>
              </label>
              <AsyncSearchableSelect
                value={primaryWorkspaceId}
                selectedLabel={primaryWorkspaceLabel}
                onChange={handlePrimaryWorkspaceChange}
                fetchOptions={fetchPrimaryWorkspaceOptions}
                placeholder="Select workspace"
              />
            </div>
          )}
          {singleAutofilledWorkspace && (
            <p className="text-sm text-gray-500">
              Workspace: <span className="font-medium text-gray-900">{singleAutofilledWorkspace.name}</span>
            </p>
          )}

          {role === 'agent' && primaryWorkspaceType !== 'team' && (
            <div>
              <label className={LABEL_CLASS}>Team</label>
              <AsyncSearchableSelect
                value={teamId}
                selectedLabel={teamLabel}
                onChange={handleTeamChange}
                fetchOptions={(query) => fetchTeamOptions(primaryWorkspaceId, query)}
                placeholder={primaryWorkspaceId ? 'Select team (optional)' : 'Select a workspace first'}
                disabled={!primaryWorkspaceId}
                clearable
              />
              <p className="mt-1 text-xs text-gray-400">Optional — limited to Active Teams in this workspace</p>
            </div>
          )}

          {(role === 'leader' || role === 'manager') && (
            <div>
              <label className={LABEL_CLASS}>Additional Workspaces</label>
              <div className="space-y-2">
                {additionalWorkspaces.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <AsyncSearchableSelect
                        value={w.id}
                        selectedLabel={w.label}
                        onChange={(id, label) => updateAdditionalWorkspace(i, id, label)}
                        fetchOptions={fetchWorkspaceOptionsExcluding([
                          primaryWorkspaceId,
                          ...additionalWorkspaces.filter((_, j) => j !== i).map((aw) => aw.id),
                        ])}
                        placeholder="Select workspace"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAdditionalWorkspace(i)}
                      className="text-gray-400 hover:text-red-500 cursor-pointer"
                      aria-label="Remove workspace"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addAdditionalWorkspace}
                disabled={!hasOtherWorkspaces}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-teal-600"
              >
                <Plus size={14} />
                Add Workspace
              </button>
              <p className="mt-1 text-xs text-gray-400">
                {hasOtherWorkspaces
                  ? 'Optional — a person can belong to multiple workspaces'
                  : 'No other workspaces available yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {role === 'agent' && (
        <AssignedLeaderFields
          workspaceId={leaderScopeWorkspaceId}
          primaryLeader={primaryLeader}
          onPrimaryLeaderChange={setPrimaryLeader}
          additionalLeaders={additionalLeaders}
          onAdditionalLeadersChange={setAdditionalLeaders}
        />
      )}

      {role === 'leader' && <VisibilityFields accessLevel={accessLevel} onAccessLevelChange={setAccessLevel} />}

      {role === 'agent' && (
        <ProductionLevelFields value={productionLevel} onChange={(v) => setProductionLevel(v as ProductionLevelInput)} />
      )}

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-center gap-3 pb-8">
        <Link
          href="/users"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!canSubmit || isSubmitting}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </div>
  );
}

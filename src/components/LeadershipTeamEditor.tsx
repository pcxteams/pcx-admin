'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, Save } from 'lucide-react';

const BRAND = '#009689';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';
const SECTION_SUB = 'text-xs text-gray-400 mb-5';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009689]/30 focus:border-transparent';

export type Role = 'manager' | 'leader';
export type VisibilityScope = 'workspace' | 'assigned_agents';

/** Leadership record shape returned by the profile / detail endpoints. */
export interface ProfileLeader {
  membershipId?: string;
  userId?: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  role: Role;
  canEditSettings?: boolean;
  visibilityScope: VisibilityScope;
  showProfile: boolean;
  isActive?: boolean;
}

interface FormLeader {
  _key: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: Role;
  visibilityScope: VisibilityScope;
  showProfile: boolean;
}

function toForm(l: ProfileLeader, i: number): FormLeader {
  return {
    _key: `leader-${i}`,
    name: l.name,
    email: l.email,
    phone: l.phone ?? '',
    jobTitle: l.jobTitle ?? '',
    role: l.role,
    visibilityScope: l.visibilityScope,
    showProfile: l.showProfile,
  };
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

const VISIBILITY_LABEL: Record<VisibilityScope, string> = {
  workspace: 'Entire workspace',
  assigned_agents: 'Assigned agents only',
};

/**
 * Leadership Team section shared by the PCx Admin and workspace-facing
 * Workspace Profiles. Enforces the ticket's role rules: a new record defaults
 * to Leader; Visibility and "Display on Agent Office Homepage" are shown only
 * when Role = Leader and toggle live on role change (a Manager has entire-
 * workspace access, so no Visibility is shown). When `canManage` is false the
 * team renders read-only.
 */
export default function LeadershipTeamEditor({
  workspaceId,
  initialLeaders,
  canManage,
}: {
  workspaceId: string;
  initialLeaders: ProfileLeader[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [leaders, setLeaders] = useState<FormLeader[]>(initialLeaders.map(toForm));
  // Monotonic source of stable React keys for added rows. Seeded past the
  // initial rows (keyed leader-0..leader-N-1) and never reused, so add/remove
  // sequences cannot collide the way a length/content-derived key can.
  const nextKey = useRef(initialLeaders.length);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(index: number, patch: Partial<FormLeader>) {
    setLeaders((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function remove(index: number) {
    setLeaders((prev) => prev.filter((_, i) => i !== index));
  }
  function add() {
    setLeaders((prev) => [
      ...prev,
      {
        _key: `leader-${nextKey.current++}`,
        name: '',
        email: '',
        phone: '',
        jobTitle: '',
        role: 'leader',
        visibilityScope: 'workspace',
        showProfile: false,
      },
    ]);
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    for (const [i, l] of leaders.entries()) {
      if (!l.name.trim()) return setError(`Leadership record ${i + 1}: Name is required.`);
      if (!l.email.trim()) return setError(`Leadership record ${i + 1}: Email is required.`);
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/leadership`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaders: leaders.map((l) => {
            const isLeader = l.role === 'leader';
            // A Manager has entire-workspace access; Leaders choose visibility.
            const visibilityScope: VisibilityScope = isLeader ? l.visibilityScope : 'workspace';
            return {
              name: l.name.trim(),
              email: l.email.trim(),
              phone: l.phone.trim() || undefined,
              jobTitle: l.jobTitle.trim() || undefined,
              role: l.role,
              visibilityScope,
              // Office-homepage display is a Leader-only field.
              showProfile: isLeader ? l.showProfile : false,
              // Derived from the access model (manager, or a workspace-scope
              // leader, can manage the workspace).
              canEditSettings: l.role === 'manager' || visibilityScope === 'workspace',
            };
          }),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Failed to save the Leadership Team. Please try again.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Read-only ──────────────────────────────────────────────────────────────
  if (!canManage) {
    return (
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Leadership Team</p>
        <p className={SECTION_SUB}>Managers and Leaders assigned to this workspace.</p>
        {leaders.length === 0 ? (
          <p className="text-sm text-gray-400">No leadership records.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Name', 'Role', 'Email', 'Phone', 'Job Title', 'Visibility', 'On Office Homepage'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaders.map((l) => {
                  const isLeader = l.role === 'leader';
                  return (
                    <tr key={l._key} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold shrink-0" style={{ backgroundColor: BRAND }}>
                            {initials(l.name)}
                          </div>
                          <span className="font-medium text-gray-900">{l.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{isLeader ? 'Leader' : 'Manager'}</td>
                      <td className="px-4 py-3 text-gray-600">{l.email}</td>
                      <td className="px-4 py-3 text-gray-600">{l.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{l.jobTitle || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{isLeader ? VISIBILITY_LABEL[l.visibilityScope] : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{isLeader ? (l.showProfile ? 'Yes' : 'No') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Editable ───────────────────────────────────────────────────────────────
  return (
    <div className={SECTION}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className={SECTION_TITLE}>Leadership Team</p>
          <p className="text-xs text-gray-400">Managers and Leaders assigned to this workspace.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {error && <span className="text-xs text-red-500 max-w-xs">{error}</span>}
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Check size={13} />Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND }}
          >
            <Save size={14} />
            {isSaving ? 'Saving…' : 'Save Leadership Team'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {leaders.map((leader, i) => {
          const isLeader = leader.role === 'leader';
          return (
            <div key={leader._key} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                  {isLeader ? 'Leader' : 'Manager'} {i + 1}
                </span>
                <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-gray-600">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Name <span className="text-red-500">*</span></label>
                    <input type="text" value={leader.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Full name" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Email <span className="text-red-500">*</span></label>
                    <input type="email" value={leader.email} onChange={(e) => update(i, { email: e.target.value })} placeholder="leader@example.com" className={INPUT} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Phone</label>
                    <input type="text" value={leader.phone} onChange={(e) => update(i, { phone: e.target.value })} placeholder="(555) 000-0000" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Job Title</label>
                    <input type="text" value={leader.jobTitle} onChange={(e) => update(i, { jobTitle: e.target.value })} placeholder="e.g. Office Principal" className={INPUT} />
                  </div>
                </div>

                <div className={`grid gap-3 ${isLeader ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <label className={LABEL}>Role</label>
                    <select
                      value={leader.role}
                      onChange={(e) => update(i, { role: e.target.value as Role })}
                      className={INPUT}
                    >
                      <option value="leader">Leader</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  {/* Visibility — Leader-only; a Manager has entire-workspace access. */}
                  {isLeader && (
                    <div>
                      <label className={LABEL}>Visibility</label>
                      <select
                        value={leader.visibilityScope}
                        onChange={(e) => update(i, { visibilityScope: e.target.value as VisibilityScope })}
                        className={INPUT}
                      >
                        <option value="workspace">Entire workspace</option>
                        <option value="assigned_agents">Assigned agents only</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Display on Agent Office Homepage — Leader-only. */}
                {isLeader && (
                  <div>
                    <label className={LABEL}>Display on Agent Office Homepage</label>
                    <div className="flex items-center gap-2 mt-1">
                      {(['yes', 'no'] as const).map((opt) => {
                        const active = leader.showProfile ? opt === 'yes' : opt === 'no';
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => update(i, { showProfile: opt === 'yes' })}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              active ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-200 text-gray-500'
                            }`}
                          >
                            {opt === 'yes' ? 'Yes' : 'No'}
                          </button>
                        );
                      })}
                      <span className="text-xs text-gray-400 ml-1">Shown as a contact on the Agent Office Homepage.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          <Plus size={14} />
          Add Leadership Record
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { UsersListItem } from './UsersList';

const ROLE_BADGES: Record<string, { label: string; cls: string }> = {
  agent: { label: 'Agent', cls: 'bg-blue-50 text-blue-700' },
  leader: { label: 'Leader', cls: 'bg-emerald-50 text-emerald-700' },
  manager: { label: 'Manager', cls: 'bg-purple-50 text-purple-700' },
  admin: { label: 'PCx Admin', cls: 'bg-amber-50 text-amber-700' },
  master: { label: 'PCx Master Admin', cls: 'bg-red-50 text-red-700' },
};

const STATUS_BADGES: Record<string, { label: string; dot: string; cls: string }> = {
  active: { label: 'Active', dot: 'bg-green-500', cls: 'bg-green-50 text-green-600' },
  pending: { label: 'Pending', dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-500' },
  invited: { label: 'Invited', dot: 'bg-blue-500', cls: 'bg-blue-50 text-blue-600' },
  suspended: { label: 'Suspended', dot: 'bg-orange-500', cls: 'bg-orange-50 text-orange-600' },
};

const AVATAR_PALETTE = [
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
];

function avatarClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TH =
  'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';

/**
 * A primary contact's membership disappearing along with the user would
 * strand the workspace without one (its billing_record and
 * workspace_setup_token are keyed to workspace_id, not user_id, so they'd
 * survive orphaned) — Delete is disabled rather than offered for that case.
 */
function RowActionsMenu({ user, onDeleteClick }: { user: UsersListItem; onDeleteClick: (user: UsersListItem) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-gray-400 hover:text-gray-600 cursor-pointer"
        aria-label={`Actions for ${user.name}`}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          <button
            type="button"
            onClick={() => {
              if (user.isPrimaryContact) return;
              setOpen(false);
              onDeleteClick(user);
            }}
            disabled={user.isPrimaryContact}
            title={user.isPrimaryContact ? "Workspace primary contacts can't be deleted" : undefined}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Leader shows the agent's primary leader (via agent_leader_assignment) —
 * always "—" for non-agents, who have no "leader of a leader" concept.
 * Career Stage / Pending Actions / Last Active still have no backing data
 * model (no career-stage or activity-tracking columns) — rendered as static
 * "—" placeholders rather than fabricated values.
 */
interface UsersTableProps {
  items: UsersListItem[];
  onDeleteClick: (user: UsersListItem) => void;
}

export default function UsersTable({ items, onDeleteClick }: UsersTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-10 text-center text-sm text-gray-400">
        No users match these filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 w-10">
              <input type="checkbox" className="accent-teal-600 w-3.5 h-3.5" aria-label="Select all users" />
            </th>
            <th className={TH}>Name</th>
            <th className={TH}>Workspace</th>
            <th className={TH}>User Role</th>
            <th className={TH}>Leader</th>
            <th className={TH}>Career Stage</th>
            <th className={TH}>Pending Actions</th>
            <th className={TH}>Last Active</th>
            <th className={TH}>Status</th>
            <th className={TH} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((u) => {
            const role = ROLE_BADGES[u.role] ?? { label: u.role, cls: 'bg-gray-100 text-gray-600' };
            const status = STATUS_BADGES[u.status] ?? {
              label: u.status,
              dot: 'bg-gray-400',
              cls: 'bg-gray-100 text-gray-500',
            };
            return (
              <tr key={`${u.id}-${u.workspaceId ?? 'none'}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5">
                  <input type="checkbox" className="accent-teal-600 w-3.5 h-3.5" aria-label={`Select ${u.name}`} />
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarClass(u.id)}`}
                    >
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{u.name}</div>
                      <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className={TD}>{u.workspaceName ?? <span className="text-gray-400">—</span>}</td>
                <td className={TD}>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${role.cls}`}>
                    {role.label}
                  </span>
                </td>
                <td className={TD}>{u.leaderName ?? <span className="text-gray-400">—</span>}</td>
                <td className={TD}>
                  <span className="text-gray-400">—</span>
                </td>
                <td className={TD}>
                  <span className="text-gray-400">—</span>
                </td>
                <td className={TD}>
                  <span className="text-gray-400">—</span>
                </td>
                <td className={TD}>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </td>
                <td className={TD}>
                  <RowActionsMenu user={u} onDeleteClick={onDeleteClick} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

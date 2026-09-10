'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { UsersListItem } from './UsersList';
import { ROLE_BADGES, STATUS_BADGES, avatarClass, initials } from '@/components/user-badges';

const TH =
  'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';

/**
 * A primary contact's membership disappearing along with the user would
 * strand the workspace without one (its billing_record and
 * workspace_setup_token are keyed to workspace_id, not user_id, so they'd
 * survive orphaned) — Delete is disabled rather than offered for that case.
 */
function RowActionsMenu({
  user,
  onDeleteClick,
  onResendClick,
  isResending,
}: {
  user: UsersListItem;
  onDeleteClick: (user: UsersListItem) => void;
  onResendClick: (user: UsersListItem) => void;
  isResending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canResend = user.status === 'invited' || user.status === 'pending';
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
          {canResend && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onResendClick(user);
              }}
              disabled={isResending}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              {isResending ? 'Sending…' : 'Resend Invite'}
            </button>
          )}
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
 * Agent Level (the Agent's onboarding_type) and Last Active (most recent
 * session) are now backed and rendered from real data — "—" only when a row
 * genuinely has no value (a non-Agent has no level; someone who never signed
 * in has no last-active). Pending Actions still has no backing model (the
 * tasks/assignments feature isn't built yet) and stays a static "—".
 */

const AGENT_LEVEL_LABELS: Record<string, string> = {
  new_agent: 'New',
  transfer_some_experience: 'Producer',
  transfer_highly_experienced: 'Top Producer',
};

// Session activity is day-grained (Better Auth updateAge), so a compact
// relative label reads better than a precise timestamp; older than a week
// falls back to an absolute US-format date.
function formatLastActive(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US');
}
interface UsersTableProps {
  items: UsersListItem[];
  onDeleteClick: (user: UsersListItem) => void;
  onResendClick: (user: UsersListItem) => void;
  resendingId: string | null;
}

export default function UsersTable({ items, onDeleteClick, onResendClick, resendingId }: UsersTableProps) {
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
            <th className={TH}>Agent Level</th>
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
                  {u.agentLevel && AGENT_LEVEL_LABELS[u.agentLevel] ? (
                    AGENT_LEVEL_LABELS[u.agentLevel]
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className={TD}>
                  <span className="text-gray-400">—</span>
                </td>
                <td className={TD}>
                  {u.lastActiveAt ? (
                    formatLastActive(u.lastActiveAt)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className={TD}>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </td>
                <td className={TD}>
                  <RowActionsMenu
                    user={u}
                    onDeleteClick={onDeleteClick}
                    onResendClick={onResendClick}
                    isResending={resendingId === u.id}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

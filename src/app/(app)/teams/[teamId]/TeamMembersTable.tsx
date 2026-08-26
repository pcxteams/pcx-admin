'use client';

import Link from 'next/link';
import { ROLE_BADGES, STATUS_BADGES, avatarClass, initials } from '@/components/user-badges';
import type { TeamMemberRow } from './page';

const TH =
  'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';

interface Props {
  members: TeamMemberRow[];
  addMemberHref: string | null;
}

/**
 * KAN-115's Team Members roster — name/email/role/membership status/
 * assigned Leader, straight off the backend's reuse of UsersService.list().
 * No per-row View/Edit/Task actions: not in the ticket's AC, unlike the
 * (non-authoritative) Figma mock.
 */
export default function TeamMembersTable({ members, addMemberHref }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-semibold text-gray-900">Team Members</p>
        {addMemberHref && (
          <Link
            href={addMemberHref}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            + Add Member
          </Link>
        )}
      </div>

      {members.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">This Team has no members yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={TH}>Name</th>
                <th className={TH}>Role</th>
                <th className={TH}>Status</th>
                <th className={TH}>Assigned Leader</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const role = ROLE_BADGES[m.role] ?? { label: m.role, cls: 'bg-gray-100 text-gray-600' };
                const status = STATUS_BADGES[m.status] ?? {
                  label: m.status,
                  dot: 'bg-gray-400',
                  cls: 'bg-gray-100 text-gray-500',
                };
                return (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarClass(m.id)}`}
                        >
                          {initials(m.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{m.name}</div>
                          <div className="text-xs text-gray-400 truncate">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={TD}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${role.cls}`}>
                        {role.label}
                      </span>
                    </td>
                    <td className={TD}>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className={TD}>{m.leaderName ?? <span className="text-gray-400">—</span>}</td>
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

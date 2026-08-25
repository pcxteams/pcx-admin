'use client';

import Link from 'next/link';
import type { TeamsListItem } from './TeamsList';

const PLAN_BADGES: Record<string, { label: string; cls: string }> = {
  essentials: { label: 'Essentials', cls: 'bg-gray-100 text-gray-600' },
  pro: { label: 'Pro', cls: 'bg-purple-50 text-purple-700' },
};

const STATUS_BADGES: Record<string, { label: string; dot: string; cls: string }> = {
  setup_pending: { label: 'Pending', dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-500' },
  setup_sent: { label: 'Sent', dot: 'bg-blue-500', cls: 'bg-blue-50 text-blue-600' },
  setup_viewed: { label: 'Viewed', dot: 'bg-purple-500', cls: 'bg-purple-50 text-purple-600' },
  active: { label: 'Active', dot: 'bg-green-500', cls: 'bg-green-50 text-green-600' },
  archived: { label: 'Archived', dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-500' },
};

const TH =
  'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';

export default function TeamsTable({ items }: { items: TeamsListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className={TH}>Team Name</th>
            <th className={TH}>Parent Office</th>
            <th className={TH}>Team Leader</th>
            <th className={TH}>Plan</th>
            <th className={TH}>Status</th>
            <th className={TH}>Members</th>
          </tr>
        </thead>
        <tbody>
          {items.map((team) => {
            const plan = team.plan ? PLAN_BADGES[team.plan] : null;
            const status = STATUS_BADGES[team.status] ?? {
              label: team.status,
              dot: 'bg-gray-400',
              cls: 'bg-gray-100 text-gray-500',
            };
            return (
              <tr key={team.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className={TD}>
                  <Link href={`/teams/${team.id}`} className="font-medium text-teal-700 hover:underline">
                    {team.name}
                  </Link>
                </td>
                <td className={TD}>{team.parentOfficeName ?? '—'}</td>
                <td className={TD}>{team.teamLeaderName ?? '—'}</td>
                <td className={TD}>
                  {plan ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${plan.cls}`}>
                      {plan.label}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={TD}>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </td>
                <td className={TD}>{team.activeMembers}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

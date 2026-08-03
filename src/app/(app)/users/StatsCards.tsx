import type { ReactNode } from 'react';
import { Users as UsersIcon, Crown, ArrowUpRight } from 'lucide-react';

export interface RoleBucketStats {
  total: number;
  active: number;
  inactive: number;
  addedLast30Days: number;
}

export interface UsersStats {
  agents: RoleBucketStats;
  leaders: RoleBucketStats;
}

function StatCard({
  label,
  stats,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  stats: RoleBucketStats;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.total}</p>
        <p className="text-xs text-gray-400 mt-2">
          {stats.active} Active &middot; {stats.inactive} Inactive
        </p>
        {stats.addedLast30Days > 0 && (
          <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
            <ArrowUpRight size={12} />
            {stats.addedLast30Days} added in the last 30 days
          </p>
        )}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
    </div>
  );
}

export default function StatsCards({ stats }: { stats: UsersStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <StatCard
        label="Agents"
        stats={stats.agents}
        icon={<UsersIcon size={18} />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <StatCard
        label="Leaders"
        stats={stats.leaders}
        icon={<Crown size={18} />}
        iconBg="bg-green-50"
        iconColor="text-green-600"
      />
    </div>
  );
}

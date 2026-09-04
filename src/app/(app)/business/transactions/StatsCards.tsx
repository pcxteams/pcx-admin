import type { ReactNode } from 'react';
import { Building2, DollarSign, PiggyBank, Receipt } from 'lucide-react';
import { fmtCompactUsd, type TransactionsSummary } from './types';

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
      </div>
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
    </div>
  );
}

/** Units / Volume / GCI / Company Dollar, over the currently filtered set. */
export default function StatsCards({ summary }: { summary: TransactionsSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Units"
        value={summary.units.toLocaleString('en-US')}
        icon={<Building2 size={18} />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <StatCard
        label="Volume"
        value={fmtCompactUsd(summary.volume)}
        icon={<DollarSign size={18} />}
        iconBg="bg-green-50"
        iconColor="text-green-600"
      />
      <StatCard
        label="GCI"
        value={fmtCompactUsd(summary.gci)}
        icon={<Receipt size={18} />}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
      />
      <StatCard
        label="Company Dollar"
        value={fmtCompactUsd(summary.companyDollar)}
        icon={<PiggyBank size={18} />}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      />
    </div>
  );
}

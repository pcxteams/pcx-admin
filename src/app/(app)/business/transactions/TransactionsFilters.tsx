'use client';

import { Search } from 'lucide-react';
import AsyncSearchableSelect from '@/components/AsyncSearchableSelect';
import FilterDropdown from '@/components/FilterDropdown';
import { fetchWorkspaceOptions } from '@/lib/workspaces';
import { fetchLeaderFilterOptions } from '@/lib/transactions';
import { DATE_PRESETS } from './date-presets';
import { SOURCE_LABELS, STATUS_META, TYPE_LABELS } from './types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];

export interface TransactionFilters {
  search: string;
  status: string;
  transactionType: string;
  source: string;
  workspaceId: string;
  workspaceLabel: string;
  leaderUserId: string;
  leaderLabel: string;
  datePreset: string;
  dateStart: string;
  dateEnd: string;
}

interface Props {
  filters: TransactionFilters;
  onChange: (patch: Partial<TransactionFilters>) => void;
  onPresetChange: (preset: string) => void;
}

const DATE_INPUT =
  'rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50';

/**
 * The v2 Numbers page split its filters into a "Global Filters" pill row
 * (brokerage / office / team / leader / level) and a second row above the
 * table (status / type / source). v3 has one Workspace hierarchy instead of
 * brokerage+office+team, so both rows collapse into this single bar.
 */
export default function TransactionsFilters({ filters, onChange, onPresetChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[240px] max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search agent, client, address or city..."
          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <div className="w-48">
        <AsyncSearchableSelect
          value={filters.workspaceId}
          selectedLabel={filters.workspaceLabel}
          onChange={(id, label) => onChange({ workspaceId: id, workspaceLabel: label })}
          fetchOptions={fetchWorkspaceOptions}
          placeholder="Workspace"
          clearable
        />
      </div>

      <div className="w-48">
        <AsyncSearchableSelect
          value={filters.leaderUserId}
          selectedLabel={filters.leaderLabel}
          onChange={(id, label) => onChange({ leaderUserId: id, leaderLabel: label })}
          fetchOptions={fetchLeaderFilterOptions}
          placeholder="Leader"
          clearable
        />
      </div>

      <FilterDropdown
        label="Status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(v) => onChange({ status: v })}
      />
      <FilterDropdown
        label="Type"
        options={TYPE_OPTIONS}
        value={filters.transactionType}
        onChange={(v) => onChange({ transactionType: v })}
      />
      <FilterDropdown
        label="Lead Source"
        options={SOURCE_OPTIONS}
        value={filters.source}
        onChange={(v) => onChange({ source: v })}
      />
      <FilterDropdown
        label="Period"
        options={DATE_PRESETS}
        value={filters.datePreset}
        onChange={onPresetChange}
        allValue="all"
      />

      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label="Start date"
          value={filters.dateStart}
          onChange={(e) => onChange({ dateStart: e.target.value, datePreset: 'custom' })}
          className={DATE_INPUT}
        />
        <span className="text-gray-300">—</span>
        <input
          type="date"
          aria-label="End date"
          value={filters.dateEnd}
          onChange={(e) => onChange({ dateEnd: e.target.value, datePreset: 'custom' })}
          className={DATE_INPUT}
        />
      </div>
    </div>
  );
}

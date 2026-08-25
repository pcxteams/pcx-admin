'use client';

import { Search } from 'lucide-react';
import AsyncSearchableSelect from '@/components/AsyncSearchableSelect';
import FilterDropdown from '@/components/FilterDropdown';
import { fetchOfficeOptions } from '@/lib/workspaces';

const PLAN_OPTIONS = [
  { value: 'all', label: 'All Plans' },
  { value: 'essentials', label: 'Essentials' },
  { value: 'pro', label: 'Pro' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

interface TeamsFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  parentOfficeId: string;
  parentOfficeLabel: string;
  onParentOfficeChange: (id: string, label: string) => void;
  showParentOfficeFilter: boolean;
  plan: string;
  onPlanChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
}

export default function TeamsFilters(props: TeamsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[240px] max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder="Search by team name or team leader..."
          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Only shown when the caller's scope spans more than one Office —
          a single-office Manager/Leader has nothing to filter by. */}
      {props.showParentOfficeFilter && (
        <div className="w-44">
          <AsyncSearchableSelect
            value={props.parentOfficeId}
            selectedLabel={props.parentOfficeLabel}
            onChange={props.onParentOfficeChange}
            fetchOptions={fetchOfficeOptions}
            placeholder="Parent Office"
            clearable
          />
        </div>
      )}

      <FilterDropdown label="Plan" options={PLAN_OPTIONS} value={props.plan} onChange={props.onPlanChange} />
      <FilterDropdown label="Status" options={STATUS_OPTIONS} value={props.status} onChange={props.onStatusChange} />
    </div>
  );
}

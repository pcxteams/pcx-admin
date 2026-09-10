'use client';

import { Search } from 'lucide-react';
import AsyncSearchableSelect, { type AsyncOption } from '@/components/AsyncSearchableSelect';
import FilterDropdown from '@/components/FilterDropdown';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'agent', label: 'Agent' },
  { value: 'leader', label: 'Leader' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'PCx Admin' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
];

// Full vs Limited mirrors workspace_membership.visibility_scope
// ('workspace' vs 'assigned_agents') for role='leader' rows — a real,
// backend-enforced filter, like Agent Level and Last Active below.
const LEADER_TYPE_OPTIONS = [
  { value: 'all', label: 'All Leader Types' },
  { value: 'full', label: 'Full Leader' },
  { value: 'limited', label: 'Limited Leader' },
];

// Agent Level filters on the Agent's onboarding_type (GET /users?agentLevel=...,
// see UsersService.list) — the New / Producer / Top Producer tier the ranking
// engine already keys on. Values are the raw onboarding_type strings so no
// mapping table is needed, matching the backend. Replaces the former "Career
// Stage" stub (Setup/Foundations/Mastery/Wealth Building), a hierarchy the
// Aug 26 AI re-prioritization dropped. Only Agents carry a level.
const AGENT_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Agent Levels' },
  { value: 'new_agent', label: 'New' },
  { value: 'transfer_some_experience', label: 'Producer' },
  { value: 'transfer_highly_experienced', label: 'Top Producer' },
];

// Last Active IS wired to the API (GET /users?lastActive=...): it filters on
// the user's most recent Better Auth session (see UsersService.list). The
// windows are rolling look-back periods (today = last 24h, this_week = last
// 7d, this_month = last 30d), day-grained by Better Auth's session updateAge.
const LAST_ACTIVE_OPTIONS = [
  { value: 'all', label: 'Last Active' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
];

async function fetchWorkspaces(query: string): Promise<AsyncOption[]> {
  try {
    const res = await fetch(`/api/workspaces/search?q=${encodeURIComponent(query)}&limit=20`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { id: string; name: string; type: string }[];
    return data.map((w) => ({ id: w.id, label: w.name }));
  } catch {
    return [];
  }
}

interface UsersFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  workspaceId: string;
  workspaceLabel: string;
  onWorkspaceChange: (id: string, label: string) => void;
  role: string;
  onRoleChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  leaderType: string;
  onLeaderTypeChange: (v: string) => void;
  agentLevel: string;
  onAgentLevelChange: (v: string) => void;
  lastActive: string;
  onLastActiveChange: (v: string) => void;
}

export default function UsersFilters(props: UsersFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[240px] max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder="Search by name, workspace, email, or phone..."
          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <div className="w-44">
        <AsyncSearchableSelect
          value={props.workspaceId}
          selectedLabel={props.workspaceLabel}
          onChange={props.onWorkspaceChange}
          fetchOptions={fetchWorkspaces}
          placeholder="Workspace"
          clearable
        />
      </div>

      <FilterDropdown label="User Role" options={ROLE_OPTIONS} value={props.role} onChange={props.onRoleChange} />
      <FilterDropdown label="Status" options={STATUS_OPTIONS} value={props.status} onChange={props.onStatusChange} />
      <FilterDropdown
        label="Leader Type"
        options={LEADER_TYPE_OPTIONS}
        value={props.leaderType}
        onChange={props.onLeaderTypeChange}
      />
      <FilterDropdown
        label="Agent Level"
        options={AGENT_LEVEL_OPTIONS}
        value={props.agentLevel}
        onChange={props.onAgentLevelChange}
      />
      <FilterDropdown
        label="Last Active"
        options={LAST_ACTIVE_OPTIONS}
        value={props.lastActive}
        onChange={props.onLastActiveChange}
      />
    </div>
  );
}

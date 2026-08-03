'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import UsersFilters from './UsersFilters';
import UsersTable from './UsersTable';

export interface UsersListItem {
  id: string;
  name: string;
  email: string;
  workspaceId: string | null;
  workspaceName: string | null;
  role: string;
  status: 'active' | 'invited' | 'suspended';
  phone: string | null;
  createdAt: string;
}

export interface UsersListResponse {
  items: UsersListItem[];
  total: number;
  page: number;
  perPage: number;
}

const PER_PAGE_OPTIONS = [10, 25, 50];

function pageWindow(current: number, totalPages: number, size = 7): number[] {
  if (totalPages <= size) return Array.from({ length: totalPages }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(totalPages, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function UsersList({ initialData }: { initialData: UsersListResponse }) {
  const [search, setSearch] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLabel, setWorkspaceLabel] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  // Stub filters — held in local state only, never sent to the API.
  const [leaderType, setLeaderType] = useState('all');
  const [careerStage, setCareerStage] = useState('all');
  const [lastActive, setLastActive] = useState('all');

  const [page, setPage] = useState(initialData.page);
  const [perPage, setPerPage] = useState(initialData.perPage);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (workspaceId) params.set('workspaceId', workspaceId);
      if (role !== 'all') params.set('role', role);
      if (status !== 'all') params.set('status', status);
      params.set('page', String(page));
      params.set('perPage', String(perPage));

      const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) return;
      const json = (await res.json()) as UsersListResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [search, workspaceId, role, status, page, perPage]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchUsers, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchUsers]);

  const totalPages = Math.max(Math.ceil(data.total / data.perPage), 1);
  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.perPage + 1;
  const rangeEnd = Math.min(data.page * data.perPage, data.total);

  return (
    <div>
      <UsersFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        workspaceId={workspaceId}
        workspaceLabel={workspaceLabel}
        onWorkspaceChange={(id, label) => {
          setWorkspaceId(id);
          setWorkspaceLabel(label);
          setPage(1);
        }}
        role={role}
        onRoleChange={(v) => {
          setRole(v);
          setPage(1);
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        leaderType={leaderType}
        onLeaderTypeChange={setLeaderType}
        careerStage={careerStage}
        onCareerStageChange={setCareerStage}
        lastActive={lastActive}
        onLastActiveChange={setLastActive}
      />

      <div className={`mt-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <UsersTable items={data.items} />
      </div>

      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <p className="text-sm text-gray-400">
          {data.total === 0
            ? 'Showing 0 users'
            : `Showing ${rangeStart} to ${rangeEnd} of ${data.total} users`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          {pageWindow(page, totalPages).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`w-7 h-7 rounded-md text-sm font-medium transition-colors ${
                p === page ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="ml-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

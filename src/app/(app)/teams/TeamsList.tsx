'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, AlertTriangle, Users2 } from 'lucide-react';
import TeamsFilters from './TeamsFilters';
import TeamsTable from './TeamsTable';

export interface TeamsListItem {
  id: string;
  name: string;
  parentOfficeId: string | null;
  parentOfficeName: string | null;
  teamLeaderName: string | null;
  plan: string | null;
  status: string;
  activeMembers: number;
}

export interface TeamsListResponse {
  items: TeamsListItem[];
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

interface TeamsListProps {
  initialData: TeamsListResponse;
  showParentOfficeFilter: boolean;
  onTotalChange: (total: number) => void;
}

export default function TeamsList({ initialData, showParentOfficeFilter, onTotalChange }: TeamsListProps) {
  const [search, setSearch] = useState('');
  const [parentOfficeId, setParentOfficeId] = useState('');
  const [parentOfficeLabel, setParentOfficeLabel] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');

  const [page, setPage] = useState(initialData.page);
  const [perPage, setPerPage] = useState(initialData.perPage);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const hasActiveFilters = Boolean(search.trim() || parentOfficeId || plan !== 'all' || status !== 'all');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (parentOfficeId) params.set('parentOfficeId', parentOfficeId);
      if (plan !== 'all') params.set('plan', plan);
      if (status !== 'all') params.set('status', status);
      params.set('page', String(page));
      params.set('perPage', String(perPage));

      const res = await fetch(`/api/teams?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        setError('Something went wrong loading Teams. Please try again.');
        return;
      }
      const json = (await res.json()) as TeamsListResponse;
      setData(json);
      onTotalChange(json.total);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [search, parentOfficeId, plan, status, page, perPage, onTotalChange]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchTeams, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchTeams]);

  function clearFilters() {
    setSearch('');
    setParentOfficeId('');
    setParentOfficeLabel('');
    setPlan('all');
    setStatus('all');
    setPage(1);
  }

  const totalPages = Math.max(Math.ceil(data.total / data.perPage), 1);
  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.perPage + 1;
  const rangeEnd = Math.min(data.page * data.perPage, data.total);

  return (
    <div>
      <TeamsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        parentOfficeId={parentOfficeId}
        parentOfficeLabel={parentOfficeLabel}
        onParentOfficeChange={(id, label) => {
          setParentOfficeId(id);
          setParentOfficeLabel(label);
          setPage(1);
        }}
        showParentOfficeFilter={showParentOfficeFilter}
        plan={plan}
        onPlanChange={(v) => {
          setPlan(v);
          setPage(1);
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />

      <div className="mt-4">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50 py-16 text-center">
            <AlertTriangle size={22} className="text-red-500" />
            <p className="text-sm text-gray-600">{error}</p>
            <button
              type="button"
              onClick={fetchTeams}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : data.total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 py-16 text-center">
            <Users2 size={22} className="text-gray-300" />
            {hasActiveFilters ? (
              <>
                <p className="text-sm text-gray-600">No teams match your filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-teal-700 hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">No teams yet.</p>
                <Link href="/users/add-team" className="text-sm font-medium text-teal-700 hover:underline">
                  Add a Team
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <TeamsTable items={data.items} />
          </div>
        )}
      </div>

      {!error && data.total > 0 && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <p className="text-sm text-gray-400">
            Showing {rangeStart} to {rangeEnd} of {data.total} teams
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
      )}
    </div>
  );
}

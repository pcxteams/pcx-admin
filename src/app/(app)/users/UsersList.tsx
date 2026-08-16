'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import UsersFilters from './UsersFilters';
import UsersTable from './UsersTable';
import { deleteUser, resendActivation } from '@/lib/users';

export interface UsersListItem {
  id: string;
  name: string;
  email: string;
  workspaceId: string | null;
  workspaceName: string | null;
  role: string;
  status: 'active' | 'pending' | 'invited' | 'suspended';
  phone: string | null;
  createdAt: string;
  isPrimaryContact: boolean;
  leaderName: string | null;
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

interface UsersListProps {
  initialData: UsersListResponse;
  // Lifted to the parent (UsersPageClient) rather than owned here, so the
  // Users page header's "Add Team" link can default to whichever workspace
  // this filter currently has selected (KAN-97, Master/PCx Admin case).
  workspaceId: string;
  workspaceLabel: string;
  onWorkspaceChange: (id: string, label: string) => void;
}

export default function UsersList({
  initialData,
  workspaceId,
  workspaceLabel,
  onWorkspaceChange,
}: UsersListProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [leaderType, setLeaderType] = useState('all');
  // Stub filters — held in local state only, never sent to the API.
  const [careerStage, setCareerStage] = useState('all');
  const [lastActive, setLastActive] = useState('all');

  const [page, setPage] = useState(initialData.page);
  const [perPage, setPerPage] = useState(initialData.perPage);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UsersListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const resendMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (leaderType !== 'all') params.set('leaderType', leaderType);
      params.set('page', String(page));
      params.set('perPage', String(perPage));

      const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) return;
      const json = (await res.json()) as UsersListResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [search, workspaceId, role, status, leaderType, page, perPage]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteUser(deleteTarget.id, deleteTarget.workspaceId ?? undefined);
    setIsDeleting(false);
    if (!result.ok) {
      setDeleteError(result.message);
      return;
    }
    setDeleteTarget(null);
    await fetchUsers();
  }

  async function handleResend(target: UsersListItem) {
    setResendingId(target.id);
    if (resendMessageTimeoutRef.current) clearTimeout(resendMessageTimeoutRef.current);
    setResendMessage(null);
    const result = await resendActivation(target.id);
    setResendingId(null);
    setResendMessage(
      result.ok
        ? { type: 'success', text: `Invite resent to ${target.email}.` }
        : { type: 'error', text: result.message },
    );
    resendMessageTimeoutRef.current = setTimeout(() => setResendMessage(null), 5000);
  }

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

  useEffect(() => {
    return () => {
      if (resendMessageTimeoutRef.current) clearTimeout(resendMessageTimeoutRef.current);
    };
  }, []);

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
          onWorkspaceChange(id, label);
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
        onLeaderTypeChange={(v) => {
          setLeaderType(v);
          setPage(1);
        }}
        careerStage={careerStage}
        onCareerStageChange={setCareerStage}
        lastActive={lastActive}
        onLastActiveChange={setLastActive}
      />

      {resendMessage && (
        <div
          className={`mt-4 rounded-lg border px-4 py-2.5 text-sm ${
            resendMessage.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {resendMessage.text}
        </div>
      )}

      <div className={`mt-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <UsersTable
          items={data.items}
          onDeleteClick={(u) => { setDeleteTarget(u); setDeleteError(null); }}
          onResendClick={handleResend}
          resendingId={resendingId}
        />
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">
                    {deleteTarget.workspaceId ? 'Remove from workspace?' : 'Delete user?'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {deleteTarget.workspaceId
                      ? `This removes ${deleteTarget.name} from ${deleteTarget.workspaceName ?? 'this workspace'}. If it's their only workspace, their account is deleted entirely.`
                      : 'This action is permanent and cannot be undone.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                  disabled={isDeleting}
                  className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5">
                <p className="text-sm font-medium text-gray-900">{deleteTarget.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{deleteTarget.email}</p>
              </div>

              {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
            </div>

            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

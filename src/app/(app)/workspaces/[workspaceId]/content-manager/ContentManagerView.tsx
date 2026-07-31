'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Search, ChevronDown, ChevronUp, Lock, Loader2, Check,
} from 'lucide-react';
import {
  CONTENT_CATEGORIES, CONTENT_TYPES, TYPE_META, STATUS_META,
  estTimeLabel, usedInLabel, timeAgo,
  type ContentListResponse, type ContentItemSummary, type ContentItemDetail,
  type ContentType, type ContentStatus, type ContentSort,
} from '@/lib/content';
import { TypeIcon } from './content-icons';
import ContentRowDetail from './ContentRowDetail';
import ContentFormModal from './ContentFormModal';

const TH = 'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';
const PAGE_SIZES = [10, 25, 50, 100];

const SORT_OPTIONS: { value: ContentSort; label: string }[] = [
  { value: 'recently_updated', label: 'Recently Updated' },
  { value: 'recently_created', label: 'Recently Added' },
  { value: 'title', label: 'Title (A–Z)' },
];

type ModalState =
  | { mode: 'create'; type: ContentType }
  | { mode: 'edit'; item: ContentItemDetail }
  | null;

export default function ContentManagerView({
  workspaceId,
  initialData,
}: {
  workspaceId: string;
  initialData: ContentListResponse;
}) {
  const [data, setData] = useState<ContentListResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [sort, setSort] = useState<ContentSort>('recently_updated');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, ContentItemDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null); // 'add' | `status:<id>`
  const [modal, setModal] = useState<ModalState>(null);

  const access = data.access;
  const canManage = access.canManage;

  /* ---------------------------------------------------------------- fetch */

  const load = useCallback(
    async (signal: AbortSignal) => {
      const qs = new URLSearchParams();
      if (typeFilter !== 'all') qs.set('type', typeFilter);
      if (categoryFilter !== 'all') qs.set('category', categoryFilter);
      if (debouncedSearch.trim()) qs.set('search', debouncedSearch.trim());
      qs.set('sort', sort);
      qs.set('page', String(page));
      qs.set('pageSize', String(pageSize));
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/content?${qs.toString()}`, {
          credentials: 'include',
          signal,
        });
        if (!res.ok) {
          setError('Failed to load content. Please try again.');
          return;
        }
        setData((await res.json()) as ContentListResponse);
      } catch {
        if (!signal.aborted) setError('Network error. Please check your connection.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [workspaceId, typeFilter, categoryFilter, debouncedSearch, sort, page, pageSize],
  );

  // refreshKey forces a reload after mutations. `load` intentionally sets
  // loading/results state — this is a data fetch on filter/sort/page change, not
  // derived state, so the set-state-in-effect guard doesn't apply.
  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load, refreshKey]);

  // Debounce the search box; reset to page 1 when the query changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const reload = () => setRefreshKey((k) => k + 1);

  async function fetchDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/content/${id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = (await res.json()) as ContentItemDetail;
        setDetail((d) => ({ ...d, [id]: json }));
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setOpenMenu(null);
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detail[id]) void fetchDetail(id);
  }

  async function changeStatus(id: string, status: ContentStatus) {
    setOpenMenu(null);
    const res = await fetch(`/api/workspaces/${workspaceId}/content/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      reload();
      if (detail[id]) void fetchDetail(id);
    }
  }

  function onSaved(saved: ContentItemDetail) {
    setModal(null);
    reload();
    setDetail((d) => ({ ...d, [saved.id]: saved }));
  }

  /* ---------------------------------------------------------- derived */

  const items = data.items;
  const total = data.total;
  const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
  const from = total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(total, data.page * data.pageSize);

  /* ---------------------------------------------------------- render */

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Content Manager</h1>
          <p className="text-sm text-gray-400 mt-1">
            Store reusable learning content used throughout your Experience Builder.
          </p>
        </div>
        {canManage ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'add' ? null : 'add')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
            >
              <Plus size={15} />
              Add New
              <ChevronDown size={13} />
            </button>
            {openMenu === 'add' && (
              <>
                <button
                  type="button"
                  aria-hidden
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setOpenMenu(null)}
                />
                <div className="absolute right-0 mt-1.5 z-50 w-48 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  {CONTENT_TYPES.map((t) => {
                    const meta = TYPE_META[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          setModal({ mode: 'create', type: t });
                        }}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <TypeIcon type={t} iconColor={meta.iconColor} iconBg={meta.iconBg} tile="w-6 h-6" size={13} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Lock size={12} />
            View only
          </span>
        )}
      </div>

      {/* Content type tabs */}
      <FilterRow label="Content Type">
        <Pill active={typeFilter === 'all'} onClick={() => { setTypeFilter('all'); setPage(1); }}>
          All
        </Pill>
        {CONTENT_TYPES.map((t) => (
          <Pill key={t} active={typeFilter === t} onClick={() => { setTypeFilter(t); setPage(1); }}>
            {TYPE_META[t].plural}
          </Pill>
        ))}
      </FilterRow>

      {/* Category chips + sort */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mr-1">
            Category
          </span>
          <Pill active={categoryFilter === 'all'} onClick={() => { setCategoryFilter('all'); setPage(1); }}>
            All
          </Pill>
          {CONTENT_CATEGORIES.map((c) => (
            <Pill key={c} active={categoryFilter === c} onClick={() => { setCategoryFilter(c); setPage(1); }}>
              {c}
            </Pill>
          ))}
        </div>
        <div className="relative shrink-0">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as ContentSort); setPage(1); }}
            className="appearance-none rounded-lg border border-gray-200 pl-3 pr-8 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search content..."
          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className={TH}>Content</th>
                <th className={TH}>Type</th>
                <th className={TH}>Category</th>
                <th className={TH}>Est. Time</th>
                <th className={TH}>Used In</th>
                <th className={TH}>Status</th>
                <th className={TH}>Last Updated</th>
                <th className={`${TH} w-10`} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">
                    No content found. {canManage && 'Use “Add New” to create your first item.'}
                  </td>
                </tr>
              )}

              {items.map((item) => {
                const meta = TYPE_META[item.type];
                const expanded = expandedId === item.id;
                return (
                  <RowFragment
                    key={item.id}
                    item={item}
                    expanded={expanded}
                    detail={detail[item.id]}
                    detailLoading={detailLoading && expanded && !detail[item.id]}
                    canManage={canManage}
                    workspaceId={workspaceId}
                    statusMenuOpen={openMenu === `status:${item.id}`}
                    onToggleStatusMenu={() =>
                      setOpenMenu(openMenu === `status:${item.id}` ? null : `status:${item.id}`)
                    }
                    onCloseMenu={() => setOpenMenu(null)}
                    onChangeStatus={(s) => changeStatus(item.id, s)}
                    onToggle={() => toggleExpand(item.id)}
                    onEdit={(d) => setModal({ mode: 'edit', item: d })}
                    meta={meta}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {loading ? (
              <span className="inline-flex items-center gap-1.5 text-gray-400">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </span>
            ) : (
              <>Showing {from} to {to} of {total} items</>
            )}
          </span>

          <div className="flex items-center gap-1">
            <PageButton disabled={data.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </PageButton>
            {pageNumbers(data.page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <PageButton key={p} active={p === data.page} onClick={() => setPage(p as number)}>
                  {p}
                </PageButton>
              ),
            )}
            <PageButton disabled={data.page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </PageButton>
          </div>

          <div className="flex items-center gap-2">
            <span>Items per page:</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="appearance-none rounded-md border border-gray-200 pl-2 pr-6 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Create / edit modal */}
      {modal && (
        <ContentFormModal
          workspaceId={workspaceId}
          mode={modal.mode}
          type={modal.mode === 'create' ? modal.type : modal.item.type}
          item={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ row */

function RowFragment({
  item, expanded, detail, detailLoading, canManage, workspaceId,
  statusMenuOpen, onToggleStatusMenu, onCloseMenu, onChangeStatus,
  onToggle, onEdit, meta,
}: {
  item: ContentItemSummary;
  expanded: boolean;
  detail?: ContentItemDetail;
  detailLoading: boolean;
  canManage: boolean;
  workspaceId: string;
  statusMenuOpen: boolean;
  onToggleStatusMenu: () => void;
  onCloseMenu: () => void;
  onChangeStatus: (s: ContentStatus) => void;
  onToggle: () => void;
  onEdit: (d: ContentItemDetail) => void;
  meta: (typeof TYPE_META)[ContentType];
}) {
  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${expanded ? 'bg-gray-50/60' : ''}`}>
        <td className={`${TD} cursor-pointer`} onClick={onToggle}>
          <div className="flex items-center gap-2.5">
            <TypeIcon type={item.type} iconColor={meta.iconColor} iconBg={meta.iconBg} />
            <span className={`font-medium ${expanded ? 'text-teal-700' : 'text-gray-900'}`}>{item.title}</span>
          </div>
        </td>
        <td className={`${TD} text-gray-500`}>{meta.label}</td>
        <td className={TD}>
          {item.category ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
              {item.category}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className={`${TD} text-gray-500`}>{estTimeLabel(item)}</td>
        <td className={`${TD} text-gray-500 whitespace-nowrap`}>{usedInLabel(item.usedInCount)}</td>
        <td className={TD}>
          <StatusControl
            status={item.status}
            canManage={canManage}
            open={statusMenuOpen}
            onToggle={onToggleStatusMenu}
            onClose={onCloseMenu}
            onChange={onChangeStatus}
          />
        </td>
        <td className={`${TD} text-gray-400 whitespace-nowrap`}>{timeAgo(item.updatedAt)}</td>
        <td className={`${TD} text-right`}>
          <button
            type="button"
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-gray-50/60 px-4 pb-6 pt-1">
            {detailLoading || !detail ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
                <Loader2 size={14} className="animate-spin" /> Loading details…
              </div>
            ) : (
              <ContentRowDetail
                detail={detail}
                workspaceId={workspaceId}
                canManage={canManage}
                onEdit={() => onEdit(detail)}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function StatusControl({
  status, canManage, open, onToggle, onClose, onChange,
}: {
  status: ContentStatus;
  canManage: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (s: ContentStatus) => void;
}) {
  const meta = STATUS_META[status];
  if (!canManage) {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls}`}>
        {meta.label}
      </span>
    );
  }
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls} hover:opacity-80 cursor-pointer`}
      >
        {meta.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
          <div className="absolute left-0 mt-1 z-50 w-36 rounded-lg border border-gray-100 bg-white p-1 shadow-xl">
            {(['active', 'draft', 'archive'] as ContentStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${STATUS_META[s].cls}`}>
                  {STATUS_META[s].label}
                </span>
                {s === status && <Check size={13} className="text-teal-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ small ui */

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mr-1">
        {label}
      </span>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
        active ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function PageButton({
  children, active, disabled, onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-w-7 h-7 px-2 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-teal-600 text-white'
          : 'text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer'
      }`}
    >
      {children}
    </button>
  );
}

/** Compact page list: 1 … p-1 p p+1 … N */
function pageNumbers(current: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

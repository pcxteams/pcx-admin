'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Search, ChevronDown, ChevronUp, Loader2, Building2, Users, Globe2,
} from 'lucide-react';
import {
  CONTENT_CATEGORIES, CONTENT_TYPES, TYPE_META, STATUS_META,
  estTimeLabel, timeAgo,
  type MasterContentListResponse, type MasterContentItemSummary, type ContentItemDetail,
  type ContentType, type ContentSort,
} from '@/lib/content';
import { TypeIcon } from '@/app/(app)/workspaces/[workspaceId]/content-manager/content-icons';
import ContentRowDetail from '@/app/(app)/workspaces/[workspaceId]/content-manager/ContentRowDetail';
import MasterContentFormModal from './MasterContentFormModal';

interface Workspace {
  id: string;
  name: string;
  type: 'office' | 'team';
}

const TH = 'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';
const PAGE_SIZES = [10, 25, 50, 100];

const SORT_OPTIONS: { value: ContentSort; label: string }[] = [
  { value: 'recently_updated', label: 'Recently Updated' },
  { value: 'recently_created', label: 'Recently Added' },
  { value: 'title', label: 'Title (A–Z)' },
];

const EMPTY: MasterContentListResponse = { items: [], total: 0, page: 1, pageSize: 25 };

/**
 * PCx Platform > Content Library — browses master content across every
 * scope (single/subset/global) via GET /master/content, mirroring Content
 * Manager's list-plus-modal pattern. Creation and editing both live in
 * MasterContentFormModal ("Add Content" above the table, "Edit" inside a
 * row's expanded detail) — scope and Type are fixed once created, everything
 * else can be edited, including Status (the concrete case that motivated
 * adding this at all: Draft had no way to become Active).
 */
export default function MasterContentView({ workspaces }: { workspaces: Workspace[] }) {
  const [data, setData] = useState<MasterContentListResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<{
    summary: MasterContentItemSummary;
    detail: ContentItemDetail;
    workspaceId: string;
  } | null>(null);

  const workspaceName = (id: string) => workspaces.find((w) => w.id === id)?.name ?? 'Unknown workspace';

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
        const res = await fetch(`/api/master/content?${qs.toString()}`, {
          credentials: 'include',
          signal,
        });
        if (!res.ok) {
          setError('Failed to load content. Please try again.');
          return;
        }
        setData((await res.json()) as MasterContentListResponse);
      } catch {
        if (!signal.aborted) setError('Network error. Please check your connection.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [typeFilter, categoryFilter, debouncedSearch, sort, page, pageSize],
  );

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

  /** Any workspace this item is actually visible in, to call the existing
   * workspace-scoped detail/download-url routes through — those routes need
   * a workspaceId in the path even though the item itself may not belong to
   * just one. Single -> its own workspace. Subset -> the first target.
   * Global -> any workspace at all, since it's visible everywhere. */
  function resolveWorkspaceIdFor(item: MasterContentItemSummary): string | null {
    if (item.scope === 'single') return item.workspaceId;
    if (item.scope === 'subset') return item.workspaceIds[0] ?? null;
    return workspaces[0]?.id ?? null;
  }

  async function fetchDetail(item: MasterContentItemSummary) {
    const wsId = resolveWorkspaceIdFor(item);
    if (!wsId) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${wsId}/content/${item.id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = (await res.json()) as ContentItemDetail;
        setDetail((d) => ({ ...d, [item.id]: json }));
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleExpand(item: MasterContentItemSummary) {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    if (!detail[item.id]) void fetchDetail(item);
  }

  /* ---------------------------------------------------------- derived */

  const items = data.items;
  const total = data.total;
  const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
  const from = total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(total, data.page * data.pageSize);

  /* ---------------------------------------------------------- render */

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Content Library</h1>
          <p className="text-sm text-gray-400 mt-1">
            Master content for one workspace, a subset, or every workspace at once.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
        >
          <Plus size={15} />
          Add Content
        </button>
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
                <th className={TH}>Scope</th>
                <th className={TH}>Est. Time</th>
                <th className={TH}>Status</th>
                <th className={TH}>Last Updated</th>
                <th className={`${TH} w-10`} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">
                    No master content found. Use “Add Content” to create your first item.
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
                    workspaceName={workspaceName}
                    resolvedWorkspaceId={resolveWorkspaceIdFor(item)}
                    onToggle={() => toggleExpand(item)}
                    onEdit={(summary, itemDetail, wsId) => setEditing({ summary, detail: itemDetail, workspaceId: wsId })}
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

      {/* Create modal */}
      {showCreateModal && (
        <MasterContentFormModal
          workspaces={workspaces}
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            reload();
          }}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <MasterContentFormModal
          workspaces={workspaces}
          mode="edit"
          summary={editing.summary}
          item={editing.detail}
          patchWorkspaceId={editing.workspaceId}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setDetail((d) => ({ ...d, [saved.id]: saved }));
            reload();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ scope badge */

function ScopeBadge({ item, workspaceName }: { item: MasterContentItemSummary; workspaceName: (id: string) => string }) {
  if (item.scope === 'global') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
        <Globe2 size={12} className="text-teal-600" /> All workspaces
      </span>
    );
  }
  if (item.scope === 'subset') {
    const names = item.workspaceIds.map(workspaceName).join(', ');
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-600" title={names}>
        <Users size={12} className="text-teal-600" /> {item.workspaceIds.length} workspaces
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
      <Building2 size={12} className="text-teal-600" />
      {item.workspaceId ? workspaceName(item.workspaceId) : 'Unknown'}
    </span>
  );
}

/* ------------------------------------------------------------ row */

function RowFragment({
  item, expanded, detail, detailLoading, workspaceName, resolvedWorkspaceId, onToggle, onEdit, meta,
}: {
  item: MasterContentItemSummary;
  expanded: boolean;
  detail?: ContentItemDetail;
  detailLoading: boolean;
  workspaceName: (id: string) => string;
  resolvedWorkspaceId: string | null;
  onToggle: () => void;
  onEdit: (item: MasterContentItemSummary, detail: ContentItemDetail, workspaceId: string) => void;
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
        <td className={TD}>
          <ScopeBadge item={item} workspaceName={workspaceName} />
        </td>
        <td className={`${TD} text-gray-500`}>{estTimeLabel(item)}</td>
        <td className={TD}>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_META[item.status].cls}`}>
            {STATUS_META[item.status].label}
          </span>
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
            ) : resolvedWorkspaceId ? (
              <ContentRowDetail
                detail={detail}
                workspaceId={resolvedWorkspaceId}
                canManage
                onEdit={() => onEdit(item, detail, resolvedWorkspaceId)}
              />
            ) : (
              <p className="text-sm text-gray-400 py-6">
                No workspace available to preview this item through.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
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

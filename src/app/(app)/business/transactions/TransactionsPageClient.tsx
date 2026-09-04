'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Plus,
  Receipt,
} from 'lucide-react';
import { exportToCsv } from '@/lib/exportCsv';
import { fetchTransactions, type TransactionsQuery } from '@/lib/transactions';
import CustomizeColumnsModal from './CustomizeColumnsModal';
import DeleteTransactionDialog from './DeleteTransactionDialog';
import StatsCards from './StatsCards';
import TransactionFormModal from './TransactionFormModal';
import TransactionsFilters, { type TransactionFilters } from './TransactionsFilters';
import TransactionsTable, { type SortState } from './TransactionsTable';
import { buildColumns, DEFAULT_COLUMN_ORDER, type TransactionColumn } from './columns';
import { DEFAULT_DATE_PRESET, presetRange } from './date-presets';
import { useColumnPreferences } from './useColumnPreferences';
import type { TransactionItem, TransactionsListResponse } from './types';

const PER_PAGE_OPTIONS = [25, 50, 100];
/** Export walks pages of 200; enough for a year of a large office, bounded so
 *  a stray filter can't pull the whole platform into the browser. */
const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_PAGES = 10;

interface Props {
  initialData: TransactionsListResponse;
  initialRange: { start: string; end: string };
}

function pageWindow(current: number, totalPages: number, size = 7): number[] {
  if (totalPages <= size) return Array.from({ length: totalPages }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(totalPages, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Business > Transactions — the v2 Numbers page ported to v3. Filtering,
 * sorting and pagination are all server-side (v2 loaded every transaction
 * and filtered in the browser, which doesn't survive a real ledger), so
 * every control here re-queries `/api/transactions`.
 */
export default function TransactionsPageClient({ initialData, initialRange }: Props) {
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    status: 'all',
    transactionType: 'all',
    source: 'all',
    workspaceId: '',
    workspaceLabel: '',
    leaderUserId: '',
    leaderLabel: '',
    datePreset: DEFAULT_DATE_PRESET,
    dateStart: initialRange.start,
    dateEnd: initialRange.end,
  });
  const [sort, setSort] = useState<SortState>({ field: null, direction: 'asc' });
  const [page, setPage] = useState(initialData.page);
  const [perPage, setPerPage] = useState(initialData.perPage);

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TransactionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionItem | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const { order, hidden, updateOrder, toggleColumn, reset } =
    useColumnPreferences(DEFAULT_COLUMN_ORDER);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const query = useMemo<TransactionsQuery>(
    () => ({
      search: filters.search.trim() || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      transactionType: filters.transactionType !== 'all' ? filters.transactionType : undefined,
      source: filters.source !== 'all' ? filters.source : undefined,
      workspaceId: filters.workspaceId || undefined,
      leaderUserId: filters.leaderUserId || undefined,
      dateStart: filters.dateStart || undefined,
      dateEnd: filters.dateEnd || undefined,
      sort: sort.field ?? undefined,
      direction: sort.field ? sort.direction : undefined,
    }),
    [filters, sort],
  );

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const json = await fetchTransactions({ ...query, page, perPage }, controller.signal);
      if (json === null) {
        setError('Something went wrong loading transactions. Please try again.');
        return;
      }
      setData(json);
    } catch (err) {
      // An aborted request means a newer one is already in flight.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [query, page, perPage]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [load]);

  function patchFilters(patch: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function applyPreset(preset: string) {
    const range = presetRange(preset);
    // "Custom" keeps whatever dates are already in the two inputs.
    patchFilters(
      preset === 'custom'
        ? { datePreset: preset }
        : { datePreset: preset, dateStart: range.start, dateEnd: range.end },
    );
  }

  const columns = useMemo(
    () =>
      buildColumns({
        canWrite: data.canWrite,
        onEdit: setEditTarget,
        onDelete: setDeleteTarget,
      }),
    [data.canWrite],
  );

  const orderedColumns = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    return order
      .map((id) => byId.get(id))
      .filter((c): c is TransactionColumn => c !== undefined);
  }, [columns, order]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => !hidden.includes(c.id)),
    [orderedColumns, hidden],
  );

  async function handleExport() {
    setExporting(true);
    setExportNotice(null);
    try {
      const rows: TransactionItem[] = [];
      let total = 0;
      for (let p = 1; p <= EXPORT_MAX_PAGES; p++) {
        const json = await fetchTransactions({ ...query, page: p, perPage: EXPORT_PAGE_SIZE });
        if (json === null) {
          setExportNotice('Export failed. Please try again.');
          return;
        }
        total = json.total;
        rows.push(...json.items);
        if (rows.length >= json.total) break;
      }
      if (rows.length < total) {
        // Silently handing back a short file would have people reconciling
        // commissions against a truncated ledger.
        setExportNotice(
          `Exported the first ${rows.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} rows. Narrow the filters to export the rest.`,
        );
      }
      exportToCsv(
        rows,
        // Whatever is on screen, minus the actions column, in the same order.
        visibleColumns
          .filter((c) => c.id !== 'actions')
          .map((c) => ({ header: c.header, value: c.csv })),
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch {
      setExportNotice('Export failed. Please check your connection and try again.');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(Math.ceil(data.total / data.perPage), 1);
  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.perPage + 1;
  const rangeEnd = Math.min(data.page * data.perPage, data.total);
  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.status !== 'all' ||
    filters.transactionType !== 'all' ||
    filters.source !== 'all' ||
    Boolean(filters.workspaceId) ||
    Boolean(filters.leaderUserId) ||
    // The default window is a preset, not "no filter" — comparing against
    // 'all' made a brand-new workspace with no rows read as over-filtered.
    // Custom dates always set datePreset to 'custom' (TransactionsFilters).
    filters.datePreset !== DEFAULT_DATE_PRESET;

  function clearFilters() {
    setFilters({
      search: '',
      status: 'all',
      transactionType: 'all',
      source: 'all',
      workspaceId: '',
      workspaceLabel: '',
      leaderUserId: '',
      leaderLabel: '',
      datePreset: 'all',
      dateStart: '',
      dateEnd: '',
    });
    setPage(1);
  }

  return (
    <>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.total.toLocaleString('en-US')}{' '}
            {data.total === 1 ? 'transaction' : 'transactions'} in the selected period.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || data.total === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Export Table'}
          </button>
          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <Columns3 size={14} />
            Customize Columns
          </button>
          {data.canWrite && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Add Transaction
            </button>
          )}
        </div>
      </div>

      <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <StatsCards summary={data.summary} />
      </div>

      <TransactionsFilters filters={filters} onChange={patchFilters} onPresetChange={applyPreset} />

      {exportNotice && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {exportNotice}
        </div>
      )}

      <div className="mt-4">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50 py-16 text-center">
            <AlertTriangle size={22} className="text-red-500" />
            <p className="text-sm text-gray-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 py-16 text-center">
            <Receipt size={22} className="text-gray-300" />
            {hasActiveFilters ? (
              <>
                <p className="text-sm text-gray-600">No transactions match your filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-teal-700 hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-600">No transactions yet.</p>
            )}
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <TransactionsTable
              items={data.items}
              columns={visibleColumns}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {!error && data.total > 0 && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <p className="text-sm text-gray-400">
            Showing {rangeStart} to {rangeEnd} of {data.total} transactions
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
              aria-label="Rows per page"
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

      {customizeOpen && (
        <CustomizeColumnsModal
          columns={orderedColumns}
          hidden={hidden}
          onOrderChange={updateOrder}
          onToggle={toggleColumn}
          onReset={reset}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
      {addOpen && (
        <TransactionFormModal
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            void load();
          }}
        />
      )}
      {editTarget && (
        <TransactionFormModal
          transaction={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            void load();
          }}
        />
      )}
      {deleteTarget && (
        <DeleteTransactionDialog
          transaction={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            if (data.items.length === 1 && page > 1) {
              // Last row on this page: stepping back re-queries via `load`.
              setPage((p) => p - 1);
            } else {
              void load();
            }
          }}
        />
      )}
    </>
  );
}

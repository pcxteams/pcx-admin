'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { TransactionColumn } from './columns';
import type { TransactionItem } from './types';

export interface SortState {
  field: string | null;
  direction: 'asc' | 'desc';
}

interface Props {
  items: TransactionItem[];
  columns: TransactionColumn[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

const TH =
  'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap bg-gray-50';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle whitespace-nowrap';

/** Sticky offsets keep the pinned cells above the ones they scroll over. */
function pinnedClasses(pinned: TransactionColumn['pinned'], isHeader: boolean): string {
  if (!pinned) return '';
  const base = isHeader ? 'sticky z-30' : 'sticky z-20 bg-white group-hover:bg-gray-50';
  return pinned === 'left'
    ? `${base} left-0 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`
    : `${base} right-0 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]`;
}

/**
 * The transactions grid. Sorting is server-side (the API only ever returns
 * one page), so a header click swaps the sort key rather than reordering the
 * rows in place; columns without a `sortKey` render as plain labels.
 */
export default function TransactionsTable({ items, columns, sort, onSortChange }: Props) {
  function toggleSort(column: TransactionColumn) {
    if (!column.sortKey) return;
    if (sort.field !== column.sortKey) {
      onSortChange({ field: column.sortKey, direction: 'asc' });
    } else if (sort.direction === 'asc') {
      onSortChange({ field: column.sortKey, direction: 'desc' });
    } else {
      // Third click clears back to the API's default ordering.
      onSortChange({ field: null, direction: 'asc' });
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((column) => {
              const active = Boolean(column.sortKey) && sort.field === column.sortKey;
              return (
                <th
                  key={column.id}
                  scope="col"
                  // The arrow glyph is the only sort cue otherwise, and it is
                  // purely visual.
                  aria-sort={
                    active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  style={{ minWidth: column.width }}
                  className={`${TH} ${column.align === 'right' ? 'text-right' : ''} ${pinnedClasses(column.pinned, true)}`}
                >
                  {column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className={`inline-flex items-center gap-1 uppercase tracking-widest cursor-pointer transition-colors ${
                        active ? 'text-gray-700' : 'hover:text-gray-600'
                      } ${column.align === 'right' ? 'flex-row-reverse' : ''}`}
                    >
                      {column.header}
                      {active ? (
                        sort.direction === 'asc' ? (
                          <ArrowUp size={11} />
                        ) : (
                          <ArrowDown size={11} />
                        )
                      ) : (
                        <ChevronsUpDown size={11} className="text-gray-300" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr
              key={row.id}
              className="group border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  style={{ minWidth: column.width }}
                  className={`${TD} ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${pinnedClasses(column.pinned, false)}`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

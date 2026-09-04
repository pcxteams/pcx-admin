import type { ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import RowActions from './RowActions';
import {
  DASH,
  STATUS_META,
  SOURCE_LABELS,
  TYPE_LABELS,
  fmtDate,
  fmtUsd,
  statusLabel,
  type TransactionItem,
} from './types';

export interface TransactionColumn {
  id: string;
  header: string;
  /** Minimum width in px — the table is horizontally scrollable, not squeezed. */
  width: number;
  /** Server-side sort key; omitted for columns the API can't order by. */
  sortKey?: string;
  align?: 'right';
  /** Pinned columns are always visible and never reordered (see the
   *  Customize Columns modal). */
  pinned?: 'left' | 'right';
  cell: (row: TransactionItem) => ReactNode;
  /** Value used for the CSV export; null renders as an empty cell. */
  csv: (row: TransactionItem) => string | number | boolean | null;
}

interface BuildOptions {
  canWrite: boolean;
  onEdit: (row: TransactionItem) => void;
  onDelete: (row: TransactionItem) => void;
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status];
  if (!meta) return <span className="text-gray-400">{status}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/** Payment Received / DA Uploaded read as a state, not a raw boolean. */
function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
      <Check size={13} />
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
      <Minus size={13} />
      No
    </span>
  );
}

function Muted({ value }: { value: string | null }) {
  return value ? <>{value}</> : <span className="text-gray-300">{DASH}</span>;
}

const FLAG_BADGES: Record<string, { label: string; cls: string }> = {
  suspected_duplicate: { label: 'Possible duplicate', cls: 'bg-amber-50 text-amber-700' },
  manual_override: { label: 'Manual override', cls: 'bg-purple-50 text-purple-700' },
  csv: { label: 'CSV import', cls: 'bg-gray-100 text-gray-600' },
  ai: { label: 'AI import', cls: 'bg-blue-50 text-blue-600' },
  api: { label: 'API import', cls: 'bg-gray-100 text-gray-600' },
};

/** Notes text plus the row's data-quality flags, which share one column. */
function NotesAndFlags({ row }: { row: TransactionItem }) {
  const flags: string[] = [];
  if (row.duplicateStatus === 'suspected_duplicate') flags.push('suspected_duplicate');
  if (row.isManualOverride) flags.push('manual_override');
  if (row.importSource !== 'manual') flags.push(row.importSource);

  if (!row.notes && flags.length === 0) return <span className="text-gray-300">{DASH}</span>;

  return (
    <div className="flex flex-col gap-1 max-w-[260px]">
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map((flag) => {
            const badge = FLAG_BADGES[flag] ?? { label: flag, cls: 'bg-gray-100 text-gray-600' };
            return (
              <span
                key={flag}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.cls}`}
              >
                {badge.label}
              </span>
            );
          })}
        </div>
      )}
      {row.notes && (
        <span className="text-gray-500 truncate" title={row.notes}>
          {row.notes}
        </span>
      )}
    </div>
  );
}

function flagsCsv(row: TransactionItem): string {
  const parts: string[] = [];
  if (row.duplicateStatus === 'suspected_duplicate') parts.push('Possible duplicate');
  if (row.isManualOverride) parts.push('Manual override');
  if (row.importSource !== 'manual') parts.push(`${row.importSource.toUpperCase()} import`);
  if (row.notes) parts.push(row.notes);
  return parts.join(' · ');
}

/**
 * The 27 columns of the Transactions table, in their default order. Every
 * column carries both its cell renderer and its CSV projection so Export
 * Table can never drift from what's on screen.
 *
 * Agent Name is pinned left and Actions pinned right — with this many
 * columns the table always scrolls horizontally, and losing the row's
 * identity (or its menu) while scrolling makes it unreadable.
 */
export function buildColumns({ canWrite, onEdit, onDelete }: BuildOptions): TransactionColumn[] {
  return [
    {
      id: 'agentName',
      header: 'Agent Name',
      width: 190,
      sortKey: 'agentName',
      pinned: 'left',
      cell: (row) => <span className="font-medium text-gray-900">{row.agentName}</span>,
      csv: (row) => row.agentName,
    },
    {
      id: 'status',
      header: 'Status',
      width: 150,
      sortKey: 'status',
      cell: (row) => <StatusBadge status={row.status} />,
      csv: (row) => statusLabel(row.status),
    },
    {
      id: 'clientName',
      header: 'Client Name',
      width: 170,
      sortKey: 'clientName',
      cell: (row) => row.clientName,
      csv: (row) => row.clientName,
    },
    {
      id: 'propertyAddress',
      header: 'Property Address',
      width: 210,
      sortKey: 'propertyAddress',
      cell: (row) => row.propertyAddress,
      csv: (row) => row.propertyAddress,
    },
    {
      id: 'city',
      header: 'City',
      width: 120,
      sortKey: 'city',
      cell: (row) => row.city,
      csv: (row) => row.city,
    },
    {
      id: 'transactionType',
      header: 'Type',
      width: 120,
      sortKey: 'transactionType',
      cell: (row) => TYPE_LABELS[row.transactionType] ?? row.transactionType,
      csv: (row) => TYPE_LABELS[row.transactionType] ?? row.transactionType,
    },
    {
      id: 'source',
      header: 'Lead Source',
      width: 140,
      sortKey: 'source',
      cell: (row) => <Muted value={row.source ? (SOURCE_LABELS[row.source] ?? row.source) : null} />,
      csv: (row) => (row.source ? (SOURCE_LABELS[row.source] ?? row.source) : null),
    },
    {
      id: 'closeDate',
      header: 'Close Date',
      width: 130,
      sortKey: 'closeDate',
      cell: (row) => <span className="text-gray-500">{fmtDate(row.closeDate)}</span>,
      csv: (row) => row.closeDate,
    },
    {
      id: 'daysToClose',
      header: 'Days to Close',
      width: 120,
      align: 'right',
      cell: (row) =>
        row.daysToClose === null ? <span className="text-gray-300">{DASH}</span> : row.daysToClose,
      csv: (row) => row.daysToClose,
    },
    {
      id: 'volume',
      header: 'Sale Price / Volume',
      width: 165,
      sortKey: 'volume',
      align: 'right',
      cell: (row) => <span className="font-medium text-gray-900">{fmtUsd(row.volume)}</span>,
      csv: (row) => row.volume,
    },
    {
      id: 'gci',
      header: 'GCI',
      width: 120,
      sortKey: 'gci',
      align: 'right',
      cell: (row) => fmtUsd(row.gci),
      csv: (row) => row.gci,
    },
    {
      id: 'companyDollar',
      header: 'Company Dollar',
      width: 145,
      sortKey: 'companyDollar',
      align: 'right',
      cell: (row) => fmtUsd(row.companyDollar),
      csv: (row) => row.companyDollar,
    },
    {
      id: 'agentCommission',
      header: 'Agent Commission',
      width: 160,
      sortKey: 'agentCommission',
      align: 'right',
      cell: (row) => fmtUsd(row.agentCommission),
      csv: (row) => row.agentCommission,
    },
    {
      id: 'referralAmount',
      header: 'Referral Amount',
      width: 150,
      sortKey: 'referralAmount',
      align: 'right',
      cell: (row) =>
        row.referralAmount === null ? (
          <span className="text-gray-300">{DASH}</span>
        ) : (
          fmtUsd(row.referralAmount)
        ),
      csv: (row) => row.referralAmount,
    },
    {
      id: 'commissionSplit',
      header: 'Commission Split %',
      width: 160,
      sortKey: 'commissionSplit',
      align: 'right',
      cell: (row) =>
        row.commissionSplit === null ? (
          <span className="text-gray-300">{DASH}</span>
        ) : (
          `${row.commissionSplit}%`
        ),
      csv: (row) => row.commissionSplit,
    },
    {
      id: 'transactionCoordinator',
      header: 'Transaction Coordinator',
      width: 190,
      cell: (row) => <Muted value={row.transactionCoordinator} />,
      csv: (row) => row.transactionCoordinator,
    },
    {
      id: 'lender',
      header: 'Lender',
      width: 170,
      cell: (row) => <Muted value={row.lender} />,
      csv: (row) => row.lender,
    },
    {
      id: 'titleCompany',
      header: 'Title Company',
      width: 170,
      cell: (row) => <Muted value={row.titleCompany} />,
      csv: (row) => row.titleCompany,
    },
    {
      id: 'paymentReceived',
      header: 'Payment Received',
      width: 155,
      cell: (row) => <YesNo value={row.paymentReceived} />,
      csv: (row) => (row.paymentReceived ? 'Yes' : 'No'),
    },
    {
      id: 'daUploaded',
      header: 'DA Uploaded',
      width: 135,
      cell: (row) => <YesNo value={row.daUploaded} />,
      csv: (row) => (row.daUploaded ? 'Yes' : 'No'),
    },
    {
      id: 'assignedLeader',
      header: 'Assigned Leader/Team',
      width: 190,
      cell: (row) => {
        if (!row.assignedLeaderName && !row.teamName) {
          return <span className="text-gray-300">{DASH}</span>;
        }
        return (
          <div className="flex flex-col leading-tight">
            <span>{row.assignedLeaderName ?? DASH}</span>
            {row.teamName && <span className="text-xs text-gray-400">{row.teamName}</span>}
          </div>
        );
      },
      csv: (row) => [row.assignedLeaderName, row.teamName].filter(Boolean).join(' · ') || null,
    },
    {
      id: 'office',
      header: 'Office',
      width: 170,
      cell: (row) => <Muted value={row.officeName} />,
      csv: (row) => row.officeName,
    },
    {
      id: 'workspace',
      header: 'Workspace',
      width: 190,
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.workspaceName}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase">
            {row.workspaceType}
          </span>
        </span>
      ),
      csv: (row) => `${row.workspaceName} (${row.workspaceType})`,
    },
    {
      id: 'createdBy',
      header: 'Created By',
      width: 160,
      cell: (row) => <Muted value={row.createdByName} />,
      csv: (row) => row.createdByName,
    },
    {
      id: 'updatedAt',
      header: 'Last Updated',
      width: 140,
      sortKey: 'updatedAt',
      cell: (row) => <span className="text-gray-500">{fmtDate(row.updatedAt)}</span>,
      csv: (row) => row.updatedAt,
    },
    {
      id: 'notes',
      header: 'Notes / Flags',
      width: 260,
      cell: (row) => <NotesAndFlags row={row} />,
      csv: (row) => flagsCsv(row) || null,
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 90,
      pinned: 'right',
      cell: (row) =>
        canWrite ? (
          <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
        ) : (
          <span className="text-gray-300">{DASH}</span>
        ),
      csv: () => null,
    },
  ];
}

/** Default order = declaration order; also the id list the modal restores to. */
export const DEFAULT_COLUMN_ORDER = buildColumns({
  canWrite: false,
  onEdit: () => {},
  onDelete: () => {},
}).map((c) => c.id);

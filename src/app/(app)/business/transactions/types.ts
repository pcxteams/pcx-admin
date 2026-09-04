/**
 * Mirrors TransactionsListItem / TransactionsListResponse in the API
 * (pcx-api-v2-new/src/transaction/transaction.service.ts) — keep the two in
 * sync when a column is added.
 */
export interface TransactionItem {
  id: string;
  agentUserId: string;
  agentName: string;
  status: string;
  clientName: string;
  propertyAddress: string;
  city: string;
  transactionType: string;
  source: string | null;
  closeDate: string | null;
  daysToClose: number | null;
  volume: number;
  gci: number;
  companyDollar: number;
  agentCommission: number;
  referralAmount: number | null;
  commissionSplit: number | null;
  transactionCoordinator: string | null;
  lender: string | null;
  titleCompany: string | null;
  paymentReceived: boolean;
  daUploaded: boolean;
  assignedLeaderUserId: string | null;
  assignedLeaderName: string | null;
  teamName: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'office' | 'team';
  officeId: string | null;
  officeName: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  notes: string | null;
  duplicateStatus: string;
  importSource: string;
  isManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsSummary {
  units: number;
  volume: number;
  gci: number;
  companyDollar: number;
}

export interface TransactionsListResponse {
  items: TransactionItem[];
  total: number;
  page: number;
  perPage: number;
  /** Totals over the filtered set, so the stat cards follow the filter bar. */
  summary: TransactionsSummary;
  /** False for Agents and Limited Leaders — the page hides every write action. */
  canWrite: boolean;
}

export const DASH = '—';

export const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  signed_client: { label: 'Signed Client', cls: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  active: { label: 'Active', cls: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  closed: { label: 'Closed', cls: 'bg-green-50 text-green-600', dot: 'bg-green-500' },
  canceled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-600', dot: 'bg-rose-500' },
  appointment_held: { label: 'Appointment Held', cls: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' },
};

export const TYPE_LABELS: Record<string, string> = {
  buyer: 'Buyer',
  listing: 'Listing',
  rental_lease: 'Rental/Lease',
  referral: 'Referral',
};

export const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  zillow: 'Zillow',
  open_house: 'Open House',
  facebook_ads: 'Facebook Ads',
  past_client: 'Past Client',
  website: 'Website',
  walk_in: 'Walk-in',
  cold_call: 'Cold Call',
  agent_referral: 'Agent Referral',
};

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

/** Compact money for the stat cards ($1.2M / $18.5K). */
export function fmtCompactUsd(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Full money for table cells. */
export function fmtUsd(value: number | null): string {
  if (value === null) return DASH;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function fmtDate(value: string | null): string {
  if (!value) return DASH;
  const date = new Date(value.length > 10 ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

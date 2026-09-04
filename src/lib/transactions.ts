import type { AsyncOption } from '@/components/AsyncSearchableSelect';
import type { TransactionsListResponse } from '@/app/(app)/business/transactions/types';

export interface TransactionsQuery {
  search?: string;
  status?: string;
  transactionType?: string;
  source?: string;
  workspaceId?: string;
  leaderUserId?: string;
  agentUserId?: string;
  dateStart?: string;
  dateEnd?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export type MutationResult = { ok: true } | { ok: false; message: string };

const NETWORK_ERROR = 'Network error. Please check your connection and try again.';

function toParams(query: TransactionsQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return params;
}

export function transactionsQueryString(query: TransactionsQuery): string {
  return toParams(query).toString();
}

export async function fetchTransactions(
  query: TransactionsQuery,
  signal?: AbortSignal,
): Promise<TransactionsListResponse | null> {
  const res = await fetch(`/api/transactions?${transactionsQueryString(query)}`, {
    credentials: 'include',
    signal,
  });
  // An expired session isn't retryable: the guard answers 401 and a full page
  // load would already have been redirected by page.tsx.
  if (res.status === 401) {
    window.location.href = '/login';
    return null;
  }
  if (!res.ok) return null;
  return (await res.json()) as TransactionsListResponse;
}

/** Shared by create/update/delete: unwrap the API's `message` on failure. */
async function mutate(path: string, method: string, body?: unknown): Promise<MutationResult> {
  try {
    const res = await fetch(path, {
      method,
      credentials: 'include',
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
      return { ok: false, message: message ?? 'Something went wrong. Please try again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

export interface TransactionPayload {
  agentUserId?: string;
  workspaceId?: string;
  status?: string;
  transactionType?: string;
  source?: string | null;
  clientName?: string;
  propertyAddress?: string;
  city?: string;
  closeDate?: string | null;
  volume?: number;
  gci?: number;
  companyDollar?: number;
  agentCommission?: number;
  referralAmount?: number | null;
  commissionSplit?: number | null;
  transactionCoordinator?: string | null;
  lender?: string | null;
  titleCompany?: string | null;
  paymentReceived?: boolean;
  daUploaded?: boolean;
  notes?: string | null;
}

export function createTransaction(payload: TransactionPayload): Promise<MutationResult> {
  return mutate('/api/transactions', 'POST', payload);
}

export function updateTransaction(id: string, payload: TransactionPayload): Promise<MutationResult> {
  return mutate(`/api/transactions/${id}`, 'PATCH', payload);
}

export function deleteTransaction(id: string): Promise<MutationResult> {
  return mutate(`/api/transactions/${id}`, 'DELETE');
}

interface UserOptionRow {
  id: string;
  name: string;
  email: string;
}

async function fetchUserOptions(role: string, query: string, workspaceId?: string): Promise<AsyncOption[]> {
  const params = new URLSearchParams({ role, perPage: '25' });
  if (query.trim()) params.set('search', query.trim());
  if (workspaceId) params.set('workspaceId', workspaceId);
  try {
    const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: UserOptionRow[] };
    return data.items.map((u) => ({ id: u.id, label: `${u.name} (${u.email})` }));
  } catch {
    return [];
  }
}

/** Agent picker for the Add/Edit form — scoped server-side to the caller. */
export function fetchAgentOptions(query: string): Promise<AsyncOption[]> {
  return fetchUserOptions('agent', query);
}

/** Leader filter. Managers coach agents too, so both roles are offered. */
export async function fetchLeaderFilterOptions(query: string): Promise<AsyncOption[]> {
  const [leaders, managers] = await Promise.all([
    fetchUserOptions('leader', query),
    fetchUserOptions('manager', query),
  ]);
  return [...leaders, ...managers];
}

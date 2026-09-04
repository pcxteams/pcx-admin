import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import TransactionsPageClient from './TransactionsPageClient';
import { DEFAULT_DATE_PRESET, presetRange } from './date-presets';
import type { TransactionsListResponse } from './types';

export default async function TransactionsPage() {
  // The default period is resolved here as well as in the client so the first
  // paint already shows the YTD window the filter bar reports — otherwise the
  // server would render every transaction and the client would immediately
  // narrow it.
  const range = presetRange(DEFAULT_DATE_PRESET);
  const params = new URLSearchParams({ page: '1', perPage: '25' });
  if (range.start) params.set('dateStart', range.start);
  if (range.end) params.set('dateEnd', range.end);

  const [session, initialData] = await Promise.all([
    getSession(),
    apiGet<TransactionsListResponse>(`/transactions?${params.toString()}`),
  ]);
  if (!session) redirect('/login');

  return (
    <div className="p-8">
      {initialData ? (
        <TransactionsPageClient initialData={initialData} initialRange={range} />
      ) : (
        <>
          <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-sm">
              Transactions couldn&apos;t be loaded. Check that the API is running and try again.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

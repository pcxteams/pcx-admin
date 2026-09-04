'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { deleteTransaction } from '@/lib/transactions';
import type { TransactionItem } from './types';

interface Props {
  transaction: TransactionItem;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteTransactionDialog({ transaction, onClose, onDeleted }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, deleting]);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    const result = await deleteTransaction(transaction.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={deleting ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-transaction-title"
        className="relative bg-white rounded-2xl shadow-xl w-full mx-4 max-w-md p-6"
      >
        <h2
          id="delete-transaction-title"
          className="text-base font-semibold text-gray-900"
        >
          Delete Transaction
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Delete the transaction for{' '}
          <span className="font-medium text-gray-900">{transaction.clientName}</span> at{' '}
          <span className="font-medium text-gray-900">{transaction.propertyAddress}</span>? This
          removes it from every production total and can&apos;t be undone.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={14} className="shrink-0 mt-px" />
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import AsyncSearchableSelect from '@/components/AsyncSearchableSelect';
import { fetchWorkspaceOptions } from '@/lib/workspaces';
import {
  createTransaction,
  fetchAgentOptions,
  updateTransaction,
  type TransactionPayload,
} from '@/lib/transactions';
import { SOURCE_LABELS, STATUS_META, TYPE_LABELS, type TransactionItem } from './types';

interface Props {
  /** Absent = Add; present = Edit that row. */
  transaction?: TransactionItem;
  onClose: () => void;
  onSaved: () => void;
}

const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

/** '' → null so an emptied optional field is actually cleared server-side. */
function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

function requiredNumber(value: FormDataEntryValue | null): number {
  return parseFloat(typeof value === 'string' ? value : '') || 0;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') return null;
  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Add / Edit Transaction. One form for both, as in v2 — the difference is
 * the initial values and which endpoint it posts to. Every editable column
 * on the table is represented here, so a row can be completed without
 * touching the database.
 */
export default function TransactionFormModal({ transaction, onClose, onSaved }: Props) {
  const isEdit = Boolean(transaction);
  const [agentUserId, setAgentUserId] = useState(transaction?.agentUserId ?? '');
  const [agentLabel, setAgentLabel] = useState(transaction?.agentName ?? '');
  const [workspaceId, setWorkspaceId] = useState(transaction?.workspaceId ?? '');
  const [workspaceLabel, setWorkspaceLabel] = useState(transaction?.workspaceName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Same Escape handling as the repo's other modals (NewEmailModal), gated on
  // `saving` so a half-written save can't be dismissed out from under itself.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  function fail(message: string) {
    setError(message);
    // The form is ~1200px of scroll and the submit button sits in a fixed
    // footer, so an error rendered in place is usually off-screen.
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!agentUserId) {
      fail('Pick the Agent this transaction belongs to.');
      return;
    }

    const fd = new FormData(e.currentTarget);
    const payload: TransactionPayload = {
      agentUserId,
      // Omitted when blank so the API falls back to the Agent's own
      // workspace — only an Agent in several workspaces has to choose.
      ...(workspaceId ? { workspaceId } : {}),
      status: String(fd.get('status') ?? ''),
      transactionType: String(fd.get('transactionType') ?? ''),
      source: optionalText(fd.get('source')),
      clientName: String(fd.get('clientName') ?? '').trim(),
      propertyAddress: String(fd.get('propertyAddress') ?? '').trim(),
      city: String(fd.get('city') ?? '').trim(),
      closeDate: optionalText(fd.get('closeDate')),
      volume: requiredNumber(fd.get('volume')),
      gci: requiredNumber(fd.get('gci')),
      companyDollar: requiredNumber(fd.get('companyDollar')),
      agentCommission: requiredNumber(fd.get('agentCommission')),
      referralAmount: optionalNumber(fd.get('referralAmount')),
      commissionSplit: optionalNumber(fd.get('commissionSplit')),
      transactionCoordinator: optionalText(fd.get('transactionCoordinator')),
      lender: optionalText(fd.get('lender')),
      titleCompany: optionalText(fd.get('titleCompany')),
      paymentReceived: fd.get('paymentReceived') === 'on',
      daUploaded: fd.get('daUploaded') === 'on',
      notes: optionalText(fd.get('notes')),
    };

    setSaving(true);
    const result = transaction
      ? await updateTransaction(transaction.id, payload)
      : await createTransaction(payload);
    setSaving(false);

    if (!result.ok) {
      fail(result.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={saving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-form-title"
        className="relative bg-white rounded-2xl shadow-xl w-full mx-4 max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2
            id="transaction-form-title"
            className="text-base font-semibold text-gray-900"
          >
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div ref={bodyRef} className="px-6 py-5 space-y-5 overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle size={14} className="shrink-0 mt-px" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Agent">
                <AsyncSearchableSelect
                  value={agentUserId}
                  selectedLabel={agentLabel}
                  onChange={(id, label) => {
                    setAgentUserId(id);
                    setAgentLabel(label);
                    // The Workspace has to be one the *new* Agent belongs to.
                    // Clearing it lets the API re-home the deal instead of
                    // rejecting the previous Agent's workspace.
                    if (id !== transaction?.agentUserId) {
                      setWorkspaceId('');
                      setWorkspaceLabel('');
                    }
                  }}
                  fetchOptions={fetchAgentOptions}
                  placeholder="Search agents…"
                />
              </Field>
              <Field
                label="Workspace"
                hint="Leave empty to use the Agent's own Workspace."
              >
                <AsyncSearchableSelect
                  value={workspaceId}
                  selectedLabel={workspaceLabel}
                  onChange={(id, label) => {
                    setWorkspaceId(id);
                    setWorkspaceLabel(label);
                  }}
                  fetchOptions={fetchWorkspaceOptions}
                  placeholder="Agent's Workspace"
                  clearable
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <select
                  name="status"
                  defaultValue={transaction?.status ?? 'pending'}
                  required
                  className={INPUT}
                >
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  name="transactionType"
                  defaultValue={transaction?.transactionType ?? 'buyer'}
                  required
                  className={INPUT}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Lead Source">
                <select name="source" defaultValue={transaction?.source ?? ''} className={INPUT}>
                  <option value="">None</option>
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Close Date">
                <input
                  name="closeDate"
                  type="date"
                  defaultValue={transaction?.closeDate ?? ''}
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Client Name">
                <input
                  name="clientName"
                  type="text"
                  defaultValue={transaction?.clientName ?? ''}
                  placeholder="John Doe"
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="City">
                <input
                  name="city"
                  type="text"
                  defaultValue={transaction?.city ?? ''}
                  placeholder="Phoenix"
                  required
                  className={INPUT}
                />
              </Field>
            </div>

            <Field label="Property Address">
              <input
                name="propertyAddress"
                type="text"
                defaultValue={transaction?.propertyAddress ?? ''}
                placeholder="123 Main St"
                required
                className={INPUT}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Sale Price / Volume ($)">
                <input
                  name="volume"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={transaction?.volume ?? ''}
                  placeholder="650000"
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="GCI ($)">
                <input
                  name="gci"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={transaction?.gci ?? ''}
                  placeholder="19500"
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Company Dollar ($)">
                <input
                  name="companyDollar"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={transaction?.companyDollar ?? ''}
                  placeholder="2925"
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Agent Commission ($)">
                <input
                  name="agentCommission"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={transaction?.agentCommission ?? ''}
                  placeholder="16575"
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Referral Amount ($)">
                <input
                  name="referralAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={transaction?.referralAmount ?? ''}
                  className={INPUT}
                />
              </Field>
              <Field label="Commission Split (%)">
                <input
                  name="commissionSplit"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={transaction?.commissionSplit ?? ''}
                  placeholder="80"
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Transaction Coordinator">
                <input
                  name="transactionCoordinator"
                  type="text"
                  defaultValue={transaction?.transactionCoordinator ?? ''}
                  className={INPUT}
                />
              </Field>
              <Field label="Lender">
                <input
                  name="lender"
                  type="text"
                  defaultValue={transaction?.lender ?? ''}
                  className={INPUT}
                />
              </Field>
              <Field label="Title Company">
                <input
                  name="titleCompany"
                  type="text"
                  defaultValue={transaction?.titleCompany ?? ''}
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  name="paymentReceived"
                  type="checkbox"
                  defaultChecked={transaction?.paymentReceived ?? false}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Payment Received
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  name="daUploaded"
                  type="checkbox"
                  defaultChecked={transaction?.daUploaded ?? false}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                DA Uploaded
              </label>
            </div>

            <Field label="Notes">
              <textarea
                name="notes"
                rows={3}
                defaultValue={transaction?.notes ?? ''}
                placeholder="Anything the team should know about this deal…"
                className={INPUT}
              />
            </Field>

          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

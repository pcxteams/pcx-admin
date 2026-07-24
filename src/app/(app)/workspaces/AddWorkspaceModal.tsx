'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, LayoutGrid, Users, Info } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const OFFICE_WORKSPACES = [
  { id: '1', label: 'Keller Williams Realty' },
  { id: '2', label: 'RE/MAX Premier' },
  { id: '3', label: 'Sunbelt Realty Group' },
  { id: '4', label: 'Mesa Valley Realty' },
];

const ALL_WORKSPACES = [
  { id: '1', label: 'Keller Williams Realty' },
  { id: '2', label: 'RE/MAX Premier' },
  { id: '3', label: 'Sunbelt Realty Group' },
  { id: '4', label: 'Mesa Valley Realty' },
  { id: '5', label: 'Desert Peak Offices' },
  { id: '6', label: 'Pinnacle AZ Brokers' },
];

const USER_COUNT_OPTIONS = [
  { id: '1-10', label: '1–10' },
  { id: '11-25', label: '11–25' },
  { id: '26-50', label: '26–50' },
  { id: '51-100', label: '51–100' },
  { id: '101-250', label: '101–250' },
  { id: '251-500', label: '251–500' },
  { id: '500+', label: '500+' },
];

const DEFAULT_EMAIL_BODY =
  "Please complete the Workspace Setup Form to finish setting up your account. Once completed, you'll have full access to your PCx workspace. Workspace managers will also receive the setup form.";

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

const SELECT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white';

const LABEL_CLASS = 'block text-xs font-medium text-gray-700 mb-1';

const SECTION_LABEL_CLASS =
  'text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface Props {
  onClose: () => void;
}

export default function AddWorkspaceModal({ onClose }: Props) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceType, setWorkspaceType] = useState<'office' | 'team'>('office');
  const [primaryName, setPrimaryName] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<'essentials' | 'pro'>('essentials');
  const [userCount, setUserCount] = useState('1-10');
  const [cloneFrom, setCloneFrom] = useState<'pcx_master' | 'existing'>('pcx_master');
  const [cloneWorkspaceId, setCloneWorkspaceId] = useState('');
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [emailInput, setEmailInput] = useState('');

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function addEmailRecipient(raw: string) {
    const trimmed = raw.trim().replace(/,$/, '');
    if (trimmed && isValidEmail(trimmed) && !emailRecipients.includes(trimmed) && trimmed !== primaryEmail) {
      setEmailRecipients((prev) => [...prev, trimmed]);
    }
    setEmailInput('');
  }

  function handleEmailInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmailRecipient(emailInput);
    }
  }

  function handleEmailInputBlur() {
    if (emailInput.trim()) addEmailRecipient(emailInput);
  }

  function removeRecipient(email: string) {
    setEmailRecipients((prev) => prev.filter((r) => r !== email));
  }

  async function handleSubmit() {
    if (!workspaceName.trim() || !primaryName.trim() || !primaryEmail.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceName: workspaceName.trim(),
          workspaceType,
          primaryContactName: primaryName.trim(),
          primaryContactEmail: primaryEmail.trim(),
          reportsToWorkspaceId: reportsTo || undefined,
          subscriptionPlan,
          userCount,
          cloneFrom,
          cloneWorkspaceId: cloneFrom === 'existing' ? cloneWorkspaceId : undefined,
          emailRecipients,
          emailBody,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setSubmitError(data.message ?? 'Something went wrong. Please try again.');
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const fixedChipEmail = primaryEmail.trim() || 'email@domain.com';
  const fixedChipIsPlaceholder = !primaryEmail.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add Workspace</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Create a new workspace and send the setup form.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Workspace Name */}
          <div>
            <label className={LABEL_CLASS}>
              Workspace Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. KW Downtown Phoenix"
              className={INPUT_CLASS}
            />
          </div>

          {/* Workspace Type */}
          <div>
            <label className={LABEL_CLASS}>Workspace Type</label>
            <div className="flex gap-3">
              {(['office', 'team'] as const).map((type) => {
                const selected = workspaceType === type;
                const Icon = type === 'office' ? LayoutGrid : Users;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWorkspaceType(type)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors capitalize"
                    style={
                      selected
                        ? { background: '#f0fdfa', borderColor: '#00bba7', color: '#00786f' }
                        : { background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                    }
                  >
                    <Icon size={15} />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Contact */}
          <div>
            <p className={SECTION_LABEL_CLASS}>Primary Contact</p>
            <div className="space-y-3">
              <div>
                <label className={LABEL_CLASS}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  placeholder="Full name"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          {/* Reports To — team only */}
          {workspaceType === 'team' && (
            <div>
              <label className={LABEL_CLASS}>Reports To (optional)</label>
              <SearchableSelect
                options={OFFICE_WORKSPACES}
                value={reportsTo}
                onChange={setReportsTo}
                placeholder="Select an office workspace…"
              />
            </div>
          )}

          {/* Subscription Plan + User Count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Subscription Plan</label>
              <select
                value={subscriptionPlan}
                onChange={(e) => setSubscriptionPlan(e.target.value as 'essentials' | 'pro')}
                className={SELECT_CLASS}
              >
                <option value="essentials">Essentials</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>User Count</label>
              <select
                value={userCount}
                onChange={(e) => setUserCount(e.target.value)}
                className={SELECT_CLASS}
              >
                {USER_COUNT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clone From */}
          <div>
            <label className={LABEL_CLASS}>Clone From</label>
            <div className="space-y-2">
              {/* PCX Master radio */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="cloneFrom"
                  value="pcx_master"
                  checked={cloneFrom === 'pcx_master'}
                  onChange={() => {
                    setCloneFrom('pcx_master');
                    setCloneWorkspaceId('');
                  }}
                  className="accent-teal-600"
                />
                <span className="text-sm text-gray-700">PCX Master</span>
              </label>

              {/* Existing Workspace radio */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="cloneFrom"
                  value="existing"
                  checked={cloneFrom === 'existing'}
                  onChange={() => setCloneFrom('existing')}
                  className="accent-teal-600"
                />
                <span className="text-sm text-gray-700">Existing Workspace</span>
              </label>

              {/* Searchable select shown below 'Existing Workspace' when selected */}
              {cloneFrom === 'existing' && (
                <div className="pl-6">
                  <SearchableSelect
                    options={ALL_WORKSPACES}
                    value={cloneWorkspaceId}
                    onChange={setCloneWorkspaceId}
                    placeholder="Search workspaces…"
                  />
                </div>
              )}

            </div>
          </div>

          {/* Setup Form Email */}
          <div>
            <p className={SECTION_LABEL_CLASS}>Setup Form Email</p>

            {/* Info panel */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex items-start gap-3 mb-3">
              <Info size={15} className="text-teal-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-teal-800">
                  A setup form email will automatically be sent when this workspace is created.{' '}
                  <button
                    type="button"
                    className="text-teal-600 text-xs font-medium underline whitespace-nowrap"
                  >
                    Update Contact
                  </button>
                </p>
              </div>
            </div>

            {/* Recipients */}
            <div className="mb-3">
              <label className={LABEL_CLASS}>Recipients</label>
              <div
                className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 px-3 py-2 cursor-text min-h-[42px]"
                onClick={() => emailInputRef.current?.focus()}
              >
                {/* Fixed primary contact chip */}
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                    fixedChipIsPlaceholder
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  {fixedChipEmail}
                </span>

                {/* Additional recipient chips */}
                {emailRecipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecipient(email);
                      }}
                      className="text-teal-600 hover:text-teal-900"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {/* Email input */}
                <input
                  ref={emailInputRef}
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailInputKeyDown}
                  onBlur={handleEmailInputBlur}
                  placeholder="Add email…"
                  className="flex-1 min-w-[120px] text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Press Enter or comma to add an email.</p>
            </div>

            {/* Body textarea */}
            <div>
              <label className={LABEL_CLASS}>Body</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
                className={`${INPUT_CLASS} min-h-[100px] resize-y`}
              />
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          {submitError && (
            <p className="flex-1 text-sm text-red-600">{submitError}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !workspaceName.trim() || !primaryName.trim() || !primaryEmail.trim()}
            className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating…' : 'Create & Send Form'}
          </button>
        </div>
      </div>
    </div>
  );
}

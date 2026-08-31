'use client';

import { useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import {
  sendTestEmail,
  updatePlatformSettings,
  uploadPlatformLogo,
  type PlatformSettings,
} from '@/lib/platform-settings';

const BRAND = '#009689';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';
const SECTION_SUB = 'text-xs text-gray-400 mb-5';
const LABEL = 'text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5';
const FIELD = 'flex flex-col';
const INPUT =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent w-full disabled:bg-gray-50 disabled:text-gray-400';
const INPUT_FOCUS = 'focus:ring-[#009689]/30';

const TIMEZONES = [
  { value: 'America/New_York', label: 'America/New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Phoenix', label: 'America/Phoenix (MST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT)' },
  { value: 'America/Anchorage', label: 'America/Anchorage (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (HST)' },
];

interface FormState {
  senderDisplayName: string;
  senderEmail: string;
  replyToEmail: string;
  defaultTimeZone: string;
  emailFooterHtml: string;
  testEmailRecipient: string;
  defaultPrimaryColor: string;
  defaultLogoUrl: string;
}

function toForm(s: PlatformSettings): FormState {
  return {
    senderDisplayName: s.senderDisplayName ?? '',
    senderEmail: s.senderEmail ?? '',
    replyToEmail: s.replyToEmail ?? '',
    defaultTimeZone: s.defaultTimeZone ?? 'America/New_York',
    emailFooterHtml: s.emailFooterHtml ?? '',
    testEmailRecipient: s.testEmailRecipient ?? '',
    defaultPrimaryColor: s.defaultPrimaryColor ?? '',
    defaultLogoUrl: s.defaultLogoUrl ?? '',
  };
}

export default function PlatformSettingsView({
  initial,
}: {
  initial: PlatformSettings;
}) {
  const [form, setForm] = useState<FormState>(toForm(initial));
  const verifiedDomains = initial.verifiedDomains ?? [];

  // Time-zone options always include the current value, even if it's not in the
  // short curated list, so the select can never silently drop a saved zone.
  const tzOptions = TIMEZONES.some((t) => t.value === form.defaultTimeZone)
    ? TIMEZONES
    : [{ value: form.defaultTimeZone, label: form.defaultTimeZone }, ...TIMEZONES];

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Logo upload (presigned S3 PUT, mirrors the workspace logo flow)
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoSelect = useCallback(async (file: File) => {
    setLogoError(null);
    setLogoUploading(true);
    const result = await uploadPlatformLogo(file);
    if (result.ok) {
      setForm((f) => ({ ...f, defaultLogoUrl: result.publicUrl }));
    } else {
      setLogoError(result.message);
    }
    setLogoUploading(false);
  }, []);

  // Save
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const result = await updatePlatformSettings({
      senderDisplayName: form.senderDisplayName,
      senderEmail: form.senderEmail,
      replyToEmail: form.replyToEmail || null,
      defaultTimeZone: form.defaultTimeZone,
      emailFooterHtml: form.emailFooterHtml || null,
      testEmailRecipient: form.testEmailRecipient || null,
      defaultPrimaryColor: form.defaultPrimaryColor || null,
      defaultLogoUrl: form.defaultLogoUrl || null,
    });
    if (result.ok) {
      setForm(toForm(result.settings));
      setSaveSuccess(true);
    } else {
      setSaveError(result.message);
    }
    setIsSaving(false);
  }

  // Send Test Email — uses the CURRENT (possibly unsaved) form values.
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSendTest() {
    setTestSending(true);
    setTestResult(null);
    const result = await sendTestEmail({
      testEmailRecipient: form.testEmailRecipient || undefined,
      senderDisplayName: form.senderDisplayName,
      senderEmail: form.senderEmail,
      replyToEmail: form.replyToEmail || null,
      emailFooterHtml: form.emailFooterHtml || null,
    });
    setTestResult(
      result.ok
        ? { ok: true, message: `Test email sent to ${form.testEmailRecipient || 'the saved recipient'}.` }
        : { ok: false, message: result.message },
    );
    setTestSending(false);
  }

  const domainHint = verifiedDomains.length
    ? `Must use a verified sending domain: ${verifiedDomains.join(', ')}.`
    : 'Must use a verified sending domain.';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
            <p className="mt-1 text-sm text-gray-400">
              Platform-wide email delivery and default branding. These are not
              settings for a specific Workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && <span className="text-sm text-green-600">Saved</span>}
            {saveError && <span className="text-sm text-red-500">{saveError}</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: BRAND }}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Email Delivery */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Email Delivery</p>
            <p className={SECTION_SUB}>
              Defaults for operational emails PCx sends. Account, verification,
              security, billing, and legal emails remain platform controlled.
            </p>
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div className={FIELD}>
                <label className={LABEL}>Default Sender Display Name</label>
                <input
                  className={`${INPUT} ${INPUT_FOCUS}`}
                  value={form.senderDisplayName}
                  onChange={set('senderDisplayName')}
                  placeholder="PCx"
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Default Sender Email</label>
                <input
                  className={`${INPUT} ${INPUT_FOCUS}`}
                  value={form.senderEmail}
                  onChange={set('senderEmail')}
                  placeholder="onboarding@pcxteams.com"
                />
                <p className="mt-1 text-xs text-gray-400">{domainHint}</p>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Reply-To Email</label>
                <input
                  className={`${INPUT} ${INPUT_FOCUS}`}
                  value={form.replyToEmail}
                  onChange={set('replyToEmail')}
                  placeholder="support@pcxteams.com"
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Default Time Zone</label>
                <select
                  value={form.defaultTimeZone}
                  onChange={set('defaultTimeZone')}
                  className={`${INPUT} ${INPUT_FOCUS}`}
                >
                  {tzOptions.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${FIELD} col-span-2`}>
                <label className={LABEL}>Email Footer (HTML supported)</label>
                <textarea
                  className={`${INPUT} ${INPUT_FOCUS} font-mono min-h-[96px]`}
                  value={form.emailFooterHtml}
                  onChange={set('emailFooterHtml')}
                  placeholder="<p>PCx Teams · 123 Main St · Unsubscribe</p>"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Appended to operational emails. Basic formatting, links, and
                  https images are kept; scripts, event handlers, styles, and
                  unsafe links are removed on save.
                </p>
              </div>
            </div>

            {/* Send Test Email */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className={`${FIELD} flex-1 min-w-[240px]`}>
                  <label className={LABEL}>Test Email Recipient</label>
                  <input
                    className={`${INPUT} ${INPUT_FOCUS}`}
                    value={form.testEmailRecipient}
                    onChange={set('testEmailRecipient')}
                    placeholder="you@pcxteams.com"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testSending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <Send size={14} />
                  {testSending ? 'Sending…' : 'Send Test Email'}
                </button>
              </div>
              {testResult && (
                <p
                  className={`mt-2 text-xs ${
                    testResult.ok ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {testResult.message}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Uses the values currently entered above, even if you haven&apos;t
                saved them. A failed test never changes your saved settings.
              </p>
            </div>
          </div>

          {/* Default Branding */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Default Branding</p>
            <p className={SECTION_SUB}>
              Copied to new Workspaces. Existing Workspaces keep their own
              branding and are not changed when these defaults change.
            </p>

            <div className={`${FIELD} mb-6`}>
              <p className={LABEL}>Default Logo</p>
              <div className="mt-1 flex items-center gap-4">
                {form.defaultLogoUrl && (
                  <div className="inline-block rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.defaultLogoUrl}
                      alt="Default platform logo"
                      className="h-12 max-w-[200px] object-contain"
                    />
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer">
                  {logoUploading ? 'Uploading…' : 'Replace Logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    disabled={logoUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleLogoSelect(file);
                    }}
                  />
                </label>
              </div>
              {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
            </div>

            <div className={`${FIELD} max-w-xs`}>
              <label className={LABEL}>Default Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.defaultPrimaryColor || '#000000'}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultPrimaryColor: e.target.value }))
                  }
                  className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"
                />
                <input
                  className={`${INPUT} ${INPUT_FOCUS} font-mono`}
                  value={form.defaultPrimaryColor}
                  onChange={set('defaultPrimaryColor')}
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useId, useRef, useCallback } from 'react';
import { Building2, Users, Plus, X, CheckCircle, Lock, Upload, Loader2 } from 'lucide-react';
import WorkspaceCustomizationForm from './WorkspaceCustomizationForm';

interface Prefill {
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'office' | 'team';
  parentWorkspaceName: string | null;
  primaryContactFirstName: string;
  primaryContactLastName: string;
  primaryContactEmail: string;
  expiresAt: string;
}

interface Leader {
  _key: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: 'manager' | 'leader';
  canEditSettings: boolean;
  visibilityScope: 'workspace' | 'assigned_agents';
  showProfile: boolean;
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';
const INPUT_ERROR = 'w-full rounded-lg border border-red-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent';

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return /\.[a-zA-Z]{2,}$/.test(u.hostname);
  } catch {
    return false;
  }
}

const TIMEZONES = [
  { value: 'America/New_York',    label: 'America/New York (EST/EDT)' },
  { value: 'America/Chicago',     label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver',      label: 'America/Denver (MST/MDT)' },
  { value: 'America/Phoenix',     label: 'America/Phoenix (MST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT)' },
  { value: 'America/Anchorage',   label: 'America/Anchorage (AKST/AKDT)' },
  { value: 'Pacific/Honolulu',    label: 'Pacific/Honolulu (HST)' },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID',
  'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO',
  'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
  'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

function SectionHeader({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900">{n}. {title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function PreFilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-semibold tracking-wide uppercase">
      <Lock size={9} />
      Pre-filled
    </span>
  );
}

function FieldLabel({ children, required, locked }: { children: React.ReactNode; required?: boolean; locked?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <label className="text-xs font-medium text-gray-700">
        {children} {required && <span className="text-red-500">*</span>}
      </label>
      {locked && <PreFilledBadge />}
    </div>
  );
}

function LeaderCard({
  leader,
  index,
  onChange,
  onRemove,
}: {
  leader: Leader;
  index: number;
  onChange: (patch: Partial<Leader>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          Leader {index + 1}
        </span>
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-gray-600">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Full Name</FieldLabel>
            <input
              type="text"
              value={leader.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Full name"
              className={INPUT}
            />
          </div>
          <div>
            <FieldLabel required>Email</FieldLabel>
            <input
              type="email"
              value={leader.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="leader@example.com"
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <FieldLabel required>Role</FieldLabel>
          <select
            value={leader.role}
            onChange={(e) => onChange({ role: e.target.value as Leader['role'] })}
            className={INPUT}
          >
            <option value="leader">Leader</option>
            <option value="manager">Manager</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">Determines this person&apos;s access level within the workspace.</p>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceSetupForm({ prefill, token }: { prefill: Prefill; token: string }) {
  const uid = useId();

  const companyName = prefill.workspaceName;
  const [legalBusinessName, setLegalBusinessName] = useState('');
  const [timeZone, setTimeZone] = useState('America/Phoenix');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [primaryContactTitle, setPrimaryContactTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('United States');
  const [website, setWebsite] = useState('');
  const [workspaceEmail, setWorkspaceEmail] = useState('');
  const [workspacePhone, setWorkspacePhone] = useState('');
  const [leaders, setLeaders] = useState<Leader[]>([]);

  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [customizationToken, setCustomizationToken] = useState<string | null>(null);

  function validateUrl(key: string, value: string) {
    setUrlErrors((prev) => {
      if (!value.trim() || isValidUrl(value)) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: 'Must be a valid URL (e.g. https://example.com)' };
    });
  }

  function urlInputClass(key: string) {
    return urlErrors[key] ? INPUT_ERROR : INPUT;
  }

  const handleLogoSelect = useCallback(async (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setLogoError('Only PNG, JPG, or SVG files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('File must be under 5 MB.');
      return;
    }
    setLogoFile(file);
    setLogoError(null);
    setLogoUrl(null);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const res = await fetch(`/api/workspace-setup/${token}/logo-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!res.ok) throw new Error('Could not get upload URL.');
      const { uploadUrl, publicUrl } = await res.json() as { uploadUrl: string; publicUrl: string };
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!s3Res.ok) throw new Error('Upload to S3 failed.');
      setLogoUrl(publicUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setLogoPreview(null);
      setLogoFile(null);
    } finally {
      setLogoUploading(false);
    }
  }, [token]);

  function addLeader() {
    setLeaders((prev) => [
      ...prev,
      {
        _key: `${uid}-${Date.now()}`,
        name: '',
        email: '',
        // Leadership Team is trimmed to Name/Email/Role at setup time — no
        // Limited Leader (assigned_agents) option here; these fixed defaults
        // give every leader full workspace access, editable later via the
        // Workspace Profile if that changes.
        phone: '',
        jobTitle: '',
        role: 'leader',
        canEditSettings: false,
        visibilityScope: 'workspace',
        showProfile: false,
      },
    ]);
  }

  function updateLeader(index: number, patch: Partial<Leader>) {
    setLeaders((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLeader(index: number) {
    setLeaders((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (!legalBusinessName.trim()) {
      setSubmitError('Legal Business Name is required.');
      return;
    }
    if (!workspaceEmail.trim()) {
      setSubmitError('Workspace Email is required.');
      return;
    }
    if (!workspacePhone.trim()) {
      setSubmitError('Workspace Phone is required.');
      return;
    }
    if (!address.trim()) {
      setSubmitError('Physical Address is required.');
      return;
    }
    if (!city.trim()) {
      setSubmitError('City is required.');
      return;
    }
    if (!state.trim()) {
      setSubmitError('State is required.');
      return;
    }
    if (!zip.trim()) {
      setSubmitError('ZIP Code is required.');
      return;
    }
    if (!country.trim()) {
      setSubmitError('Country is required.');
      return;
    }
    if (!primaryContactPhone.trim()) {
      setSubmitError('Primary Point of Contact phone number is required.');
      return;
    }
    for (const [i, leader] of leaders.entries()) {
      if (!leader.name.trim()) {
        setSubmitError(`Leader ${i + 1}: Name is required.`);
        return;
      }
      if (!leader.email.trim()) {
        setSubmitError(`Leader ${i + 1}: Email is required.`);
        return;
      }
    }

    const urlFields: [string, string][] = [['website', website]];
    const newUrlErrors: Record<string, string> = {};
    for (const [key, val] of urlFields) {
      if (val.trim() && !isValidUrl(val)) {
        newUrlErrors[key] = 'Must be a valid URL (e.g. https://example.com)';
      }
    }
    if (Object.keys(newUrlErrors).length > 0) {
      setUrlErrors(newUrlErrors);
      setSubmitError('Please fix the invalid URLs before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace-setup/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalBusinessName: legalBusinessName.trim(),
          timeZone,
          primaryContactPhone: primaryContactPhone.trim(),
          primaryContactTitle: primaryContactTitle.trim() || undefined,
          logoUrl: logoUrl || undefined,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          country: country.trim(),
          website: website.trim() || undefined,
          workspaceEmail: workspaceEmail.trim(),
          workspacePhone: workspacePhone.trim(),
          leaders: leaders.map((l) => ({
            name: l.name.trim(),
            email: l.email.trim(),
            phone: l.phone.trim() || undefined,
            jobTitle: l.jobTitle.trim() || undefined,
            role: l.role,
            canEditSettings: l.canEditSettings,
            visibilityScope: l.visibilityScope,
            showProfile: l.showProfile,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setSubmitError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }

      const body = await res.json() as { customizationToken: string };
      setCustomizationToken(body.customizationToken);
      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted && customizationToken) {
    return (
      <WorkspaceCustomizationForm
        token={customizationToken}
        workspaceName={companyName}
        leaders={leaders.map((l) => ({ name: l.name, email: l.email }))}
      />
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full px-8 py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-teal-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">You&apos;re All Set!</h1>
          <p className="text-sm text-gray-500">
            Your workspace setup has been submitted.
            We&apos;ll begin setting up your workspace and creating your account.
          </p>
        </div>
      </div>
    );
  }

  const WorkspaceIcon = prefill.workspaceType === 'office' ? Building2 : Users;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Workspace Setup</h1>
          <p className="text-sm text-gray-500 mt-1">Complete your workspace details to get started.</p>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-5">

        {/* Section 1 — Workspace Information */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader n={1} title="Workspace Information" />
          <div className="space-y-4">
            <div>
              <FieldLabel locked>Workspace Type</FieldLabel>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <WorkspaceIcon size={14} className="text-gray-400" />
                {prefill.workspaceType === 'office' ? 'Office' : 'Team'}
              </div>
            </div>

            {prefill.parentWorkspaceName && (
              <div>
                <FieldLabel locked>Reports To</FieldLabel>
                <input type="text" value={prefill.parentWorkspaceName} disabled className={INPUT} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel locked>Company Name</FieldLabel>
                <input type="text" value={companyName} disabled className={INPUT} />
                <p className="mt-1 text-xs text-gray-400">
                  This name is shown to agents on their homepage, in emails, and other client-facing areas of the platform.
                </p>
              </div>
              <div>
                <FieldLabel required>Legal Business Name</FieldLabel>
                <input
                  type="text"
                  value={legalBusinessName}
                  onChange={(e) => setLegalBusinessName(e.target.value)}
                  placeholder="e.g. Sunbelt Realty LLC"
                  className={INPUT}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Workspace Email</FieldLabel>
                <input
                  type="email"
                  value={workspaceEmail}
                  onChange={(e) => setWorkspaceEmail(e.target.value)}
                  placeholder="info@yourbrokerage.com"
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel required>Workspace Phone</FieldLabel>
                <input
                  type="tel"
                  value={workspacePhone}
                  onChange={(e) => setWorkspacePhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <FieldLabel required>Physical Address</FieldLabel>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street"
                className={INPUT}
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <FieldLabel required>City</FieldLabel>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Phoenix" className={INPUT} />
              </div>
              <div>
                <FieldLabel required>State</FieldLabel>
                <select value={state} onChange={(e) => setState(e.target.value)} className={INPUT}>
                  <option value="">State</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel required>ZIP Code</FieldLabel>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="85001" className={INPUT} />
              </div>
              <div>
                <FieldLabel required>Country</FieldLabel>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" className={INPUT} />
              </div>
            </div>

            <div>
              <FieldLabel>Time Zone</FieldLabel>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className={INPUT}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Website (Optional)</FieldLabel>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onBlur={() => validateUrl('website', website)}
                placeholder="https://yourbrokerage.com"
                className={urlInputClass('website')}
              />
              {urlErrors['website'] && (
                <p className="mt-1 text-xs text-red-500">{urlErrors['website']}</p>
              )}
            </div>

            <div>
              <FieldLabel>Company Logo</FieldLabel>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoSelect(f); }}
              />
              {logoPreview ? (
                <div className="relative flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo preview" className="h-12 max-w-[120px] object-contain" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{logoFile?.name}</p>
                    {logoUploading ? (
                      <p className="flex items-center gap-1.5 text-xs text-teal-600 mt-0.5">
                        <Loader2 size={11} className="animate-spin" /> Uploading…
                      </p>
                    ) : logoUrl ? (
                      <p className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                        <CheckCircle size={11} /> Uploaded
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoUrl(null); setLogoError(null); if (logoInputRef.current) logoInputRef.current.value = ''; }}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-6 py-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleLogoSelect(f); }}
                >
                  <Upload size={22} className="text-gray-300" />
                  <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400">PNG, JPG or SVG · max 5MB</p>
                </div>
              )}
              {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
            </div>
          </div>
        </div>

        {/* Section 2 — Primary Point of Contact */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader n={2} title="Primary Point of Contact" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel locked>First Name</FieldLabel>
                <input type="text" value={prefill.primaryContactFirstName} disabled className={INPUT} />
              </div>
              <div>
                <FieldLabel locked>Last Name</FieldLabel>
                <input type="text" value={prefill.primaryContactLastName} disabled className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel locked>Email</FieldLabel>
                <input type="text" value={prefill.primaryContactEmail} disabled className={INPUT} />
              </div>
              <div>
                <FieldLabel required>Phone</FieldLabel>
                <input
                  type="tel"
                  value={primaryContactPhone}
                  onChange={(e) => setPrimaryContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Title (Optional)</FieldLabel>
              <input
                type="text"
                value={primaryContactTitle}
                onChange={(e) => setPrimaryContactTitle(e.target.value)}
                placeholder="e.g. Managing Broker"
                className={INPUT}
              />
            </div>
          </div>
        </div>

        {/* Section 3 — Leadership Team */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            n={3}
            title="Leadership Team"
            subtitle="Register the workspace leaders who will be invited to access this workspace."
          />
          <div className="space-y-3">
            {leaders.map((leader, i) => (
              <LeaderCard
                key={leader._key}
                leader={leader}
                index={i}
                onChange={(patch) => updateLeader(i, patch)}
                onRemove={() => removeLeader(i)}
              />
            ))}
            <button
              type="button"
              onClick={addLeader}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <Plus size={14} />
              Add Leader
            </button>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {submitError ? (
            <p className="flex-1 text-sm text-red-600">{submitError}</p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => window.close()}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? 'Creating…' : (
                <>
                  <CheckCircle size={14} />
                  Create Workspace
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

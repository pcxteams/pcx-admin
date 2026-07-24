'use client';

import { useState, useId } from 'react';
import { Building2, Users, Plus, X, CheckCircle, ImageIcon } from 'lucide-react';

interface Prefill {
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'office' | 'team';
  parentWorkspaceName: string | null;
  primaryContactName: string;
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

interface AdditionalLink {
  _key: string;
  label: string;
  url: string;
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

const TIMEZONES = [
  { value: 'America/New_York',    label: 'America/New York (EST/EDT)' },
  { value: 'America/Chicago',     label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver',      label: 'America/Denver (MST/MDT)' },
  { value: 'America/Phoenix',     label: 'America/Phoenix (MST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT)' },
  { value: 'America/Anchorage',   label: 'America/Anchorage (AKST/AKDT)' },
  { value: 'Pacific/Honolulu',    label: 'Pacific/Honolulu (HST)' },
];

function SectionHeader({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-semibold shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
        <div
          className="w-5 h-5 rounded-sm border border-gray-200 shrink-0"
          style={{ background: /^#[0-9a-fA-F]{3,6}$/.test(value) ? value : '#ffffff' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
        />
      </div>
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
            <label className={LABEL}>Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={leader.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Full name"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Email Address <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={leader.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="leader@example.com"
              className={INPUT}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Phone Number</label>
            <input
              type="text"
              value={leader.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="(555) 000-0000"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Job Title</label>
            <input
              type="text"
              value={leader.jobTitle}
              onChange={(e) => onChange({ jobTitle: e.target.value })}
              placeholder="e.g. Office Principal"
              className={INPUT}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Role</label>
            <select
              value={leader.role}
              onChange={(e) => onChange({ role: e.target.value as Leader['role'] })}
              className={INPUT}
            >
              <option value="leader">Leader</option>
              <option value="manager">Workspace Manager</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Permission Level</label>
            <select
              value={leader.canEditSettings ? 'yes' : 'no'}
              onChange={(e) => onChange({ canEditSettings: e.target.value === 'yes' })}
              className={INPUT}
            >
              <option value="yes">Can Edit Settings &amp; Customizations</option>
              <option value="no">Cannot Edit Settings &amp; Customizations</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Visibility Scope</label>
            <select
              value={leader.visibilityScope}
              onChange={(e) => onChange({ visibilityScope: e.target.value as Leader['visibilityScope'] })}
              className={INPUT}
            >
              <option value="workspace">Entire Workspace</option>
              <option value="assigned_agents">Assigned Agents Only</option>
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Leader Profile — Display on Agent Office Home Page?</label>
          <div className="flex items-center gap-2 mt-1">
            {(['yes', 'no'] as const).map((opt) => {
              const active = leader.showProfile ? opt === 'yes' : opt === 'no';
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange({ showProfile: opt === 'yes' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-teal-50 border-teal-500 text-teal-700'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  {opt === 'yes' ? 'Yes' : 'No'}
                </button>
              );
            })}
            <span className="text-xs text-gray-400 ml-1">
              Determines whether this Leader appears on the Agent Office page.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceSetupForm({ prefill, token }: { prefill: Prefill; token: string }) {
  const uid = useId();

  const [clientFacingName, setClientFacingName] = useState(prefill.workspaceName);
  const [timeZone, setTimeZone] = useState('America/Phoenix');
  const [primaryColor, setPrimaryColor] = useState('#0d9488');
  const [secondaryColor, setSecondaryColor] = useState('#6366f1');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [mlsWebsite, setMlsWebsite] = useState('');
  const [boardOfRealtorsWebsite, setBoardOfRealtorsWebsite] = useState('');
  const [trainingCalendarUrl, setTrainingCalendarUrl] = useState('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [additionalLinks, setAdditionalLinks] = useState<AdditionalLink[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function addLeader() {
    setLeaders((prev) => [
      ...prev,
      {
        _key: `${uid}-${Date.now()}`,
        name: '',
        email: '',
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

  function addLink() {
    setAdditionalLinks((prev) => [...prev, { _key: `${uid}-link-${Date.now()}`, label: '', url: '' }]);
  }

  function updateLink(index: number, patch: Partial<AdditionalLink>) {
    setAdditionalLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLink(index: number) {
    setAdditionalLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (!clientFacingName.trim()) {
      setSubmitError('Client-Facing Company Name is required.');
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

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace-setup/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientFacingName: clientFacingName.trim(),
          timeZone,
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
          address: address.trim() || undefined,
          website: website.trim() || undefined,
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
          mlsWebsite: mlsWebsite.trim() || undefined,
          boardOfRealtorsWebsite: boardOfRealtorsWebsite.trim() || undefined,
          trainingCalendarUrl: trainingCalendarUrl.trim() || undefined,
          googleDriveUrl: googleDriveUrl.trim() || undefined,
          additionalLinks: additionalLinks
            .filter((l) => l.label.trim() && l.url.trim())
            .map(({ label, url }) => ({ label, url })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setSubmitError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full px-8 py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-teal-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Workspace submitted!</h1>
          <p className="text-sm text-gray-500">
            Your workspace setup has been submitted. Our team will review and activate it shortly.
            You can close this tab.
          </p>
        </div>
      </div>
    );
  }

  const WorkspaceIcon = prefill.workspaceType === 'office' ? Building2 : Users;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900">Workspace Setup Form</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <WorkspaceIcon size={11} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-400 truncate">{prefill.workspaceName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-5">

        {/* Section 1 — Workspace Information */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader n={1} title="Workspace Information" />
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Workspace Name (Internal)</label>
              <input type="text" value={prefill.workspaceName} disabled className={INPUT} />
            </div>
            {prefill.parentWorkspaceName && (
              <div>
                <label className={LABEL}>Parent Workspace</label>
                <input type="text" value={prefill.parentWorkspaceName} disabled className={INPUT} />
              </div>
            )}
            <div>
              <label className={LABEL}>
                Client-Facing Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientFacingName}
                onChange={(e) => setClientFacingName(e.target.value)}
                placeholder="Name shown to agents and clients"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Time Zone</label>
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
          </div>
        </div>

        {/* Section 2 — Branding */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader n={2} title="Branding" />
          <div className="space-y-4">
            {/* Logo upload (UI only — S3 integration pending) */}
            <div>
              <label className={LABEL}>Company Logo</label>
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-6 py-8 text-center cursor-pointer hover:border-gray-300 transition-colors">
                <ImageIcon size={24} className="text-gray-300" />
                <p className="text-sm text-gray-400">Click to upload logo</p>
                <p className="text-xs text-gray-300">PNG, SVG, JPG · Max 2MB</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ColorInput label="Primary Brand Color" value={primaryColor} onChange={setPrimaryColor} />
              <ColorInput label="Secondary Brand Color" value={secondaryColor} onChange={setSecondaryColor} />
            </div>
            <div>
              <label className={LABEL}>Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State ZIP"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Company Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbrokerage.com"
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

        {/* Section 4 — Resources & Quick Links */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            n={4}
            title="Office Resources & Quick Links"
            subtitle="Configure the default office resources available to agents."
          />
          <div className="space-y-4">
            <div>
              <label className={LABEL}>MLS Website</label>
              <input
                type="text"
                value={mlsWebsite}
                onChange={(e) => setMlsWebsite(e.target.value)}
                placeholder="https://mlslistings.com"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Board of Realtors Website</label>
              <input
                type="text"
                value={boardOfRealtorsWebsite}
                onChange={(e) => setBoardOfRealtorsWebsite(e.target.value)}
                placeholder="https://arizonarealtors.com"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Training Calendar Link</label>
              <input
                type="text"
                value={trainingCalendarUrl}
                onChange={(e) => setTrainingCalendarUrl(e.target.value)}
                placeholder="https://calendar.google.com/..."
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Google Drive Link</label>
              <input
                type="text"
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Additional Links</label>
              <div className="space-y-2">
                {additionalLinks.map((link, i) => (
                  <div key={link._key} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(i, { label: e.target.value })}
                      placeholder="Label"
                      className={`${INPUT} flex-1`}
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateLink(i, { url: e.target.value })}
                      placeholder="https://"
                      className={`${INPUT} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLink}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Plus size={13} />
                  Add Link
                </button>
              </div>
            </div>
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
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? 'Submitting…' : (
                <>
                  <CheckCircle size={14} />
                  Submit
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

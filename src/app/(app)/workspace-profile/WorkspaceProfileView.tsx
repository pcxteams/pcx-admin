'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Save, Check } from 'lucide-react';
import LeadershipTeamEditor from '@/components/LeadershipTeamEditor';
import VendorsSection, { type ProfileVendor } from '@/components/VendorsSection';
import CustomizationsSection from '@/components/CustomizationsSection';
import type { WorkspaceProfileData } from './page';

const BRAND = '#009689';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';
const SECTION_SUB = 'text-xs text-gray-400 mb-5';
const LABEL = 'text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5';
const FIELD = 'flex flex-col';
const INPUT =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009689]/30 focus:border-transparent w-full';

function TypeBadge({ type }: { type: 'office' | 'team' }) {
  const Icon = type === 'office' ? Building2 : Users;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <Icon size={11} />
      {type === 'office' ? 'Office' : 'Team'}
    </span>
  );
}

function ReadOnly({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={FIELD}>
      <p className={LABEL}>{label}</p>
      <p className="text-sm text-gray-900">{value || value === 0 ? value : <span className="text-gray-400">—</span>}</p>
    </div>
  );
}

export default function WorkspaceProfileView({
  data,
  vendors,
}: {
  data: WorkspaceProfileData;
  vendors: ProfileVendor[];
}) {
  const router = useRouter();
  const canManage = data.access.canManage;

  const [form, setForm] = useState({
    clientFacingName: data.clientFacingName ?? '',
    timeZone: data.timeZone ?? '',
    address: data.brandingConfig?.address ?? '',
    website: data.brandingConfig?.website ?? '',
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/workspaces/${data.id}/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientFacingName: form.clientFacingName || null,
          timeZone: form.timeZone || null,
          // Merged server-side over existing branding, so logo/colors are preserved.
          brandingConfig: {
            address: form.address || null,
            website: form.website || null,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Failed to save changes. Please try again.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {data.clientFacingName || data.name}
            </h1>
            <TypeBadge type={data.type} />
          </div>
          {canManage && (
            <div className="flex items-center gap-3 shrink-0">
              {error && <span className="text-xs text-red-500">{error}</span>}
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <Check size={13} />Saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: BRAND }}
              >
                <Save size={14} />
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        {/* Workspace Details */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Workspace Details</p>
          <p className={SECTION_SUB}>Information for this workspace.</p>

          {data.brandingConfig?.logo_url && (
            <div className={`${FIELD} mb-6`}>
              <p className={LABEL}>Company Logo</p>
              <div className="mt-1 inline-block rounded-lg border border-gray-200 bg-gray-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.brandingConfig.logo_url} alt="Company logo" className="h-12 max-w-[200px] object-contain" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
            {/* Read-only, PCx/structural fields */}
            <ReadOnly label="Workspace Name (Internal)" value={data.name} />
            <div className={FIELD}>
              <p className={LABEL}>Workspace Type</p>
              <div className="mt-0.5"><TypeBadge type={data.type} /></div>
            </div>
            {data.reportsTo && <ReadOnly label="Parent Office Workspace" value={data.reportsTo.name} />}
            <ReadOnly label="Maximum Users" value={data.maxUsers} />

            {/* Editable brand/contact fields (when canManage) */}
            {canManage ? (
              <>
                <div className={FIELD}>
                  <label className={LABEL}>Company Name</label>
                  <input className={INPUT} value={form.clientFacingName} onChange={set('clientFacingName')} placeholder="Client-facing company name" />
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Time Zone</label>
                  <input className={INPUT} value={form.timeZone} onChange={set('timeZone')} placeholder="e.g. America/Phoenix" />
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Physical Address</label>
                  <input className={INPUT} value={form.address} onChange={set('address')} placeholder="123 Main St, City, State ZIP" />
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Website</label>
                  <input className={INPUT} value={form.website} onChange={set('website')} placeholder="https://example.com" />
                </div>
              </>
            ) : (
              <>
                <ReadOnly label="Company Name" value={data.clientFacingName} />
                <ReadOnly label="Time Zone" value={data.timeZone} />
                <ReadOnly label="Physical Address" value={data.brandingConfig?.address} />
                <ReadOnly label="Website" value={data.brandingConfig?.website} />
              </>
            )}
          </div>
        </div>

        {/* Leadership Team */}
        <LeadershipTeamEditor workspaceId={data.id} initialLeaders={data.leadership} canManage={canManage} />

        {/* Vendors — Office Workspaces only (KAN-99) */}
        {data.type === 'office' && (
          <VendorsSection workspaceId={data.id} initialVendors={vendors} canManage={canManage} />
        )}

        {/* Customizations — setup progress */}
        <CustomizationsSection
          setupCompleted={data.setupCompleted}
          customizationCompleted={data.customizationCompleted}
        />
      </div>
    </>
  );
}

'use client';

import { useCallback, useId, useState } from 'react';
import {
  Building2, Users, ExternalLink, Pencil, Trash2, Plus, Check, X,
} from 'lucide-react';
import LeadershipTeamEditor from '@/components/LeadershipTeamEditor';
import VendorsSection, { type ProfileVendor } from '@/components/VendorsSection';
import CustomizationsSection from '@/components/CustomizationsSection';
import type { WorkspaceSettingsProfile } from './page';

const BRAND = '#009689';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';
const SECTION_SUB = 'text-xs text-gray-400 mb-5';
const LABEL = 'text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5';
const FIELD = 'flex flex-col';
const INPUT = 'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent w-full disabled:bg-gray-50 disabled:text-gray-400';
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

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TypeBadge({ type }: { type: 'office' | 'team' }) {
  const Icon = type === 'office' ? Building2 : Users;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <Icon size={11} />{type === 'office' ? 'Office' : 'Team'}
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-600',
    archived: 'bg-red-50 text-red-500',
    setup_pending: 'bg-gray-100 text-gray-500',
    setup_sent: 'bg-blue-50 text-blue-600',
    setup_viewed: 'bg-purple-50 text-purple-600',
  };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{label}
    </span>
  );
}

interface AdditionalLink { label: string; url: string }
interface VideoItem { _key: string; title: string; source: 'YouTube' | 'Vimeo'; url: string }
interface ResourceItem { _key: string; name: string; type: 'Link' | 'Document'; url: string; videoUrl: string }

interface FormState {
  clientFacingName: string;
  timeZone: string;
  address: string;
  website: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  mlsWebsite: string;
  boardOfRealtorsWebsite: string;
  trainingCalendarUrl: string;
  officeCrmUrl: string;
  additionalLinks: AdditionalLink[];
  videos: VideoItem[];
  resources: ResourceItem[];
}

export default function WorkspaceSettingsView({
  data,
  vendors,
}: {
  data: WorkspaceSettingsProfile;
  vendors: ProfileVendor[];
}) {
  const canManage = data.access.canManage;
  const uid = useId();

  const [form, setForm] = useState<FormState>({
    clientFacingName: data.clientFacingName ?? '',
    timeZone: data.timeZone ?? 'America/Phoenix',
    address: data.brandingConfig?.address ?? '',
    website: data.brandingConfig?.website ?? '',
    logoUrl: data.brandingConfig?.logo_url ?? '',
    primaryColor: data.brandingConfig?.primary_color ?? '',
    secondaryColor: data.brandingConfig?.secondary_color ?? '',
    mlsWebsite: data.settingsConfig?.mls_website ?? '',
    boardOfRealtorsWebsite: data.settingsConfig?.board_of_realtors_website ?? '',
    trainingCalendarUrl: data.settingsConfig?.training_calendar_url ?? '',
    officeCrmUrl: data.settingsConfig?.office_crm_url ?? '',
    additionalLinks: data.settingsConfig?.additional_links ?? [],
    videos: (data.settingsConfig?.videos ?? []).map((v, i) => ({
      _key: `video-${i}`,
      title: v.title,
      source: (v.source === 'Vimeo' ? 'Vimeo' : 'YouTube') as VideoItem['source'],
      url: v.url,
    })),
    resources: (data.settingsConfig?.resources ?? []).map((r, i) => ({
      _key: `resource-${i}`,
      name: r.name,
      type: (r.type === 'Document' ? 'Document' : 'Link') as ResourceItem['type'],
      url: r.url,
      videoUrl: r.video_url ?? '',
    })),
  });

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Logo upload
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoSelect = useCallback(async (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setLogoError('Please upload a PNG, JPG, SVG, or WEBP image.');
      return;
    }
    setLogoError(null);
    setLogoUploading(true);
    try {
      const res = await fetch(`/api/workspaces/${data.id}/profile/logo-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!res.ok) throw new Error('Could not get upload URL.');
      const { uploadUrl, publicUrl } = (await res.json()) as { uploadUrl: string; publicUrl: string };
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!s3Res.ok) throw new Error('Upload to S3 failed.');
      setForm((f) => ({ ...f, logoUrl: publicUrl }));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  }, [data.id]);

  // Additional links editing
  const [editingLinkIdx, setEditingLinkIdx] = useState<number | null>(null);
  const [editLink, setEditLink] = useState<AdditionalLink>({ label: '', url: '' });
  const [newLink, setNewLink] = useState<AdditionalLink>({ label: '', url: '' });

  function startEditLink(i: number) {
    setEditingLinkIdx(i);
    setEditLink({ ...form.additionalLinks[i] });
  }

  function saveEditLink() {
    if (editingLinkIdx === null) return;
    const links = [...form.additionalLinks];
    links[editingLinkIdx] = { ...editLink };
    setForm((f) => ({ ...f, additionalLinks: links }));
    setEditingLinkIdx(null);
  }

  function removeLink(i: number) {
    setForm((f) => ({ ...f, additionalLinks: f.additionalLinks.filter((_, idx) => idx !== i) }));
    if (editingLinkIdx === i) setEditingLinkIdx(null);
  }

  function addLink() {
    if (!newLink.label.trim() || !newLink.url.trim()) return;
    setForm((f) => ({ ...f, additionalLinks: [...f.additionalLinks, { ...newLink }] }));
    setNewLink({ label: '', url: '' });
  }

  // Custom Videos editing
  function addVideo() {
    setForm((f) => ({
      ...f,
      videos: [...f.videos, { _key: `${uid}-vid-${Date.now()}`, title: '', source: 'YouTube', url: '' }],
    }));
  }
  function updateVideo(i: number, patch: Partial<VideoItem>) {
    setForm((f) => ({ ...f, videos: f.videos.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  }
  function removeVideo(i: number) {
    setForm((f) => ({ ...f, videos: f.videos.filter((_, idx) => idx !== i) }));
  }

  // Custom Resources editing
  function addResource() {
    setForm((f) => ({
      ...f,
      resources: [...f.resources, { _key: `${uid}-res-${Date.now()}`, name: '', type: 'Link', url: '', videoUrl: '' }],
    }));
  }
  function updateResource(i: number, patch: Partial<ResourceItem>) {
    setForm((f) => ({ ...f, resources: f.resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  }
  function removeResource(i: number) {
    setForm((f) => ({ ...f, resources: f.resources.filter((_, idx) => idx !== i) }));
  }

  // Save
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/workspaces/${data.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientFacingName: form.clientFacingName || null,
          timeZone: form.timeZone || null,
          brandingConfig: {
            logo_url: form.logoUrl || null,
            primary_color: form.primaryColor || null,
            secondary_color: form.secondaryColor || null,
            address: form.address || null,
            website: form.website || null,
          },
          settingsConfig: {
            mls_website: form.mlsWebsite || null,
            board_of_realtors_website: form.boardOfRealtorsWebsite || null,
            training_calendar_url: form.trainingCalendarUrl || null,
            office_crm_url: form.officeCrmUrl || null,
            additional_links: form.additionalLinks,
            videos: form.videos.map(({ title, source, url }) => ({ title, source, url })),
            resources: form.resources.map(({ name, type, url, videoUrl }) => ({
              name,
              type,
              url,
              video_url: videoUrl || undefined,
            })),
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save changes.');
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.clientFacingName || data.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <TypeBadge type={data.type} />
              <StatusBadge status={data.status} />
            </div>
          </div>
          {canManage && (
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
          )}
        </div>

        <div className="space-y-6">
          {/* Workspace Information */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Workspace Information</p>
            <p className={SECTION_SUB}>Core details for this Workspace.</p>
            <div className="grid grid-cols-3 gap-x-12 gap-y-6">
              <div className={FIELD}>
                <label className={LABEL}>Company Name (Client Facing Brand)</label>
                <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.clientFacingName} onChange={set('clientFacingName')} disabled={!canManage} placeholder="e.g. Scottsdale Office" />
              </div>
              <div className={FIELD}>
                <p className={LABEL}>Workspace Name (Internal)</p>
                <p className="text-sm text-gray-900">{data.name}</p>
              </div>
              <div className={FIELD}>
                <p className={LABEL}>Date Created</p>
                <p className="text-sm text-gray-900">{formatDate(data.createdAt)}</p>
              </div>
              <div className={FIELD}>
                <p className={LABEL}>Workspace Type</p>
                <div className="mt-0.5"><TypeBadge type={data.type} /></div>
              </div>
              <div className={FIELD}>
                <p className={LABEL}>Workspace Status</p>
                <div className="mt-0.5"><StatusBadge status={data.status} /></div>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Time Zone</label>
                <select value={form.timeZone} onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))} disabled={!canManage} className={`${INPUT} ${INPUT_FOCUS}`}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Physical Address</label>
                <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.address} onChange={set('address')} disabled={!canManage} placeholder="123 Main St, Phoenix, AZ" />
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Website</label>
                <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.website} onChange={set('website')} disabled={!canManage} placeholder="https://example.com" />
              </div>
            </div>
          </div>

          {/* Subscription — read-only; plan changes are billing/master-only */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Subscription</p>
            <p className={SECTION_SUB}>Current plan for this Workspace.</p>
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <ReadOnly
                label="Plan"
                value={data.subscriptionPlan ? data.subscriptionPlan.replace(/\b\w/g, (c) => c.toUpperCase()) : null}
              />
              <ReadOnly label="Users" value={data.maxUsers ?? 'Unlimited'} />
            </div>
          </div>

          {/* Reporting Relationship — read-only; changing it is master-only */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Reporting Relationship</p>
            <p className={SECTION_SUB}>Workspace reporting hierarchy.</p>
            {data.reportsTo ? (
              <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm font-semibold shrink-0" style={{ backgroundColor: BRAND }}>
                  {initials(data.reportsTo.name)}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Reports To</p>
                  <p className="text-sm font-semibold text-gray-900">{data.reportsTo.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{data.reportsTo.type}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {data.type === 'office' ? 'Offices do not report to other workspaces.' : 'No reporting relationship assigned.'}
              </p>
            )}
          </div>

          {/* Workspace Teams — read-only; only Offices have Teams reporting to them */}
          {data.type === 'office' && (
            <div className={SECTION}>
              <p className={SECTION_TITLE}>Workspace Teams</p>
              <p className={SECTION_SUB}>Teams operating within this Workspace.</p>
              {data.workspaceTeams.length === 0 ? (
                <p className="text-sm text-gray-400">No Teams reporting to this Workspace.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        {['Name', 'Team Name', 'Assigned Agents', 'Last Active', 'Status'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.workspaceTeams.map((team) => (
                        <tr key={team.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold shrink-0" style={{ backgroundColor: BRAND }}>
                                {initials(team.contactName ?? team.name)}
                              </div>
                              <span className="font-medium text-gray-900">{team.contactName ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{team.name}</td>
                          <td className="px-4 py-3 text-gray-600 font-medium">{team.assignedAgents}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(team.lastActive)}</td>
                          <td className="px-4 py-3"><StatusBadge status={team.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Branding */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Branding</p>
            <p className={SECTION_SUB}>Logo and brand colors displayed across this Workspace.</p>
            <div className={`${FIELD} mb-6`}>
              <p className={LABEL}>Company Logo</p>
              <div className="mt-1 flex items-center gap-4">
                {form.logoUrl && (
                  <div className="inline-block rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logoUrl} alt="Workspace logo" className="h-12 max-w-[200px] object-contain" />
                  </div>
                )}
                {canManage && (
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer">
                    {logoUploading ? 'Uploading…' : 'Upload Logo'}
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
                )}
              </div>
              {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div className={FIELD}>
                <label className={LABEL}>Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor || '#000000'}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    disabled={!canManage}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0 disabled:cursor-not-allowed"
                  />
                  <input className={`${INPUT} ${INPUT_FOCUS} font-mono`} value={form.primaryColor} onChange={set('primaryColor')} disabled={!canManage} placeholder="#000000" maxLength={7} />
                </div>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Secondary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor || '#000000'}
                    onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    disabled={!canManage}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0 disabled:cursor-not-allowed"
                  />
                  <input className={`${INPUT} ${INPUT_FOCUS} font-mono`} value={form.secondaryColor} onChange={set('secondaryColor')} disabled={!canManage} placeholder="#000000" maxLength={7} />
                </div>
              </div>
            </div>
          </div>

          {/* Leadership Team */}
          <LeadershipTeamEditor workspaceId={data.id} initialLeaders={data.leadership} canManage={canManage} />

          {/* Vendors — Office Workspaces only (KAN-99) */}
          {data.type === 'office' && (
            <VendorsSection workspaceId={data.id} initialVendors={vendors} canManage={canManage} />
          )}

          {/* Office Resources & Quick Links */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Office Resources</p>
            <p className={SECTION_SUB}>Resources displayed throughout the Workspace and Agent Office page.</p>

            <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8">
              <div className={FIELD}>
                <label className={LABEL}>Training Calendar Link</label>
                <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.trainingCalendarUrl} onChange={set('trainingCalendarUrl')} disabled={!canManage} placeholder="https://..." />
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Office CRM</label>
                <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.officeCrmUrl} onChange={set('officeCrmUrl')} disabled={!canManage} placeholder="https://crm.example.com" />
              </div>
              <div className={FIELD}>
                <label className={LABEL}>MLS Website</label>
                <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.mlsWebsite} onChange={set('mlsWebsite')} disabled={!canManage} placeholder="https://..." />
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Board of Realtors Website</label>
                <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.boardOfRealtorsWebsite} onChange={set('boardOfRealtorsWebsite')} disabled={!canManage} placeholder="https://..." />
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-700 mb-3">Additional Links</p>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase w-48">Link Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">URL</th>
                    {canManage && <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-widest text-gray-400 uppercase w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {form.additionalLinks.map((link, i) => (
                    <tr key={i} className="group hover:bg-gray-50">
                      {editingLinkIdx === i ? (
                        <>
                          <td className="px-3 py-2">
                            <input className={`${INPUT} ${INPUT_FOCUS}`} value={editLink.label} onChange={(e) => setEditLink((l) => ({ ...l, label: e.target.value }))} placeholder="Link name" autoFocus />
                          </td>
                          <td className="px-3 py-2">
                            <input className={`${INPUT} ${INPUT_FOCUS}`} value={editLink.url} onChange={(e) => setEditLink((l) => ({ ...l, url: e.target.value }))} placeholder="https://..." />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={saveEditLink} className="p-1.5 rounded text-green-600 hover:bg-green-50">
                                <Check size={14} />
                              </button>
                              <button type="button" onClick={() => setEditingLinkIdx(null)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100">
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900">{link.label}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <ExternalLink size={11} className="shrink-0 text-gray-300" />
                              <span className="truncate">{link.url}</span>
                            </div>
                          </td>
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => startEditLink(i)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                                  <Pencil size={13} />
                                </button>
                                <button type="button" onClick={() => removeLink(i)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                  {canManage && (
                    <tr className="bg-gray-50/60">
                      <td className="px-3 py-2.5">
                        <input
                          className={`${INPUT} ${INPUT_FOCUS} bg-white`}
                          value={newLink.label}
                          onChange={(e) => setNewLink((l) => ({ ...l, label: e.target.value }))}
                          placeholder="Link name"
                          onKeyDown={(e) => e.key === 'Enter' && addLink()}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          className={`${INPUT} ${INPUT_FOCUS} bg-white`}
                          value={newLink.url}
                          onChange={(e) => setNewLink((l) => ({ ...l, url: e.target.value }))}
                          placeholder="https://..."
                          onKeyDown={(e) => e.key === 'Enter' && addLink()}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={addLink}
                          disabled={!newLink.label.trim() || !newLink.url.trim()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          <Plus size={12} />
                          Add Link
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom Videos */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Custom Videos</p>
            <p className={SECTION_SUB}>Videos displayed throughout the Workspace and Agent Office page.</p>
            <div className="space-y-3">
              {form.videos.map((video, i) => (
                <div key={video._key} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Video {i + 1}</span>
                    {canManage && (
                      <button type="button" onClick={() => removeVideo(i)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div className={FIELD}>
                      <label className={LABEL}>Video Title</label>
                      <input className={`${INPUT} ${INPUT_FOCUS}`} value={video.title} onChange={(e) => updateVideo(i, { title: e.target.value })} disabled={!canManage} placeholder="e.g. Welcome from the Team" />
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Source</label>
                      <select className={`${INPUT} ${INPUT_FOCUS}`} value={video.source} onChange={(e) => updateVideo(i, { source: e.target.value as VideoItem['source'] })} disabled={!canManage}>
                        <option value="YouTube">YouTube</option>
                        <option value="Vimeo">Vimeo</option>
                      </select>
                    </div>
                  </div>
                  <div className={`${FIELD} mt-3`}>
                    <label className={LABEL}>{video.source} URL</label>
                    <input className={`${INPUT} ${INPUT_FOCUS}`} value={video.url} onChange={(e) => updateVideo(i, { url: e.target.value })} disabled={!canManage} placeholder="https://youtube.com/watch?v=…" />
                  </div>
                </div>
              ))}
              {canManage && (
                <button
                  type="button"
                  onClick={addVideo}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  <Plus size={14} />
                  Add Video
                </button>
              )}
            </div>
          </div>

          {/* Custom Resources */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Custom Resources</p>
            <p className={SECTION_SUB}>Resources displayed throughout the Workspace and Agent Office page.</p>
            <div className="space-y-3">
              {form.resources.map((resource, i) => (
                <div key={resource._key} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Resource {i + 1}</span>
                    {canManage && (
                      <button type="button" onClick={() => removeResource(i)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className={`${FIELD} mb-3`}>
                    <label className={LABEL}>Resource Name</label>
                    <input className={`${INPUT} ${INPUT_FOCUS}`} value={resource.name} onChange={(e) => updateResource(i, { name: e.target.value })} disabled={!canManage} placeholder="e.g. Agent Handbook" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-3">
                    <div className={FIELD}>
                      <label className={LABEL}>Resource Type</label>
                      <select className={`${INPUT} ${INPUT_FOCUS}`} value={resource.type} onChange={(e) => updateResource(i, { type: e.target.value as ResourceItem['type'] })} disabled={!canManage}>
                        <option value="Link">Link</option>
                        <option value="Document">Document</option>
                      </select>
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>URL</label>
                      <input className={`${INPUT} ${INPUT_FOCUS}`} value={resource.url} onChange={(e) => updateResource(i, { url: e.target.value })} disabled={!canManage} placeholder="https://…" />
                    </div>
                  </div>
                  <div className={FIELD}>
                    <label className={LABEL}>Optional Video URL</label>
                    <input className={`${INPUT} ${INPUT_FOCUS}`} value={resource.videoUrl} onChange={(e) => updateResource(i, { videoUrl: e.target.value })} disabled={!canManage} placeholder="https://youtube.com/… or https://vimeo.com/…" />
                  </div>
                </div>
              ))}
              {canManage && (
                <button
                  type="button"
                  onClick={addResource}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  <Plus size={14} />
                  Add Resource
                </button>
              )}
            </div>
          </div>

          {/* Customizations — setup progress */}
          <CustomizationsSection
            setupCompleted={data.setupCompleted}
            customizationCompleted={data.customizationCompleted}
          />
        </div>
      </div>
    </div>
  );
}

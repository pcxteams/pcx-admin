'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Users, AlertTriangle, X, ExternalLink, ArrowLeft,
  Save, Pencil, Trash2, Plus, Check, Search,
} from 'lucide-react';
import type { WorkspaceDetail } from './page';
import LeadershipTeamEditor from '@/components/LeadershipTeamEditor';
import VendorsSection, { type ProfileVendor } from '@/components/VendorsSection';
import CustomizationsSection from '@/components/CustomizationsSection';

const BRAND = '#009689';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';
const SECTION_SUB = 'text-xs text-gray-400 mb-5';
const LABEL = 'text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5';
const FIELD = 'flex flex-col';
const INPUT = 'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent w-full';
const INPUT_FOCUS = 'focus:ring-[#009689]/30';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status, billingStatus }: { status: string; billingStatus: string | null }) {
  if (billingStatus === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Suspended
      </span>
    );
  }
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

function TypeBadge({ type }: { type: 'office' | 'team' }) {
  const Icon = type === 'office' ? Building2 : Users;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <Icon size={11} />{type === 'office' ? 'Office' : 'Team'}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-sm text-gray-400">—</span>;
  const cls = plan === 'pro' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600';
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>{plan}</span>;
}

interface FormState {
  name: string;
  clientFacingName: string;
  timeZone: string;
  address: string;
  website: string;
  reportsTo: { id: string; name: string; type: 'office' | 'team' } | null;
  primaryColor: string;
  secondaryColor: string;
  trainingCalendarUrl: string;
  officeCrmUrl: string;
  mlsWebsite: string;
  boardOfRealtorsWebsite: string;
  additionalLinks: { label: string; url: string }[];
}

interface AdditionalLink { label: string; url: string }

export default function WorkspaceDetailView({
  data,
  vendors,
}: {
  data: WorkspaceDetail;
  vendors: ProfileVendor[];
}) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: data.name,
    clientFacingName: data.clientFacingName ?? '',
    timeZone: data.timeZone ?? '',
    address: data.brandingConfig?.address ?? '',
    website: data.brandingConfig?.website ?? '',
    reportsTo: data.reportsTo,
    primaryColor: data.brandingConfig?.primary_color ?? '',
    secondaryColor: data.brandingConfig?.secondary_color ?? '',
    trainingCalendarUrl: data.settingsConfig?.training_calendar_url ?? '',
    officeCrmUrl: data.settingsConfig?.office_crm_url ?? '',
    mlsWebsite: data.settingsConfig?.mls_website ?? '',
    boardOfRealtorsWebsite: data.settingsConfig?.board_of_realtors_website ?? '',
    additionalLinks: data.settingsConfig?.additional_links ?? [],
  });

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Save
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/workspaces/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          clientFacingName: form.clientFacingName || null,
          timeZone: form.timeZone || null,
          reportsToWorkspaceId: form.reportsTo?.id ?? null,
          brandingConfig: {
            primary_color: form.primaryColor || null,
            secondary_color: form.secondaryColor || null,
            address: form.address || null,
            website: form.website || null,
          },
          settingsConfig: {
            training_calendar_url: form.trainingCalendarUrl || null,
            office_crm_url: form.officeCrmUrl || null,
            mls_website: form.mlsWebsite || null,
            board_of_realtors_website: form.boardOfRealtorsWebsite || null,
            additional_links: form.additionalLinks,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setSaveError(body.message ?? 'Failed to save changes. Please try again.');
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    } catch {
      setSaveError('Network error. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Reporting relationship modal
  const [changeReportsTo, setChangeReportsTo] = useState(false);

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

  // Admin actions
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isSuspended = data.billing.billingStatus === 'suspended';

  async function doAction(path: string, method = 'PATCH') {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/workspaces/${data.id}/${path}`, { method, credentials: 'include' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setActionError(body.message ?? 'Something went wrong.');
        return false;
      }
      return true;
    } catch {
      setActionError('Network error.');
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  const isArchived = data.status === 'archived';

  async function handleSuspend() {
    if (await doAction(isSuspended ? 'unsuspend' : 'suspend')) { setSuspendOpen(false); router.refresh(); }
  }
  async function handleArchive() {
    if (await doAction(isArchived ? 'restore' : 'archive')) { setArchiveOpen(false); router.refresh(); }
  }
  async function handleDelete() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/workspaces/${data.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setActionError(body.message ?? 'Something went wrong.');
        return;
      }
      router.push('/workspaces');
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <Link
            href="/workspaces"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2"
          >
            <ArrowLeft size={12} />
            Back to workspaces
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 truncate">{form.name || data.name}</h1>
              <TypeBadge type={data.type} />
              <StatusBadge status={data.status} billingStatus={data.billing.billingStatus} />
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-6">
              {saveError && <span className="text-xs text-red-500">{saveError}</span>}
              {saveSuccess && (
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
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {/* Workspace Details */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Workspace Details</p>
          <p className={SECTION_SUB}>Core workspace details and configuration.</p>
          <div className="grid grid-cols-3 gap-x-12 gap-y-6">
            <div className={FIELD}>
              <label className={LABEL}>Company Name (Client Facing Brand)</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.clientFacingName} onChange={set('clientFacingName')} placeholder="e.g. Scottsdale Office" />
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Workspace Name (Internal)</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.name} onChange={set('name')} placeholder="Internal name" />
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
              <div className="mt-0.5"><StatusBadge status={data.status} billingStatus={data.billing.billingStatus} /></div>
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Time Zone</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.timeZone} onChange={set('timeZone')} placeholder="e.g. America/Phoenix" />
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Physical Address</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.address} onChange={set('address')} placeholder="123 Main St, Phoenix, AZ" />
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Website</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.website} onChange={set('website')} placeholder="https://example.com" />
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Maximum Users</p>
              <p className="text-sm text-gray-900">
                {data.billing.seatLimit ?? <span className="text-gray-400">—</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription — read-only */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Subscription</p>
          <p className={SECTION_SUB}>Billing plan and seat allocation.</p>
          <div className="grid grid-cols-4 gap-x-12 gap-y-6">
            <div className={FIELD}>
              <p className={LABEL}>Plan</p>
              <div className="mt-0.5"><PlanBadge plan={data.billing.subscriptionPlan} /></div>
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Users</p>
              <p className="text-sm text-gray-900">
                {data.memberCount}{data.billing.seatLimit ? ` / ${data.billing.seatLimit} seats` : ''}
              </p>
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Monthly Amount</p>
              <p className="text-sm text-gray-900">
                {data.billing.subscriptionAmount > 0
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.billing.subscriptionAmount) + '/mo'
                  : <span className="text-gray-400">—</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Reporting Relationship */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Reporting Relationship</p>
          <p className={SECTION_SUB}>Workspace reporting hierarchy.</p>
          {form.reportsTo ? (
            <div className="flex items-center gap-4">
              <div className="flex items-start gap-3 flex-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 hidden">REPORTS TO</p>
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm font-semibold shrink-0"
                  style={{ backgroundColor: BRAND }}
                >
                  {initials(form.reportsTo.name)}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Reports To</p>
                  <p className="text-sm font-semibold text-gray-900">{form.reportsTo.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{form.reportsTo.type}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setChangeReportsTo(true)}
                  disabled={data.type === 'office'}
                  title={data.type === 'office' ? 'Offices do not report to other workspaces.' : undefined}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-200"
                >
                  Change Reporting Relationship
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reportsTo: null }))}
                  className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors text-left px-1"
                >
                  Remove Reporting Relationship
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-400 flex-1">
                {data.type === 'office' ? 'Offices do not report to other workspaces.' : 'No reporting relationship assigned.'}
              </p>
              <button
                type="button"
                onClick={() => setChangeReportsTo(true)}
                disabled={data.type === 'office'}
                title={data.type === 'office' ? 'Offices do not report to other workspaces.' : undefined}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-200"
              >
                Set Reporting Relationship
              </button>
            </div>
          )}
        </div>

        {/* Leadership Team — editable (master can always manage) */}
        <LeadershipTeamEditor workspaceId={data.id} initialLeaders={data.leaders} canManage />

        {/* Workspace Teams — placeholder */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Workspace Teams</p>
          <p className={SECTION_SUB}>Teams operating within this Workspace.</p>
          <p className="text-sm text-gray-400">No teams configured.</p>
        </div>

        {/* Vendors — Office Workspaces only (KAN-99) */}
        {data.type === 'office' && (
          <VendorsSection workspaceId={data.id} initialVendors={vendors} canManage />
        )}

        {/* Branding */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Branding</p>
          <p className={SECTION_SUB}>Visual identity for this workspace.</p>
          {data.brandingConfig?.logo_url && (
            <div className={`${FIELD} mb-6`}>
              <p className={LABEL}>Logo</p>
              <div className="mt-1 inline-block rounded-lg border border-gray-200 bg-gray-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.brandingConfig.logo_url} alt="Workspace logo" className="h-12 max-w-[200px] object-contain" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className={FIELD}>
              <label className={LABEL}>Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor || '#000000'}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"
                />
                <input
                  className={`${INPUT} ${INPUT_FOCUS} font-mono`}
                  value={form.primaryColor}
                  onChange={set('primaryColor')}
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondaryColor || '#000000'}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"
                />
                <input
                  className={`${INPUT} ${INPUT_FOCUS} font-mono`}
                  value={form.secondaryColor}
                  onChange={set('secondaryColor')}
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Office Resources */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Office Resources</p>
          <p className={SECTION_SUB}>Resources displayed throughout the Workspace and Agent Office page.</p>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8">
            <div className={FIELD}>
              <label className={LABEL}>Training Calendar Link</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.trainingCalendarUrl} onChange={set('trainingCalendarUrl')} placeholder="https://..." />
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Office CRM</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.officeCrmUrl} onChange={set('officeCrmUrl')} placeholder="https://..." />
            </div>
            <div className={FIELD}>
              <label className={LABEL}>MLS Website</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.mlsWebsite} onChange={set('mlsWebsite')} placeholder="https://..." />
            </div>
            <div className={FIELD}>
              <label className={LABEL}>Board of Realtors Website</label>
              <input className={`${INPUT} ${INPUT_FOCUS}`} value={form.boardOfRealtorsWebsite} onChange={set('boardOfRealtorsWebsite')} placeholder="https://..." />
            </div>
          </div>

          {/* Additional Links table */}
          <p className="text-xs font-semibold text-gray-700 mb-3">Additional Links</p>
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase w-48">Link Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">URL</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-widest text-gray-400 uppercase w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {form.additionalLinks.map((link, i) => (
                  <tr key={i} className="group hover:bg-gray-50">
                    {editingLinkIdx === i ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            className={`${INPUT} ${INPUT_FOCUS}`}
                            value={editLink.label}
                            onChange={(e) => setEditLink((l) => ({ ...l, label: e.target.value }))}
                            placeholder="Link name"
                            autoFocus
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className={`${INPUT} ${INPUT_FOCUS}`}
                            value={editLink.url}
                            onChange={(e) => setEditLink((l) => ({ ...l, url: e.target.value }))}
                            placeholder="https://..."
                          />
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
                      </>
                    )}
                  </tr>
                ))}
                {/* Add link row */}
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit History */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Audit History</p>
          <p className={SECTION_SUB}>Recent Workspace administrative activity.</p>
          <div className="grid grid-cols-3 gap-x-12 gap-y-6">
            <div className={FIELD}>
              <p className={LABEL}>Created Date</p>
              <p className="text-sm text-gray-900">{formatDate(data.createdAt)}</p>
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Primary Contact</p>
              <p className="text-sm text-gray-900">{data.primaryContact.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{data.primaryContact.email}</p>
            </div>
            <div className={FIELD}>
              <p className={LABEL}>Last Updated</p>
              <p className="text-sm text-gray-900">{formatDate(data.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Customizations — setup progress */}
        <CustomizationsSection
          setupCompleted={data.setupCompleted}
          customizationCompleted={data.customizationCompleted}
        />

        {/* PCx Master Only */}
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="text-base font-semibold text-red-700">PCx Master Only</p>
          </div>
          <p className="text-sm text-red-500 mb-5">These actions permanently affect this Workspace.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setSuspendOpen(true); setActionError(null); }}
              disabled={isArchived}
              title={isArchived ? 'Restore the workspace before suspending it.' : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <AlertTriangle size={14} />
              {isSuspended ? 'Re-activate Workspace' : 'Suspend Workspace'}
            </button>
            <button
              type="button"
              onClick={() => { setArchiveOpen(true); setActionError(null); }}
              disabled={isSuspended}
              title={isSuspended ? 'Re-activate the workspace before archiving it.' : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <AlertTriangle size={14} />
              {isArchived ? 'Restore Workspace' : 'Archive Workspace'}
            </button>
            <button
              type="button"
              onClick={() => { setDeleteOpen(true); setActionError(null); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <AlertTriangle size={14} />Delete Workspace
            </button>
          </div>
        </div>

      </div>

      {/* ── Change Reporting Relationship modal ── */}
      {changeReportsTo && (
        <ReportsToModal
          currentId={data.id}
          onSelect={(ws) => { setForm((f) => ({ ...f, reportsTo: ws })); setChangeReportsTo(false); }}
          onClose={() => setChangeReportsTo(false)}
        />
      )}

      {/* ── Admin confirm modals ── */}
      {suspendOpen && (
        <ConfirmModal
          title={isSuspended ? 'Re-activate workspace?' : 'Suspend workspace?'}
          description={isSuspended ? 'This will lift the suspension and restore normal access for workspace members.' : 'This will suspend the workspace. Members will lose access until it is re-activated.'}
          confirmLabel={isSuspended ? 'Re-activate' : 'Suspend'}
          loading={actionLoading} error={actionError}
          onConfirm={handleSuspend} onClose={() => { setSuspendOpen(false); setActionError(null); }}
        />
      )}
      {archiveOpen && (
        <ConfirmModal
          title={isArchived ? 'Restore workspace?' : 'Archive workspace?'}
          description={isArchived ? 'This will restore the workspace to active status.' : 'This will move the workspace to archived status. You can restore it at any time.'}
          confirmLabel={isArchived ? 'Restore' : 'Archive'}
          loading={actionLoading} error={actionError}
          onConfirm={handleArchive} onClose={() => { setArchiveOpen(false); setActionError(null); }}
        />
      )}
      {deleteOpen && (
        <ConfirmModal
          title="Delete workspace permanently?"
          description="This action cannot be undone. All workspace data, memberships, and associated user accounts will be permanently deleted."
          confirmLabel="Delete permanently"
          loading={actionLoading} error={actionError}
          onConfirm={handleDelete} onClose={() => { setDeleteOpen(false); setActionError(null); }}
        />
      )}
    </>
  );
}

// ── Reports-to picker modal ──────────────────────────────────────────────────

function ReportsToModal({
  currentId,
  onSelect,
  onClose,
}: {
  currentId: string;
  onSelect: (ws: { id: string; name: string; type: 'office' | 'team' }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; type: 'office' | 'team' }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workspaces', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const active = (d.active ?? []) as { id: string; name: string; type: 'office' | 'team' }[];
        setWorkspaces(active.filter((w) => w.id !== currentId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentId]);

  const filtered = workspaces.filter((w) =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Select Reporting Workspace</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009689]/30"
              placeholder="Search workspaces…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No workspaces found.</p>
          ) : (
            filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelect(w)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-semibold shrink-0" style={{ backgroundColor: BRAND }}>
                  {initials(w.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{w.type}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Generic confirm modal ────────────────────────────────────────────────────

function ConfirmModal({
  title, description, confirmLabel, loading, error, onConfirm, onClose,
}: {
  title: string; description: string; confirmLabel: string;
  loading: boolean; error: string | null; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
            <button type="button" onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 disabled:opacity-40">
              <X size={18} />
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button" onClick={onConfirm} disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

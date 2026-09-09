'use client';

import { useState } from 'react';
import { Loader2, Globe2, Building2, Users, CheckSquare } from 'lucide-react';
import {
  CONTENT_TYPES, CONTENT_CATEGORIES, TYPE_META,
  CONTENT_PRIORITIES, AGENT_LEVELS, CONTENT_PURPOSES, ASSIGNMENT_STATUSES,
  RESOURCE_ACCEPT, VIDEO_ACCEPT, LEADER_VERIFICATION_TYPES, parseVideoEmbedUrl,
  type ContentType, type ContentPriority, type AgentLevel, type ContentPurpose,
  type AssignmentStatus,
} from '@/lib/content';

interface Workspace {
  id: string;
  name: string;
  type: 'office' | 'team';
}

type Scope = 'single' | 'subset' | 'global';

const LABEL = 'block text-xs font-medium text-gray-600 mb-1.5';
const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

/**
 * PCx Platform > Content Library — creates master content (see
 * CreateMasterContentDto / POST /master/content on the API side).
 *
 * Deliberately NOT sharing ContentFormModal's implementation: that component
 * is tightly coupled to a single workspaceId + the manager assignment-target
 * field, and reworking it to also carry a multi-workspace scope picker would
 * have meant a riskier refactor of a working, tested form. Fields below
 * mirror it (same lib/content.ts constants/types) but are a separate,
 * trimmed implementation — some duplication traded for not touching
 * ContentFormModal at all.
 *
 * File uploads: "single" scope uploads through the existing workspace-scoped
 * route (the content genuinely belongs to that one workspace). "subset" and
 * "global" scope — where there's no single owning workspace — use the
 * dedicated POST /master/content/upload-url route instead, keyed
 * master/content/{id}/{file}, no workspace involved.
 */
export default function MasterContentView({ workspaces }: { workspaces: Workspace[] }) {
  const [scope, setScope] = useState<Scope>('single');
  const [singleWorkspaceId, setSingleWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [subsetIds, setSubsetIds] = useState<string[]>([]);

  const [type, setType] = useState<ContentType>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [estTime, setEstTime] = useState('');
  const [priority, setPriority] = useState<ContentPriority | ''>('');
  const [agentLevels, setAgentLevels] = useState<AgentLevel[]>([]);
  const [purpose, setPurpose] = useState<ContentPurpose | ''>('');
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus | ''>('');

  const [videoSource, setVideoSource] = useState<'upload' | 'embed'>('embed');
  const [videoUrl, setVideoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [verificationType, setVerificationType] = useState<string>(LEADER_VERIFICATION_TYPES[0].value);
  const [linkUrl, setLinkUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);

  function toggleAgentLevel(level: AgentLevel) {
    setAgentLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }
  function toggleSubset(id: string) {
    setSubsetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function uploadFile(f: File): Promise<{ fileKey: string; fileName: string }> {
    const uploadUrlEndpoint = scope === 'single'
      ? `/api/workspaces/${singleWorkspaceId}/content/upload-url`
      : '/api/master/content/upload-url';
    const urlRes = await fetch(uploadUrlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        kind: type === 'video' ? 'video' : 'resource',
        fileName: f.name,
        contentType: f.type,
        fileSizeBytes: f.size,
      }),
    });
    if (!urlRes.ok) throw new Error('Could not prepare the upload.');
    const { uploadUrl, key, fileName } = (await urlRes.json()) as {
      uploadUrl: string; key: string; fileName: string;
    };
    const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': f.type }, body: f });
    if (!put.ok) throw new Error('File upload failed.');
    return { fileKey: key, fileName };
  }

  function clientValidate(): string | null {
    if (!title.trim()) return 'Title is required.';
    if (scope === 'single' && !singleWorkspaceId) return 'Choose a workspace.';
    if (scope === 'subset' && subsetIds.length === 0) return 'Select at least one workspace.';
    if (type === 'video') {
      if (videoSource === 'embed' && !parseVideoEmbedUrl(videoUrl.trim()))
        return 'Add a YouTube or Vimeo video link.';
      if (videoSource === 'upload' && !file) return 'Please choose a video file to upload.';
    }
    if (type === 'resource' && !file) return 'Please choose a file to upload.';
    if (type === 'external_link' && !/^https?:\/\//i.test(linkUrl.trim()))
      return 'The URL must start with http:// or https://.';
    return null;
  }

  async function buildConfig(): Promise<Record<string, unknown>> {
    switch (type) {
      case 'external_link':
        return { url: linkUrl.trim() };
      case 'video':
        if (videoSource === 'embed') {
          const parsed = parseVideoEmbedUrl(videoUrl.trim())!;
          return { source: 'embed', url: videoUrl.trim(), ...parsed };
        }
        const upV = await uploadFile(file!);
        return { source: 'upload', fileKey: upV.fileKey, fileName: upV.fileName, mimeType: file!.type, fileSizeBytes: file!.size };
      case 'resource': {
        const upR = await uploadFile(file!);
        return { fileKey: upR.fileKey, fileName: upR.fileName, mimeType: file!.type, fileSizeBytes: file!.size };
      }
      case 'leader_verification':
        return { verificationType, leaderActions: ['approve', 'reject'] };
    }
  }

  async function handleSave() {
    const err = clientValidate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    setSavedTitle(null);
    try {
      const config = await buildConfig();
      const base: Record<string, unknown> = {
        type, title: title.trim(), description: description.trim() || null,
        category: category || null, estTime: estTime.trim() || null, config,
        priority: priority || null, agentLevels, purpose: purpose || null,
        assignmentStatus: assignmentStatus || null,
      };

      const url = scope === 'single'
        ? `/api/workspaces/${singleWorkspaceId}/content`
        : '/api/master/content';
      if (scope === 'subset') base.targetWorkspaceIds = subsetIds;
      if (scope === 'global') base.broadcastToAllWorkspaces = true;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(base),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      setSavedTitle(title.trim());
      setTitle(''); setDescription(''); setFile(null); setVideoUrl(''); setLinkUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Content Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          Create master content for one workspace, a subset, or every workspace at once.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        {/* Scope picker */}
        <div>
          <label className={LABEL}>Scope</label>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            {([
              { v: 'single', label: 'Single workspace', Icon: Building2 },
              { v: 'subset', label: 'Specific workspaces', Icon: Users },
              { v: 'global', label: 'All workspaces', Icon: Globe2 },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setScope(v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  scope === v ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {scope === 'single' && (
          <div>
            <label className={LABEL}>Workspace</label>
            <select className={INPUT} value={singleWorkspaceId} onChange={(e) => setSingleWorkspaceId(e.target.value)}>
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {scope === 'subset' && (
          <div>
            <label className={LABEL}>Workspaces <span className="text-red-500">*</span></label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
              {workspaces.map((w) => (
                <label key={w.id} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={subsetIds.includes(w.id)} onChange={() => toggleSubset(w.id)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  {w.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {scope === 'global' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckSquare size={14} /> Visible to every workspace, including ones created later.
          </p>
        )}

        <div>
          <label className={LABEL}>Type</label>
          <div className="flex flex-wrap gap-1.5">
            {CONTENT_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  type === t ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL}>Title <span className="text-red-500">*</span></label>
          <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title" />
        </div>
        <div>
          <label className={LABEL}>Description</label>
          <textarea className={`${INPUT} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {type === 'video' && (
          <div className="space-y-3">
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
              {(['embed', 'upload'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setVideoSource(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    videoSource === s ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {s === 'upload' ? 'Upload file' : 'Video link'}
                </button>
              ))}
            </div>
            {videoSource === 'embed' ? (
              <input key="embed" className={INPUT} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…" />
            ) : (
              <input key="upload" type="file" accept={VIDEO_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            )}
          </div>
        )}
        {type === 'resource' && (
          <input type="file" accept={RESOURCE_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        )}
        {type === 'external_link' && (
          <input className={INPUT} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
        )}
        {type === 'leader_verification' && (
          <select className={INPUT} value={verificationType} onChange={(e) => setVerificationType(e.target.value)}>
            {LEADER_VERIFICATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Category</label>
            <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">None</option>
              {CONTENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Est. Time</label>
            <input className={INPUT} value={estTime} onChange={(e) => setEstTime(e.target.value)} placeholder="e.g. 15 min" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3.5 space-y-3.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Ranking Tags</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Priority</label>
              <select className={INPUT} value={priority} onChange={(e) => setPriority(e.target.value as ContentPriority | '')}>
                <option value="">None</option>
                {CONTENT_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Assignment Status</label>
              <select className={INPUT} value={assignmentStatus} onChange={(e) => setAssignmentStatus(e.target.value as AssignmentStatus | '')}>
                <option value="">None</option>
                {ASSIGNMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Purpose</label>
            <select className={INPUT} value={purpose} onChange={(e) => setPurpose(e.target.value as ContentPurpose | '')}>
              <option value="">None</option>
              {CONTENT_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Agent Level</label>
            <div className="flex flex-wrap gap-3">
              {AGENT_LEVELS.map((l) => (
                <label key={l.value} className="inline-flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={agentLevels.includes(l.value)} onChange={() => toggleAgentLevel(l.value)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {savedTitle && <p className="text-sm text-teal-700">&quot;{savedTitle}&quot; created.</p>}

        <div className="flex justify-end pt-2">
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 cursor-pointer">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { X, Loader2, Globe2, Building2, Users, CheckSquare, Upload, FileText } from 'lucide-react';
import {
  CONTENT_TYPES, CONTENT_CATEGORIES, TYPE_META,
  CONTENT_PRIORITIES, AGENT_LEVELS, CONTENT_PURPOSES, ASSIGNMENT_STATUSES,
  RESOURCE_ACCEPT, VIDEO_ACCEPT, LEADER_VERIFICATION_TYPES, parseVideoEmbedUrl, formatDuration,
  type ContentType, type ContentStatus, type ContentPriority, type AgentLevel, type ContentPurpose,
  type AssignmentStatus, type ContentItemDetail, type MasterContentItemSummary,
  type VideoConfig, type ResourceConfig, type ExternalLinkConfig, type LeaderVerificationConfig,
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

const MAX_RESOURCE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Read a video file's duration (seconds) in the browser by loading just its
 * metadata. Resolves null when the duration can't be determined — an
 * undecodable container, a stream without a known length, or a load error.
 * Duplicated from ContentFormModal (see the file-level doc comment below for
 * why this file doesn't share implementation with it).
 */
function readVideoDuration(f: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(f);
    const video = document.createElement('video');
    const done = (seconds: number | null) => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      resolve(seconds);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const d = video.duration;
      done(Number.isFinite(d) && d > 0 ? d : null);
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}

/**
 * PCx Platform > Content Library — the "Add content" modal, creating master
 * content (see CreateMasterContentDto / POST /master/content on the API
 * side). Extracted from what was originally the whole page — the list view
 * (MasterContentView) now owns browsing, this owns creation only.
 *
 * Deliberately NOT sharing ContentFormModal's implementation: that component
 * is tightly coupled to a single workspaceId + edit-mode, and reworking it to
 * also carry a multi-workspace scope picker would have meant a riskier
 * refactor of a working, tested form. Fields below mirror it (same
 * lib/content.ts constants/types, same FileField pattern) but are a
 * separate, trimmed implementation — some duplication traded for not
 * touching ContentFormModal at all. This is create-only (no edit mode), so
 * there's no "existing file from a prior save" concept — FileField's
 * existingFileName is always just derived from the freshly-chosen file.
 *
 * File uploads: "single" scope uploads through the existing workspace-scoped
 * route (the content genuinely belongs to that one workspace). "subset" and
 * "global" scope — where there's no single owning workspace — use the
 * dedicated POST /master/content/upload-url route instead, keyed
 * master/content/{id}/{file}, no workspace involved. Related Content isn't
 * offered here (unlike ContentFormModal) — that picker fetches candidates
 * from one workspace's content list, which has no clear meaning for subset/
 * global-scoped master content.
 *
 * Edit mode: pre-fills from `item` (the workspace-scoped detail fetch) plus
 * `summary` (the master-list row, which is where scope/workspaceIds actually
 * live — ContentItemDetail doesn't carry those). Scope and Type are fixed
 * once created — shown read-only, not editable — since changing either is a
 * materially bigger problem (re-scoping content_item_workspace rows, moving
 * files between storage-key schemes) that's out of scope here. PATCHes to
 * `patchWorkspaceId`, resolved by the caller via the same logic used to fetch
 * the row's detail in the first place (any workspace actually in scope for
 * this item authorizes the write, per the three-way scope check server-side).
 */
export default function MasterContentFormModal({
  workspaces, mode = 'create', summary, item, patchWorkspaceId, onClose, onSaved,
}: {
  workspaces: Workspace[];
  mode?: 'create' | 'edit';
  summary?: MasterContentItemSummary;
  item?: ContentItemDetail;
  patchWorkspaceId?: string;
  onClose: () => void;
  onSaved: (saved: ContentItemDetail) => void;
}) {
  const [scope, setScope] = useState<Scope>(summary?.scope ?? 'single');
  const [singleWorkspaceId, setSingleWorkspaceId] = useState(
    summary?.scope === 'single' ? (summary.workspaceId ?? '') : (workspaces[0]?.id ?? ''),
  );
  const [subsetIds, setSubsetIds] = useState<string[]>(
    summary?.scope === 'subset' ? summary.workspaceIds : [],
  );

  const [type, setType] = useState<ContentType>(item?.type ?? 'video');
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'draft');
  const [estTime, setEstTime] = useState(item?.estTime ?? '');
  const [priority, setPriority] = useState<ContentPriority | ''>(item?.priority ?? '');
  const [agentLevels, setAgentLevels] = useState<AgentLevel[]>(item?.agentLevels ?? []);
  const [purpose, setPurpose] = useState<ContentPurpose | ''>(item?.purpose ?? '');
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus | ''>(
    item?.assignmentStatus ?? '',
  );

  const [videoSource, setVideoSource] = useState<'upload' | 'embed'>(
    item ? ((item.config as VideoConfig)?.source === 'embed' ? 'embed' : 'upload') : 'embed',
  );
  const [videoUrl, setVideoUrl] = useState((item?.config as VideoConfig)?.url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(
    (item?.config as ResourceConfig | VideoConfig)?.fileName ?? null,
  );
  const [videoDuration, setVideoDuration] = useState<number | null>(
    (item?.config as VideoConfig)?.durationSeconds ?? null,
  );
  const [verificationType, setVerificationType] = useState<string>(
    (item?.config as LeaderVerificationConfig)?.verificationType ?? LEADER_VERIFICATION_TYPES[0].value,
  );
  const [linkUrl, setLinkUrl] = useState((item?.config as ExternalLinkConfig)?.url ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAgentLevel(level: AgentLevel) {
    setAgentLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }
  function toggleSubset(id: string) {
    setSubsetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (!f) return;
    const max = type === 'video' ? MAX_VIDEO_BYTES : MAX_RESOURCE_BYTES;
    if (f.size > max) {
      setError(`File is too large (max ${Math.round(max / 1024 / 1024)} MB).`);
      return;
    }
    if (!f.type) {
      setError('Could not determine this file’s type. Please choose a different file.');
      return;
    }
    setFile(f);
    setExistingFileName(f.name);

    // Auto-detect the video length and fill in Length. Best-effort: some
    // containers (e.g. AVI/MOV) aren't decodable by every browser, in which
    // case we leave the field for manual entry.
    if (type === 'video') {
      setVideoDuration(null);
      void readVideoDuration(f).then((seconds) => {
        if (seconds == null) return;
        setVideoDuration(seconds);
        const label = formatDuration(seconds);
        if (label) setEstTime(label);
      });
    }
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
    if (mode === 'create') {
      if (scope === 'single' && !singleWorkspaceId) return 'Choose a workspace.';
      if (scope === 'subset' && subsetIds.length === 0) return 'Select at least one workspace.';
    }
    if (type === 'video') {
      if (videoSource === 'embed' && !parseVideoEmbedUrl(videoUrl.trim()))
        return 'Add a YouTube or Vimeo video link.';
      if (videoSource === 'upload' && !file && !existingFileName)
        return 'Please choose a video file to upload.';
    }
    if (type === 'resource' && !file && !existingFileName) return 'Please choose a file to upload.';
    if (type === 'external_link' && !/^https?:\/\//i.test(linkUrl.trim()))
      return 'The URL must start with http:// or https://.';
    return null;
  }

  async function buildConfig(): Promise<Record<string, unknown>> {
    switch (type) {
      case 'external_link':
        return { url: linkUrl.trim() };
      case 'video': {
        if (videoSource === 'embed') {
          const parsed = parseVideoEmbedUrl(videoUrl.trim())!;
          return { source: 'embed', url: videoUrl.trim(), ...parsed };
        }
        if (file) {
          const upV = await uploadFile(file);
          return {
            source: 'upload', fileKey: upV.fileKey, fileName: upV.fileName,
            mimeType: file.type, fileSizeBytes: file.size,
            ...(videoDuration != null ? { durationSeconds: videoDuration } : {}),
          };
        }
        // Editing, no new file chosen — keep the existing uploaded file.
        return { ...(item?.config as VideoConfig), source: 'upload' };
      }
      case 'resource': {
        if (file) {
          const upR = await uploadFile(file);
          return { fileKey: upR.fileKey, fileName: upR.fileName, mimeType: file.type, fileSizeBytes: file.size };
        }
        return { ...(item?.config as ResourceConfig) };
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
    try {
      const config = await buildConfig();
      const base: Record<string, unknown> = {
        title: title.trim(), description: description.trim() || null,
        category: category || null, status, estTime: estTime.trim() || null, config,
        priority: priority || null, agentLevels, purpose: purpose || null,
        assignmentStatus: assignmentStatus || null,
      };

      let url: string;
      let method: 'POST' | 'PATCH';
      if (mode === 'create') {
        base.type = type;
        url = scope === 'single'
          ? `/api/workspaces/${singleWorkspaceId}/content`
          : '/api/master/content';
        method = 'POST';
        if (scope === 'subset') base.targetWorkspaceIds = subsetIds;
        if (scope === 'global') base.broadcastToAllWorkspaces = true;
      } else {
        url = `/api/workspaces/${patchWorkspaceId}/content/${item!.id}`;
        method = 'PATCH';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(base),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      onSaved((await res.json()) as ContentItemDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'Add Content' : 'Edit Content'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Scope — fixed once created, shown read-only in edit mode */}
          {mode === 'edit' ? (
            <div>
              <label className={LABEL}>Scope</label>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                {scope === 'global' && (<><Globe2 size={14} className="text-teal-600" /> All workspaces</>)}
                {scope === 'subset' && (<><Users size={14} className="text-teal-600" /> {subsetIds.length} workspaces</>)}
                {scope === 'single' && (
                  <><Building2 size={14} className="text-teal-600" /> {workspaces.find((w) => w.id === singleWorkspaceId)?.name ?? 'Unknown workspace'}</>
                )}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Scope can&apos;t be changed after creation.</p>
            </div>
          ) : (
            <>
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
            </>
          )}

          <div>
            <label className={LABEL}>Type</label>
            {mode === 'edit' ? (
              <p className="text-sm text-gray-600">{TYPE_META[type].label}</p>
            ) : (
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
            )}
          </div>

          <div>
            <label className={LABEL}>Title <span className="text-red-500">*</span></label>
            <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${TYPE_META[type].label} title`} />
          </div>
          <div>
            <label className={LABEL}>
              {type === 'leader_verification' ? 'Description / Instructions' : 'Description'}
            </label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'leader_verification'
                  ? 'What should the leader do to verify this?'
                  : 'Optional description'
              }
            />
          </div>

          {type === 'video' && (
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Source</label>
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
              </div>
              {videoSource === 'embed' ? (
                <div key="embed">
                  <label className={LABEL}>Video URL <span className="text-red-500">*</span></label>
                  <input className={INPUT} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…" />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Add a YouTube or Vimeo video link. It plays inside PCx — viewers are never sent to the external site.
                  </p>
                </div>
              ) : (
                <FileField
                  key="upload"
                  label="Video file"
                  required
                  accept={VIDEO_ACCEPT}
                  existingFileName={existingFileName}
                  onFileChange={onFileChange}
                  hint="Uploaded and stored privately."
                />
              )}
            </div>
          )}
          {type === 'resource' && (
            <FileField
              label="File"
              required
              accept={RESOURCE_ACCEPT}
              existingFileName={existingFileName}
              onFileChange={onFileChange}
              hint="Stored privately."
            />
          )}
          {type === 'external_link' && (
            <div>
              <label className={LABEL}>URL <span className="text-red-500">*</span></label>
              <input className={INPUT} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
              <p className="mt-1 text-[11px] text-gray-400">Opens in a new tab. Must start with http:// or https://</p>
            </div>
          )}
          {type === 'leader_verification' && (
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Verification Type <span className="text-red-500">*</span></label>
                <select className={INPUT} value={verificationType} onChange={(e) => setVerificationType(e.target.value)}>
                  {LEADER_VERIFICATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Leader Actions</label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-600 text-xs font-medium">Approve</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-500 text-xs font-medium">Reject</span>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  The leader can approve or reject. On reject, the task is reopened for the agent to retry. Nothing is blocked. The task that triggers this verification is configured in the Builder.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className={LABEL}>{type === 'video' ? 'Length' : 'Estimated Time'}</label>
            <input
              className={INPUT}
              value={estTime}
              onChange={(e) => setEstTime(e.target.value)}
              placeholder={
                type === 'video' && videoSource === 'upload'
                  ? 'Auto-detected from the video'
                  : 'e.g. 15 min'
              }
            />
            {type === 'video' && videoSource === 'upload' && (
              <p className="mt-1 text-[11px] text-gray-400">
                Calculated automatically from the uploaded file. You can override it.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Category</label>
              <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">None</option>
                {CONTENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select className={INPUT} value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archive">Archived</option>
              </select>
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 cursor-pointer">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? (mode === 'create' ? 'Creating…' : 'Saving…') : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileField({
  label, required, accept, existingFileName, onFileChange, hint,
}: {
  label: string;
  required?: boolean;
  accept: string;
  existingFileName: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className={LABEL}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <label className="flex items-center gap-2.5 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 hover:border-teal-400 hover:text-gray-700 cursor-pointer transition-colors">
        {existingFileName ? <FileText size={16} className="text-teal-600" /> : <Upload size={16} />}
        <span className="truncate">{existingFileName ?? 'Choose a file…'}</span>
        <input type="file" accept={accept} onChange={onFileChange} className="hidden" />
      </label>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { X, Upload, Loader2, FileText } from 'lucide-react';
import {
  CONTENT_CATEGORIES, TYPE_META, RESOURCE_ACCEPT, VIDEO_ACCEPT,
  LEADER_VERIFICATION_TYPES, formatDuration, parseVideoEmbedUrl,
  CONTENT_PRIORITIES, AGENT_LEVELS, CONTENT_PURPOSES, ASSIGNMENT_STATUSES,
  type ContentType, type ContentStatus, type ContentItemDetail,
  type ContentItemSummary, type ContentListResponse, type RelatedContentRef,
  type VideoConfig, type ResourceConfig, type ExternalLinkConfig,
  type LeaderVerificationConfig, type ContentPriority, type AgentLevel,
  type ContentPurpose, type AssignmentStatus, type ContentAccess,
} from '@/lib/content';
import { fetchAgentOptions } from '@/lib/users';
import type { AsyncOption } from '@/components/AsyncSearchableSelect';
import { TypeIcon } from './content-icons';

const MAX_RESOURCE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

const LABEL = 'block text-xs font-medium text-gray-600 mb-1.5';
const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

/**
 * Read a video file's duration (seconds) in the browser by loading just its
 * metadata. Resolves null when the duration can't be determined — an
 * undecodable container, a stream without a known length, or a load error.
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

export default function ContentFormModal({
  workspaceId, mode, type, item, access, onClose, onSaved,
}: {
  workspaceId: string;
  mode: 'create' | 'edit';
  type: ContentType;
  item?: ContentItemDetail;
  /** Determines whether the assignment-target field below is required. */
  access: ContentAccess;
  onClose: () => void;
  onSaved: (saved: ContentItemDetail) => void;
}) {
  const meta = TYPE_META[type];

  // Manager/Leader-created content is never automatically assigned (see
  // ContentAssignmentSyncService on the API side) — required at creation
  // time. Master/admin content is scoped instead of per-agent-assigned, so
  // this doesn't apply to them.
  const isPlatformAdmin = access.platformRole === 'master' || access.platformRole === 'admin';
  const needsAssignmentTarget = mode === 'create' && !isPlatformAdmin;
  const [assignMode, setAssignMode] = useState<'all' | 'specific'>('all');
  const [assignAgentIds, setAssignAgentIds] = useState<string[]>([]);

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'draft');
  const [estTime, setEstTime] = useState(item?.estTime ?? '');

  // Career Builder AI tag dimensions — see career-builder.validator.ts on the
  // API side for why these are separate from category/status above.
  const [priority, setPriority] = useState<ContentPriority | ''>(item?.priority ?? '');
  const [agentLevels, setAgentLevels] = useState<AgentLevel[]>(item?.agentLevels ?? []);
  const [purpose, setPurpose] = useState<ContentPurpose | ''>(item?.purpose ?? '');
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus | ''>(
    item?.assignmentStatus ?? '',
  );

  function toggleAgentLevel(level: AgentLevel) {
    setAgentLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  }

  const [linkUrl, setLinkUrl] = useState((item?.config as ExternalLinkConfig)?.url ?? '');

  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(
    (item?.config as ResourceConfig | VideoConfig)?.fileName ?? null,
  );
  // Auto-detected video length (seconds). Carried into the saved config and
  // used to auto-fill the Estimated Time field when a video is selected.
  const [videoDuration, setVideoDuration] = useState<number | null>(
    (item?.config as VideoConfig)?.durationSeconds ?? null,
  );
  const [videoSource, setVideoSource] = useState<'upload' | 'embed'>(
    (item?.config as VideoConfig)?.source === 'embed' ? 'embed' : 'upload',
  );
  const [videoUrl, setVideoUrl] = useState((item?.config as VideoConfig)?.url ?? '');

  const [verificationType, setVerificationType] = useState<string>(
    (item?.config as LeaderVerificationConfig)?.verificationType ??
      LEADER_VERIFICATION_TYPES[0].value,
  );

  const [relatedIds, setRelatedIds] = useState<string[]>(
    item?.relatedContentIds ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------------------------------------- tag helpers */

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tags, t]);
    setTagInput('');
  }
  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  /* -------------------------------------------------------------- file */

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

    // Auto-detect the video length and fill in Estimated Time. Best-effort: some
    // containers (e.g. AVI/MOV) aren't decodable by every browser, in which case
    // we leave the field for manual entry.
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
    const urlRes = await fetch(`/api/workspaces/${workspaceId}/content/upload-url`, {
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
    if (!urlRes.ok) {
      const body = (await urlRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? 'Could not prepare the upload.');
    }
    const { uploadUrl, key, fileName } = (await urlRes.json()) as {
      uploadUrl: string;
      key: string;
      fileName: string;
    };
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': f.type },
      body: f,
    });
    if (!put.ok) throw new Error('File upload failed.');
    return { fileKey: key, fileName };
  }

  /* -------------------------------------------------------------- save */

  async function buildConfig(): Promise<Record<string, unknown>> {
    switch (type) {
      case 'external_link':
        return { url: linkUrl.trim() };
      case 'video':
        if (videoSource === 'embed') {
          const url = videoUrl.trim();
          const parsed = parseVideoEmbedUrl(url);
          if (!parsed) throw new Error('Add a YouTube or Vimeo video link.');
          return { source: 'embed', url, ...parsed };
        }
        if (file) {
          const up = await uploadFile(file);
          return {
            source: 'upload',
            fileKey: up.fileKey,
            fileName: up.fileName,
            mimeType: file.type,
            fileSizeBytes: file.size,
            ...(videoDuration != null ? { durationSeconds: videoDuration } : {}),
          };
        }
        // keep the existing uploaded file on edit
        return { ...(item?.config as VideoConfig), source: 'upload' };
      case 'resource':
        if (file) {
          const up = await uploadFile(file);
          return {
            fileKey: up.fileKey,
            fileName: up.fileName,
            mimeType: file.type,
            fileSizeBytes: file.size,
          };
        }
        return { ...(item?.config as ResourceConfig) };
      case 'leader_verification':
        return { verificationType, leaderActions: ['approve', 'reject'] };
    }
  }

  function clientValidate(): string | null {
    if (!title.trim()) return 'Title is required.';
    if (type === 'external_link') {
      if (!linkUrl.trim()) return 'A URL is required.';
      if (!/^https?:\/\//i.test(linkUrl.trim()))
        return 'The URL must start with http:// or https://.';
    }
    if (type === 'video') {
      if (videoSource === 'embed') {
        if (!parseVideoEmbedUrl(videoUrl.trim()))
          return 'Add a YouTube or Vimeo video link.';
      } else if (!file && !existingFileName) {
        return 'Please choose a video file to upload.';
      }
    }
    if (type === 'resource' && !file && !existingFileName)
      return 'Please choose a file to upload.';
    if (type === 'leader_verification' && !verificationType)
      return 'A verification type is required.';
    if (needsAssignmentTarget && assignMode === 'specific' && assignAgentIds.length === 0)
      return 'Select at least one agent, or choose "All agents I manage."';
    return null;
  }

  async function handleSave() {
    const clientErr = clientValidate();
    if (clientErr) {
      setError(clientErr);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const config = await buildConfig();
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        tags,
        status,
        config,
        estTime: estTime.trim() || null,
        relatedContentIds: relatedIds,
        priority: priority || null,
        agentLevels,
        purpose: purpose || null,
        assignmentStatus: assignmentStatus || null,
      };
      if (mode === 'create') {
        payload.type = type;
        if (needsAssignmentTarget) {
          if (assignMode === 'all') payload.assignToAll = true;
          else payload.assignToAgentIds = assignAgentIds;
        }
      }

      const res = await fetch(
        mode === 'create'
          ? `/api/workspaces/${workspaceId}/content`
          : `/api/workspaces/${workspaceId}/content/${item!.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      );
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

  /* -------------------------------------------------------------- render */

  const isLeaderVerification = type === 'leader_verification';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? `Add ${meta.label}` : `Edit ${meta.label}`}
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
          <div>
            <label className={LABEL}>Title <span className="text-red-500">*</span></label>
            <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${meta.label} title`} />
          </div>

          <div>
            <label className={LABEL}>
              {isLeaderVerification ? 'Description / Instructions' : 'Description'}
            </label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isLeaderVerification
                  ? 'What should the leader do to verify this?'
                  : 'Optional description'
              }
            />
          </div>

          {/* Type-specific */}
          {type === 'video' && (
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Source</label>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                  {(['upload', 'embed'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setVideoSource(s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        videoSource === s ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s === 'upload' ? 'Upload file' : 'Video link'}
                    </button>
                  ))}
                </div>
              </div>
              {videoSource === 'embed' ? (
                <div>
                  <label className={LABEL}>Video URL <span className="text-red-500">*</span></label>
                  <input
                    className={INPUT}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Add a YouTube or Vimeo video link. It plays inside PCx — viewers are never sent to the external site.
                  </p>
                </div>
              ) : (
                <FileField
                  label="Video file"
                  required
                  accept={VIDEO_ACCEPT}
                  existingFileName={existingFileName}
                  onFileChange={onFileChange}
                  hint="Uploaded and stored privately in this workspace."
                />
              )}
            </div>
          )}

          {type === 'external_link' && (
            <div>
              <label className={LABEL}>URL <span className="text-red-500">*</span></label>
              <input className={INPUT} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
              <p className="mt-1 text-[11px] text-gray-400">Opens in a new tab. Must start with http:// or https://</p>
            </div>
          )}

          {type === 'resource' && (
            <FileField
              label="File"
              required
              accept={RESOURCE_ACCEPT}
              existingFileName={existingFileName}
              onFileChange={onFileChange}
              hint="Stored privately and only reachable through this workspace."
            />
          )}

          {type === 'leader_verification' && (
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Verification Type <span className="text-red-500">*</span></label>
                <select
                  className={INPUT}
                  value={verificationType}
                  onChange={(e) => setVerificationType(e.target.value)}
                >
                  {LEADER_VERIFICATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
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

          {/* Estimated Time */}
          <div>
            <label className={LABEL}>
              {type === 'video' ? 'Length' : 'Estimated Time'}
            </label>
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

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Category</label>
              <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">None</option>
                {CONTENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
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

          {/* Career Builder AI tagging */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3.5 space-y-3.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              AI Ranking Tags
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Priority</label>
                <select
                  className={INPUT}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ContentPriority | '')}
                >
                  <option value="">None</option>
                  {CONTENT_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Assignment Status</label>
                <select
                  className={INPUT}
                  value={assignmentStatus}
                  onChange={(e) => setAssignmentStatus(e.target.value as AssignmentStatus | '')}
                >
                  <option value="">None</option>
                  {ASSIGNMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>Purpose</label>
              <select
                className={INPUT}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as ContentPurpose | '')}
              >
                <option value="">None</option>
                {CONTENT_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Agent Level</label>
              <div className="flex flex-wrap gap-3">
                {AGENT_LEVELS.map((l) => (
                  <label key={l.value} className="inline-flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agentLevels.includes(l.value)}
                      onChange={() => toggleAgentLevel(l.value)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Which agent tiers this applies to. Leave all unchecked and this item is never surfaced by the ranking engine.
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={LABEL}>Tags</label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 focus-within:ring-2 focus-within:ring-teal-500">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-gray-400 hover:text-gray-600">
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                className="flex-1 min-w-24 text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-0.5"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={tags.length ? '' : 'Add a tag and press Enter'}
              />
            </div>
          </div>

          {/* Assignment target — required for manager/leader-created content */}
          {needsAssignmentTarget && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Assign To <span className="text-red-500">*</span>
              </p>
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                {(['all', 'specific'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAssignMode(m)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      assignMode === m ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m === 'all' ? 'All agents I manage' : 'Select specific agents'}
                  </button>
                ))}
              </div>
              {assignMode === 'specific' && (
                <AgentAssignField
                  workspaceId={workspaceId}
                  value={assignAgentIds}
                  onChange={setAssignAgentIds}
                />
              )}
            </div>
          )}

          {/* Related content */}
          <RelatedContentField
            workspaceId={workspaceId}
            currentItemId={item?.id}
            value={relatedIds}
            onChange={setRelatedIds}
            seed={item?.relatedContent ?? []}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- sub-fields */

/**
 * Typeahead picker for manually-curated related content. Loads the workspace's
 * items once, excludes the item being edited and anything already chosen, and
 * emits the selected ids. `seed` carries titles the caller already knows (the
 * item's existing related refs on edit) so chips render before the list loads.
 */
function RelatedContentField({
  workspaceId, currentItemId, value, onChange, seed,
}: {
  workspaceId: string;
  currentItemId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  seed: RelatedContentRef[];
}) {
  const [candidates, setCandidates] = useState<ContentItemSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/content?pageSize=100&sort=title`,
          { credentials: 'include', signal: ctrl.signal },
        );
        if (res.ok) {
          const json = (await res.json()) as ContentListResponse;
          setCandidates(json.items);
        }
      } catch {
        /* leave the picker empty on failure; the field stays usable */
      } finally {
        if (!ctrl.signal.aborted) setLoaded(true);
      }
    })();
    return () => ctrl.abort();
  }, [workspaceId]);

  // id -> label, drawn from both the fetched list and the edit-mode seed so a
  // just-loaded page and a pre-existing selection both render a real title.
  const labelById = new Map<string, { title: string; type: ContentType }>();
  seed.forEach((r) => labelById.set(r.id, { title: r.title, type: r.type }));
  candidates.forEach((c) => labelById.set(c.id, { title: c.title, type: c.type }));

  const selected = new Set(value);
  const q = query.trim().toLowerCase();
  const matches = candidates
    .filter(
      (c) =>
        c.id !== currentItemId &&
        !selected.has(c.id) &&
        (q === '' || c.title.toLowerCase().includes(q)),
    )
    .slice(0, 8);

  return (
    <div>
      <label className={LABEL}>Related Content</label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((id) => {
            const l = labelById.get(id);
            return (
              <span key={id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                {l && <TypeIcon type={l.type} iconColor={TYPE_META[l.type].iconColor} iconBg="bg-transparent" tile="w-4 h-4" size={11} />}
                {l?.title ?? 'Untitled item'}
                <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="text-gray-400 hover:text-gray-600">
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <input
          className={INPUT}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loaded ? 'Search content to link…' : 'Loading content…'}
        />
        {open && matches.length > 0 && (
          <>
            <button type="button" aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 mt-1 z-50 max-h-52 overflow-y-auto rounded-lg border border-gray-100 bg-white p-1 shadow-xl">
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange([...value, c.id]); setQuery(''); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-50 cursor-pointer text-left"
                >
                  <TypeIcon type={c.type} iconColor={TYPE_META[c.type].iconColor} iconBg={TYPE_META[c.type].iconBg} tile="w-5 h-5" size={11} />
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        Manually curated links surfaced in this item&apos;s detail panel.
      </p>
    </div>
  );
}

/**
 * Multi-select of a workspace's agents, server-searched via fetchAgentOptions
 * (debounced, same 250ms interval ContentManagerView's own search uses).
 * Chip pattern mirrors RelatedContentField above; the search is server-side
 * here instead of a locally-loaded/filtered list, since agent rosters can be
 * large and this reuses the existing fetchLeaderOptions-style API shape.
 */
function AgentAssignField({
  workspaceId, value, onChange,
}: {
  workspaceId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AsyncOption[]>([]);
  const [labelById, setLabelById] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      void fetchAgentOptions(workspaceId, query).then((opts) => {
        setOptions(opts);
        setLabelById((prev) => {
          const next = { ...prev };
          opts.forEach((o) => { next[o.id] = o.label; });
          return next;
        });
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [workspaceId, query]);

  const selected = new Set(value);
  const matches = options.filter((o) => !selected.has(o.id));

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-xs text-gray-600">
              {labelById[id] ?? id}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="text-gray-400 hover:text-gray-600">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          className={INPUT}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Searching…' : 'Search agents by name or email…'}
        />
        {open && matches.length > 0 && (
          <>
            <button type="button" aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 mt-1 z-50 max-h-52 overflow-y-auto rounded-lg border border-gray-100 bg-white p-1 shadow-xl">
              {matches.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { onChange([...value, o.id]); setQuery(''); setOpen(false); }}
                  className="flex items-center w-full px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-50 cursor-pointer text-left"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
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

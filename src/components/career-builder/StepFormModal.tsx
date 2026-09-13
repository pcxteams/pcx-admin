'use client';

import { useEffect, useState } from 'react';
import { X, Upload, Loader2, FileText, Trash2 } from 'lucide-react';
import { RESOURCE_ACCEPT, VIDEO_ACCEPT, formatDuration, parseVideoEmbedUrl } from '@/lib/content';
import {
  contentApiBase, contentItemPath, REQUIREMENT_OPTIONS, STEP_TYPE_META,
  type Attachment, type CareerBuilderScope, type CareerBuilderStepType, type StepDetail,
} from '@/lib/career-builder';
import AttachmentsField from './AttachmentsField';

const LABEL = 'block text-xs font-medium text-gray-600 mb-1.5';
const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const MAX_RESOURCE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

interface VideoConfigShape {
  source?: 'upload' | 'embed';
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  url?: string;
  provider?: string;
  embedId?: string;
}
interface ResourceConfigShape {
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}
interface TextConfigShape {
  body?: string | null;
}

/** Read a video file's duration (seconds) in the browser. Mirrors ContentFormModal.tsx. */
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

export default function StepFormModal({
  scope, mode, type, sectionId, step, onClose, onSaved, onDeleted,
}: {
  scope: CareerBuilderScope;
  mode: 'create' | 'edit';
  type: CareerBuilderStepType;
  sectionId: string;
  step?: StepDetail;
  onClose: () => void;
  onSaved: (saved: StepDetail) => void;
  onDeleted?: () => void;
}) {
  const meta = STEP_TYPE_META[type];

  const [title, setTitle] = useState(step?.title ?? '');
  const [description, setDescription] = useState(step?.description ?? '');
  const [assignmentStatus, setAssignmentStatus] = useState<string>(step?.assignmentStatus ?? 'required');
  const [attachments, setAttachments] = useState<Attachment[]>(step?.attachments ?? []);

  const [body, setBody] = useState((step?.config as TextConfigShape | undefined)?.body ?? '');

  const [videoSource, setVideoSource] = useState<'upload' | 'embed'>(
    (step?.config as VideoConfigShape | undefined)?.source === 'embed' ? 'embed' : 'upload',
  );
  const [videoUrl, setVideoUrl] = useState((step?.config as VideoConfigShape | undefined)?.url ?? '');
  const [videoDuration, setVideoDuration] = useState<number | null>(
    (step?.config as VideoConfigShape | undefined)?.durationSeconds ?? null,
  );
  const [estTime, setEstTime] = useState(step?.estTime ?? '');

  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(
    (step?.config as VideoConfigShape | ResourceConfigShape | undefined)?.fileName ?? null,
  );

  const [relatedVideoIds, setRelatedVideoIds] = useState<string[]>(step?.relatedContentIds ?? []);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const urlRes = await fetch(`${contentApiBase(scope)}/upload-url`, {
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
      const body2 = (await urlRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(body2.message ?? 'Could not prepare the upload.');
    }
    const { uploadUrl, key, fileName } = (await urlRes.json()) as {
      uploadUrl: string;
      key: string;
      fileName: string;
    };
    const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': f.type }, body: f });
    if (!put.ok) throw new Error('File upload failed.');
    return { fileKey: key, fileName };
  }

  async function buildConfig(): Promise<Record<string, unknown>> {
    switch (type) {
      case 'instruction':
      case 'plain_text':
        return { body: body.trim() || null };
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
        return { ...(step?.config as VideoConfigShape), source: 'upload' };
      case 'resource':
        if (file) {
          const up = await uploadFile(file);
          return { fileKey: up.fileKey, fileName: up.fileName, mimeType: file.type, fileSizeBytes: file.size };
        }
        return { ...(step?.config as ResourceConfigShape) };
    }
  }

  function clientValidate(): string | null {
    if (!title.trim()) return 'Title is required.';
    if (type === 'video') {
      if (videoSource === 'embed') {
        if (!parseVideoEmbedUrl(videoUrl.trim())) return 'Add a YouTube or Vimeo video link.';
      } else if (!file && !existingFileName) {
        return 'Please choose a video file to upload.';
      }
    }
    if (type === 'resource' && !file && !existingFileName) return 'Please choose a file to upload.';
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
        config,
        estTime: estTime.trim() || null,
        assignmentStatus,
        attachments,
        ...(type === 'resource' ? { relatedContentIds: relatedVideoIds } : {}),
      };

      let res: Response;
      if (mode === 'create') {
        payload.type = type;
        payload.sectionId = sectionId;
        res = await fetch(contentApiBase(scope), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(contentItemPath(scope, step!.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const body2 = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body2.message ?? 'Something went wrong. Please try again.');
        return;
      }
      onSaved((await res.json()) as StepDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!step) return;
    if (!window.confirm(`Delete "${step.title}"? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(contentItemPath(scope, step.id), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setError('Could not delete this step. Please try again.');
        return;
      }
      onDeleted?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
              {meta.label}
            </span>
            <h2 className="text-base font-semibold text-gray-900">
              {mode === 'create' ? `Add ${meta.label}` : `Edit ${meta.label}`}
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-600 disabled:opacity-40 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Title <span className="text-red-500">*</span></label>
            <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title…" />
          </div>

          {(type === 'instruction' || type === 'plain_text') && (
            <div>
              <label className={LABEL}>Content</label>
              <textarea
                className={`${INPUT} resize-none`}
                rows={5}
                value={body ?? ''}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your instructions or directions here…"
              />
            </div>
          )}

          {type === 'video' && (
            <>
              <div>
                <label className={LABEL}>Description / Instructions</label>
                <textarea
                  className={`${INPUT} resize-none`}
                  rows={2}
                  value={description ?? ''}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add instructions or context…"
                />
              </div>
              <div>
                <label className={LABEL}>Video <span className="text-red-500">*</span></label>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 mb-2 w-full">
                  {(['embed', 'upload'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setVideoSource(s)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        videoSource === s ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s === 'embed' ? 'Paste URL' : 'Upload File'}
                    </button>
                  ))}
                </div>
                {videoSource === 'embed' ? (
                  <input
                    className={INPUT}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://vimeo.com/… or YouTube URL"
                  />
                ) : (
                  <FileField accept={VIDEO_ACCEPT} existingFileName={existingFileName} onFileChange={onFileChange} />
                )}
              </div>
            </>
          )}

          {type === 'resource' && (
            <>
              <div>
                <label className={LABEL}>Description / Instructions</label>
                <textarea
                  className={`${INPUT} resize-none`}
                  rows={2}
                  value={description ?? ''}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add instructions or context…"
                />
              </div>
              <div>
                <label className={LABEL}>Resource File <span className="text-red-500">*</span></label>
                <FileField
                  accept={RESOURCE_ACCEPT}
                  existingFileName={existingFileName}
                  onFileChange={onFileChange}
                  hint="PDF, DOCX, PPTX, XLSX — max 50 MB"
                />
              </div>
            </>
          )}

          <div>
            <label className={LABEL}>Requirement</label>
            <select className={INPUT} value={assignmentStatus} onChange={(e) => setAssignmentStatus(e.target.value)}>
              {REQUIREMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <AttachmentsField scope={scope} value={attachments} onChange={setAttachments} />

          {type === 'resource' && (
            <RelatedVideoField
              scope={scope}
              value={relatedVideoIds}
              onChange={setRelatedVideoIds}
              currentStepId={step?.id}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- sub-fields */

function FileField({
  accept, existingFileName, onFileChange, hint,
}: {
  accept: string;
  existingFileName: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-sm text-gray-500 hover:border-teal-400 hover:text-gray-700 cursor-pointer transition-colors text-center">
        {existingFileName ? <FileText size={18} className="text-teal-600" /> : <Upload size={18} />}
        <span className="truncate max-w-full">{existingFileName ?? 'Click to upload file'}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
        <input type="file" accept={accept} onChange={onFileChange} className="hidden" />
      </label>
    </div>
  );
}

interface VideoCandidate {
  id: string;
  title: string;
  type: string;
}

/** Typeahead over existing video-type steps in this scope, wired to relatedContentIds. */
function RelatedVideoField({
  scope, value, onChange, currentStepId,
}: {
  scope: CareerBuilderScope;
  value: string[];
  onChange: (ids: string[]) => void;
  currentStepId?: string;
}) {
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`${contentApiBase(scope)}?type=video&pageSize=100&sort=title`, {
          credentials: 'include',
          signal: ctrl.signal,
        });
        if (res.ok) {
          const json = (await res.json()) as { items: VideoCandidate[] };
          setCandidates(json.items);
        }
      } catch {
        /* leave the picker empty on failure; the field stays usable */
      } finally {
        if (!ctrl.signal.aborted) setLoaded(true);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.kind === 'workspace' ? scope.workspaceId : 'master']);

  const labelById = new Map(candidates.map((c) => [c.id, c.title]));
  const selected = new Set(value);
  const q = query.trim().toLowerCase();
  const matches = candidates
    .filter((c) => c.id !== currentStepId && !selected.has(c.id) && (q === '' || c.title.toLowerCase().includes(q)))
    .slice(0, 8);

  return (
    <div>
      <label className={LABEL}>Related Video</label>
      <p className="mb-1.5 text-[11px] text-gray-400">
        Connect this resource to an existing video in the system (optional).
      </p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
              {labelById.get(id) ?? 'Video'}
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
          placeholder={loaded ? 'Search existing videos…' : 'Loading videos…'}
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
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

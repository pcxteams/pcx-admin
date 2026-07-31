'use client';

import { useState } from 'react';
import { X, Upload, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import {
  CONTENT_CATEGORIES, TYPE_META, RESOURCE_ACCEPT, VIDEO_ACCEPT,
  type ContentType, type ContentStatus, type ContentItemDetail,
  type VideoConfig, type ResourceConfig, type ExternalLinkConfig,
  type FormConfig, type QuizConfig,
} from '@/lib/content';

const MAX_RESOURCE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

const LABEL = 'block text-xs font-medium text-gray-600 mb-1.5';
const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export default function ContentFormModal({
  workspaceId, mode, type, item, onClose, onSaved,
}: {
  workspaceId: string;
  mode: 'create' | 'edit';
  type: ContentType;
  item?: ContentItemDetail;
  onClose: () => void;
  onSaved: (saved: ContentItemDetail) => void;
}) {
  const meta = TYPE_META[type];

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? 'draft');
  const [estTime, setEstTime] = useState(item?.estTimeMinutes?.toString() ?? '');

  const initialVideo = (item?.config as VideoConfig) ?? {};
  const [videoSource, setVideoSource] = useState<'embed' | 'upload'>(
    type === 'video' ? (initialVideo.source ?? 'embed') : 'embed',
  );
  const [videoUrl, setVideoUrl] = useState(initialVideo.url ?? '');
  const [linkUrl, setLinkUrl] = useState((item?.config as ExternalLinkConfig)?.url ?? '');

  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(
    (item?.config as ResourceConfig | VideoConfig)?.fileName ?? null,
  );

  const [fields, setFields] = useState<FormConfig['fields']>(
    ((item?.config as FormConfig)?.fields ?? []).map((f) => ({ ...f })),
  );
  const [questions, setQuestions] = useState<QuizConfig['questions']>(
    ((item?.config as QuizConfig)?.questions ?? []).map((q) => ({ ...q })),
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
        if (videoSource === 'embed') return { source: 'embed', url: videoUrl.trim() };
        if (file) {
          const up = await uploadFile(file);
          return {
            source: 'upload',
            fileKey: up.fileKey,
            fileName: up.fileName,
            mimeType: file.type,
            fileSizeBytes: file.size,
          };
        }
        // keep existing uploaded file on edit
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
      case 'form':
        return { fields: fields.filter((f) => f.label.trim()) };
      case 'quiz':
        return { questions: questions.filter((q) => q.prompt.trim()) };
    }
  }

  function clientValidate(): string | null {
    if (!title.trim()) return 'Title is required.';
    if (type === 'external_link' && !linkUrl.trim()) return 'A URL is required.';
    if (type === 'video' && videoSource === 'embed' && !videoUrl.trim())
      return 'A video URL is required.';
    if (type === 'video' && videoSource === 'upload' && !file && !existingFileName)
      return 'Please choose a video file to upload.';
    if (type === 'resource' && !file && !existingFileName)
      return 'Please choose a file to upload.';
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
        estTimeMinutes:
          type === 'video' && estTime.trim() ? Number.parseInt(estTime, 10) : null,
        relatedContentIds: item?.relatedContentIds ?? [],
      };
      if (mode === 'create') payload.type = type;

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
            <label className={LABEL}>Description</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Type-specific */}
          {type === 'video' && (
            <VideoFields
              source={videoSource} setSource={setVideoSource}
              url={videoUrl} setUrl={setVideoUrl}
              estTime={estTime} setEstTime={setEstTime}
              existingFileName={existingFileName} onFileChange={onFileChange}
            />
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
              hint="Stored privately — only reachable through this workspace."
            />
          )}

          {type === 'form' && (
            <RepeatableList
              label="Fields"
              addLabel="Add field"
              items={fields.map((f) => ({ id: f.id, value: f.label }))}
              onAdd={() => setFields([...fields, { id: genId(), label: '', type: 'text' }])}
              onChange={(id, v) => setFields(fields.map((f) => (f.id === id ? { ...f, label: v } : f)))}
              onRemove={(id) => setFields(fields.filter((f) => f.id !== id))}
              placeholder="Field label"
              emptyHint="No fields yet. A full form builder is coming later."
            />
          )}

          {type === 'quiz' && (
            <RepeatableList
              label="Questions"
              addLabel="Add question"
              items={questions.map((q) => ({ id: q.id, value: q.prompt }))}
              onAdd={() => setQuestions([...questions, { id: genId(), prompt: '' }])}
              onChange={(id, v) => setQuestions(questions.map((q) => (q.id === id ? { ...q, prompt: v } : q)))}
              onRemove={(id) => setQuestions(questions.filter((q) => q.id !== id))}
              placeholder="Question prompt"
              emptyHint="No questions yet. A full quiz builder is coming later."
            />
          )}

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

function VideoFields({
  source, setSource, url, setUrl, estTime, setEstTime, existingFileName, onFileChange,
}: {
  source: 'embed' | 'upload';
  setSource: (s: 'embed' | 'upload') => void;
  url: string;
  setUrl: (v: string) => void;
  estTime: string;
  setEstTime: (v: string) => void;
  existingFileName: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL}>Source</label>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          {(['embed', 'upload'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                source === s ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'embed' ? 'Embed URL' : 'Upload'}
            </button>
          ))}
        </div>
      </div>
      {source === 'embed' ? (
        <div>
          <label className={LABEL}>Video URL <span className="text-red-500">*</span></label>
          <input className={INPUT} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
        </div>
      ) : (
        <FileField
          label="Video file"
          required
          accept={VIDEO_ACCEPT}
          existingFileName={existingFileName}
          onFileChange={onFileChange}
          hint="Stored privately in this workspace."
        />
      )}
      <div>
        <label className={LABEL}>Estimated time (minutes)</label>
        <input className={INPUT} value={estTime} onChange={(e) => setEstTime(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 15" inputMode="numeric" />
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

function RepeatableList({
  label, addLabel, items, onAdd, onChange, onRemove, placeholder, emptyHint,
}: {
  label: string;
  addLabel: string;
  items: { id: string; value: string }[];
  onAdd: () => void;
  onChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  placeholder: string;
  emptyHint: string;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-[11px] text-gray-400">{emptyHint}</p>}
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-300 w-4 text-right">{i + 1}</span>
            <input
              className={INPUT}
              value={it.value}
              onChange={(e) => onChange(it.id, e.target.value)}
              placeholder={placeholder}
            />
            <button type="button" onClick={() => onRemove(it.id)} className="text-gray-400 hover:text-red-500 cursor-pointer">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}

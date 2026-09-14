'use client';

import { useRef, useState } from 'react';
import { Upload, Link2, FileText, X, Loader2 } from 'lucide-react';
import { RESOURCE_ACCEPT } from '@/lib/content';
import { contentApiBase, type Attachment, type CareerBuilderScope } from '@/lib/career-builder';

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50 MB, same cap as a Resource file

/**
 * "Supporting Resources / Attachments" on every step-type edit modal.
 *
 * `allowFileUpload` (default true) hides the "Upload File" button — Resource
 * and Video steps already have their own primary file field, so a second
 * file-upload affordance here was redundant and, in practice, a source of
 * confusion (a file added here doesn't satisfy that field's requirement).
 * Instruction and Plain Text have no file field of their own, so they keep
 * it — it's their only way to attach a file. "Add Link" stays everywhere.
 */
export default function AttachmentsField({
  scope, value, onChange, allowFileUpload = true,
}: {
  scope: CareerBuilderScope;
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  allowFileUpload?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!f) return;
    setError(null);
    if (f.size > MAX_ATTACHMENT_BYTES) {
      setError('File is too large (max 50 MB).');
      return;
    }
    if (!f.type) {
      setError('Could not determine this file’s type. Please choose a different file.');
      return;
    }
    setUploading(true);
    try {
      const urlRes = await fetch(`${contentApiBase(scope)}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          kind: 'resource',
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
      onChange([
        ...value,
        { kind: 'file', fileKey: key, fileName, mimeType: f.type, fileSizeBytes: f.size },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError('The URL must start with http:// or https://.');
      return;
    }
    onChange([...value, { kind: 'link', url, ...(linkLabel.trim() ? { label: linkLabel.trim() } : {}) }]);
    setLinkUrl('');
    setLinkLabel('');
    setAddingLink(false);
    setError(null);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Supporting Resources / Attachments</label>

      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 min-h-11 px-3 py-2">
        {value.length === 0 && !addingLink ? (
          <p className="text-xs text-gray-400 py-1.5 text-center">No attachments added yet</p>
        ) : (
          <div className="space-y-1.5">
            {value.map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-white border border-gray-100 px-2.5 py-1.5">
                {a.kind === 'file' ? <FileText size={13} className="text-gray-400 shrink-0" /> : <Link2 size={13} className="text-gray-400 shrink-0" />}
                <span className="flex-1 min-w-0 truncate text-xs text-gray-700">
                  {a.kind === 'file' ? a.fileName : (a.label || a.url)}
                </span>
                <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}

            {addingLink && (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className="flex-1 min-w-0 rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="https://…"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLink()}
                />
                <input
                  className="w-28 rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Label (optional)"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLink()}
                />
                <button type="button" onClick={addLink} className="text-xs font-medium text-teal-600 hover:text-teal-700 cursor-pointer px-1">
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        {allowFileUpload && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Upload File
          </button>
        )}
        <button
          type="button"
          onClick={() => setAddingLink(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 cursor-pointer transition-colors"
        >
          <Link2 size={12} />
          Add Link
        </button>
        {allowFileUpload && (
          <input ref={fileInputRef} type="file" accept={RESOURCE_ACCEPT} onChange={handleFile} className="hidden" />
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

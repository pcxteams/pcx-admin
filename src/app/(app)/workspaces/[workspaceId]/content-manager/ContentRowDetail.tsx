'use client';

import { useState } from 'react';
import {
  Play, Download, ExternalLink, CornerDownRight, PencilLine, Loader2,
} from 'lucide-react';
import {
  TYPE_META, formatDate, estTimeLabel, verificationTypeLabel, LEADER_ACTION_LABEL,
  type ContentItemDetail, type ExternalLinkConfig, type ResourceConfig,
  type LeaderVerificationConfig,
} from '@/lib/content';
import { TypeIcon } from './content-icons';

const LABEL = 'text-[10px] font-semibold tracking-widest text-gray-400 uppercase';

export default function ContentRowDetail({
  detail, workspaceId, canManage, onEdit,
}: {
  detail: ContentItemDetail;
  workspaceId: string;
  canManage: boolean;
  onEdit: () => void;
}) {
  const meta = TYPE_META[detail.type];
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/content/${detail.id}/download-url`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        setDownloadError('Could not open this file.');
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setDownloadError('Network error.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-3">
      {/* Left: preview + details */}
      <div className="lg:col-span-2 flex gap-6">
        <Preview detail={detail} downloading={downloading} onDownload={handleDownload} />

        <div className="flex-1 min-w-0 space-y-4">
          {detail.description && (
            <div>
              <p className={LABEL}>Description</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{detail.description}</p>
            </div>
          )}

          <div>
            <p className={LABEL}>Content Type</p>
            <p className="text-sm text-teal-700 font-medium mt-1">{meta.label}</p>
          </div>

          {detail.type === 'leader_verification' && (
            <>
              <div>
                <p className={LABEL}>Verification Type</p>
                <p className="text-sm text-gray-600 mt-1">
                  {verificationTypeLabel((detail.config as LeaderVerificationConfig).verificationType)}
                </p>
              </div>
              <div>
                <p className={LABEL}>Leader Actions</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {((detail.config as LeaderVerificationConfig).leaderActions ?? []).map((a) => (
                    <span key={a} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                      {LEADER_ACTION_LABEL[a] ?? a}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {detail.tags.length > 0 && (
            <div>
              <p className={LABEL}>Tags</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {detail.tags.map((t) => (
                  <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {estTimeLabel(detail) !== '—' && (
            <div>
              <p className={LABEL}>Estimated Time</p>
              <p className="text-sm text-gray-600 mt-1">{estTimeLabel(detail)}</p>
            </div>
          )}

          <div>
            <p className={LABEL}>Audit Information</p>
            <div className="grid grid-cols-2 gap-4 mt-1.5 max-w-sm">
              <div>
                <p className="text-[11px] text-gray-400">Last Updated</p>
                <p className="text-sm text-gray-600">{formatDate(detail.updatedAt)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Last Updated By</p>
                <p className="text-sm text-gray-600">{detail.lastEditedByName ?? '—'}</p>
              </div>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors cursor-pointer"
            >
              <PencilLine size={13} />
              Edit
            </button>
          )}
          {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}
        </div>
      </div>

      {/* Right: used in + related content */}
      <div className="space-y-5">
        <div>
          <p className={LABEL}>Used In</p>
          <div className="mt-2 space-y-3">
            {detail.usage.length === 0 ? (
              <p className="text-sm text-gray-400">Not referenced anywhere yet.</p>
            ) : (
              detail.usage.map((u, idx) => {
                const path = u.path.length ? u.path : [`${u.referenceType}: ${u.referenceId}`];
                return (
                  <div key={`${u.referenceType}:${u.referenceId}:${idx}`} className="space-y-0.5">
                    {path.map((seg, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 text-xs"
                        style={{ paddingLeft: i * 14 }}
                      >
                        {i > 0 && <CornerDownRight size={11} className="text-gray-300 shrink-0" />}
                        <span className={i === path.length - 1 ? 'text-teal-700 font-medium' : 'text-gray-600'}>
                          {seg}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <p className={LABEL}>Related Content</p>
          <div className="mt-2 space-y-1.5">
            {detail.relatedContent.length === 0 ? (
              <p className="text-sm text-gray-400">None.</p>
            ) : (
              detail.relatedContent.map((r) => {
                const rm = TYPE_META[r.type];
                return (
                  <div key={r.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <TypeIcon type={r.type} iconColor={rm.iconColor} iconBg={rm.iconBg} tile="w-6 h-6" size={12} />
                    <span className="truncate">{r.title}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- preview */

function Preview({
  detail, downloading, onDownload,
}: {
  detail: ContentItemDetail;
  downloading: boolean;
  onDownload: () => void;
}) {
  const meta = TYPE_META[detail.type];

  if (detail.type === 'video') {
    return (
      <div className="shrink-0">
        <div className="w-56 h-32 rounded-lg bg-slate-800 flex items-center justify-center">
          <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={18} className="text-slate-700 ml-0.5" />
          </span>
        </div>
        <div className="mt-2">
          <DownloadButton downloading={downloading} onDownload={onDownload} label="Download video" />
        </div>
      </div>
    );
  }

  if (detail.type === 'external_link') {
    const cfg = detail.config as ExternalLinkConfig;
    return (
      <div className="shrink-0 w-56">
        <div className="w-56 h-32 rounded-lg bg-cyan-50 flex items-center justify-center">
          <TypeIcon type="external_link" iconColor={meta.iconColor} iconBg="bg-transparent" size={30} tile="w-14 h-14" />
        </div>
        {cfg.url && (
          <a
            href={cfg.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 max-w-56 truncate"
          >
            <ExternalLink size={12} className="shrink-0" />
            <span className="truncate">{cfg.url}</span>
          </a>
        )}
      </div>
    );
  }

  if (detail.type === 'resource') {
    const cfg = detail.config as ResourceConfig;
    return (
      <div className="shrink-0 w-56">
        <div className={`w-56 h-32 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
          <TypeIcon type="resource" iconColor={meta.iconColor} iconBg="bg-transparent" size={30} tile="w-14 h-14" />
        </div>
        <p className="mt-2 text-xs text-gray-500 truncate">{cfg.fileName}</p>
        <DownloadButton downloading={downloading} onDownload={onDownload} label="Download file" />
      </div>
    );
  }

  // leader_verification — icon tile
  return (
    <div className="shrink-0">
      <div className={`w-56 h-32 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
        <TypeIcon type={detail.type} iconColor={meta.iconColor} iconBg="bg-transparent" size={34} tile="w-16 h-16" />
      </div>
    </div>
  );
}

function DownloadButton({
  downloading, onDownload, label,
}: {
  downloading: boolean;
  onDownload: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={downloading}
      className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50 cursor-pointer"
    >
      {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {label}
    </button>
  );
}

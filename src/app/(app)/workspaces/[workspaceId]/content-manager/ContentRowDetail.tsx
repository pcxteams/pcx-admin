'use client';

import { useEffect, useState } from 'react';
import {
  Download, ExternalLink, PencilLine, Loader2,
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
        <Preview detail={detail} workspaceId={workspaceId} downloading={downloading} onDownload={handleDownload} />

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
                <p className="mt-1.5 text-[11px] text-gray-400">
                  On reject, the task is reopened for the agent to retry. Nothing is blocked.
                </p>
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

      {/* Right: related content */}
      <div className="space-y-5">
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
  detail, workspaceId, downloading, onDownload,
}: {
  detail: ContentItemDetail;
  workspaceId: string;
  downloading: boolean;
  onDownload: () => void;
}) {
  const meta = TYPE_META[detail.type];

  if (detail.type === 'video') {
    return (
      <VideoPreview
        detail={detail}
        workspaceId={workspaceId}
        downloading={downloading}
        onDownload={onDownload}
      />
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

  // leader_verification: icon tile
  return (
    <div className="shrink-0">
      <div className={`w-56 h-32 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
        <TypeIcon type={detail.type} iconColor={meta.iconColor} iconBg="bg-transparent" size={34} tile="w-16 h-16" />
      </div>
    </div>
  );
}

/**
 * Inline video player. Fetches a short-lived presigned GET URL for the item's
 * private file and streams it through a native <video> element. The presigned
 * URL serves the object inline (no forced download disposition), so the browser
 * can range-request and scrub it directly.
 */
function VideoPreview({
  detail, workspaceId, downloading, onDownload,
}: {
  detail: ContentItemDetail;
  workspaceId: string;
  downloading: boolean;
  onDownload: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/content/${detail.id}/download-url`,
          { credentials: 'include', signal: ctrl.signal },
        );
        if (!res.ok) {
          setLoadError('Could not load this video.');
          return;
        }
        const { url: signed } = (await res.json()) as { url: string };
        setUrl(signed);
      } catch {
        if (!ctrl.signal.aborted) setLoadError('Could not load this video.');
      }
    })();
    return () => ctrl.abort();
  }, [workspaceId, detail.id]);

  return (
    <div className="shrink-0">
      <div className="w-56 h-32 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center">
        {url ? (
          <video
            src={url}
            controls
            preload="metadata"
            className="w-full h-full bg-black"
            onError={() => setLoadError('This video could not be played.')}
          />
        ) : loadError ? (
          <span className="px-3 text-center text-xs text-white/70">{loadError}</span>
        ) : (
          <Loader2 size={18} className="text-white/70 animate-spin" />
        )}
      </div>
      {loadError && url && <p className="mt-1 text-[11px] text-red-500">{loadError}</p>}
      <div className="mt-2">
        <DownloadButton downloading={downloading} onDownload={onDownload} label="Download video" />
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

/**
 * Content Manager (KAN-90) client types + shared constants. Mirrors the NestJS
 * `src/content` responses. Content is workspace-scoped; the cross-workspace
 * distribution model (ticket open-question #1) is deferred.
 */

/** Form and Quiz are deferred to phase 2 and are not in the MVP set. */
export const CONTENT_TYPES = [
  'video',
  'resource',
  'external_link',
  'leader_verification',
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = ['active', 'draft', 'archive'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/**
 * Category taxonomy confirmed by product 2026-08-28/29 for the Career Builder
 * AI pivot, replacing the original 7-item MVP placeholder (open-question #2).
 * Mirrors pcx-api-v2-new's src/content/types/content.ts — keep in sync.
 */
export const CONTENT_CATEGORIES = [
  'Onboarding',
  'Business Planning',
  'Mindset & Personal Performance',
  'Lead Generation',
  'Buyers',
  'Sellers',
  'CRM',
  'MLS',
  'Contracts',
  'Negotiation',
  'Client Management',
  'Systems + Automation',
  'Transaction Management',
  'Financial & Wealth Building',
  'Tax Planning',
  'Team Building',
  'Leadership Development',
  'AI and Technology',
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

export type ContentSort = 'recently_updated' | 'recently_created' | 'title';

/**
 * Career Builder AI tag dimensions confirmed by product 2026-08-28/29.
 * Mirrors pcx-api-v2-new's src/content/types/content.ts — keep in sync.
 * Distinct from `status` above (publish state) and `category` above (topic).
 */
export const CONTENT_PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'very_important', label: 'Very Important' },
  { value: 'important', label: 'Important' },
] as const;
export type ContentPriority = (typeof CONTENT_PRIORITIES)[number]['value'];

/** Same three values as workspace_membership.onboarding_type — no mapping table. */
export const AGENT_LEVELS = [
  { value: 'new_agent', label: 'New Agent' },
  { value: 'transfer_some_experience', label: 'Producer' },
  { value: 'transfer_highly_experienced', label: 'Top Producer' },
] as const;
export type AgentLevel = (typeof AGENT_LEVELS)[number]['value'];

export const CONTENT_PURPOSES = [
  { value: 'learn', label: 'Learn' },
  { value: 'plan', label: 'Plan' },
  { value: 'do', label: 'Do' },
  { value: 'reference', label: 'Reference' },
] as const;
export type ContentPurpose = (typeof CONTENT_PURPOSES)[number]['value'];

export const ASSIGNMENT_STATUSES = [
  { value: 'required', label: 'Required' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'optional', label: 'Optional' },
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]['value'];

/** Accepted upload MIME types, kept in sync with the API allowlists. */
export const RESOURCE_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp';
export const VIDEO_ACCEPT = '.mp4,.webm,.mov,.avi';

/** Mirrors the API's leader-verification type enum. */
export const LEADER_VERIFICATION_TYPES = [
  { value: 'live_role_play', label: 'Live Role Play' },
  { value: 'in_person_observation', label: 'In-Person Observation' },
  { value: 'call', label: 'Call' },
  { value: 'video_submission_review', label: 'Video Submission Review' },
  { value: 'file_or_document_review', label: 'File or Document Review' },
  { value: 'form_review', label: 'Form Review' },
  { value: 'other', label: 'Other' },
] as const;

export function verificationTypeLabel(value: string | undefined): string {
  return LEADER_VERIFICATION_TYPES.find((t) => t.value === value)?.label ?? '—';
}

export const LEADER_ACTION_LABEL: Record<string, string> = {
  approve: 'Approve',
  reject: 'Reject',
};

export const VIDEO_EMBED_PROVIDERS = ['youtube', 'vimeo'] as const;
export type VideoEmbedProvider = (typeof VIDEO_EMBED_PROVIDERS)[number];

/** Video is either a private S3 upload (default) or a YouTube/Vimeo embed. */
export interface VideoConfig {
  source?: 'upload' | 'embed';
  // upload
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  /** Duration in seconds, auto-detected from the file on upload. */
  durationSeconds?: number;
  // embed
  url?: string;
  provider?: VideoEmbedProvider;
  embedId?: string;
}

export interface ParsedVideoEmbed {
  provider: VideoEmbedProvider;
  embedId: string;
}

/**
 * Recognizes a YouTube or Vimeo watch/share/embed URL and extracts the
 * provider + video id. Mirrors the server-side parser in
 * pcx-api-v2-new/src/content/types/content.ts so the client can reject a bad
 * link before ever calling the API.
 */
export function parseVideoEmbedUrl(raw: string): ParsedVideoEmbed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    const id = segments[0];
    return isYoutubeId(id) ? { provider: 'youtube', embedId: id } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id && isYoutubeId(id)
        ? { provider: 'youtube', embedId: id }
        : null;
    }
    if (
      segments.length >= 2 &&
      ['embed', 'shorts', 'live'].includes(segments[0]) &&
      isYoutubeId(segments[1])
    ) {
      return { provider: 'youtube', embedId: segments[1] };
    }
    return null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = [...segments].reverse().find((s) => /^\d+$/.test(s));
    return id ? { provider: 'vimeo', embedId: id } : null;
  }
  return null;
}

function isYoutubeId(id: string | undefined): id is string {
  return typeof id === 'string' && /^[\w-]{10,12}$/.test(id);
}

/** Restricted embed src: no related-video rail, no branding chrome. */
export function buildVideoEmbedSrc(
  provider: VideoEmbedProvider,
  embedId: string,
): string {
  if (provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${embedId}?rel=0&modestbranding=1&iv_load_policy=3`;
  }
  return `https://player.vimeo.com/video/${embedId}?title=0&byline=0&portrait=0`;
}
export interface ResourceConfig {
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
}
export interface ExternalLinkConfig {
  url: string;
}
export interface LeaderVerificationConfig {
  verificationType: string;
  leaderActions: string[];
}
export type ContentConfig =
  | VideoConfig
  | ResourceConfig
  | ExternalLinkConfig
  | LeaderVerificationConfig
  | Record<string, never>;

export interface ContentAccess {
  canView: boolean;
  canManage: boolean;
  membershipRole: 'manager' | 'leader' | 'agent' | null;
  platformRole: string | null;
}

/** A table-row summary. */
export interface ContentItemSummary {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  status: ContentStatus;
  priority: ContentPriority | null;
  agentLevels: AgentLevel[];
  purpose: ContentPurpose | null;
  assignmentStatus: AssignmentStatus | null;
  estTime: string | null;
  config: ContentConfig;
  usedInCount: number;
  lastEditedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentUsageRef {
  referenceType: string;
  referenceId: string;
  path: string[];
}

export interface RelatedContentRef {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
}

/** Full detail for the expanded row / edit form. */
export interface ContentItemDetail extends ContentItemSummary {
  relatedContentIds: string[];
  usage: ContentUsageRef[];
  relatedContent: RelatedContentRef[];
  createdBy: string | null;
  createdByName: string | null;
  lastEditedByName: string | null;
  access?: ContentAccess;
}

export interface ContentListResponse {
  items: ContentItemSummary[];
  total: number;
  page: number;
  pageSize: number;
  access: ContentAccess;
}

/**
 * A master content row from GET /master/content. `workspaceId` null means
 * global — visible to every workspace, present and future (migration 0032,
 * no more single/subset/global choice); set means single-workspace master
 * content created via the per-workspace Content Manager route. No
 * `usedInCount` — the backend's toSummary() doesn't compute it for master
 * content.
 */
export interface MasterContentItemSummary extends Omit<ContentItemSummary, 'usedInCount'> {
  workspaceId: string | null;
  isMasterContent: boolean;
}

export interface MasterContentListResponse {
  items: MasterContentItemSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/* ------------------------------------------------------------- presentation */

export const TYPE_META: Record<
  ContentType,
  { label: string; plural: string; iconColor: string; iconBg: string; badge: string }
> = {
  video: {
    label: 'Video',
    plural: 'Videos',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    badge: 'bg-blue-50 text-blue-600',
  },
  resource: {
    label: 'Resource',
    plural: 'Resources',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    badge: 'bg-orange-50 text-orange-600',
  },
  external_link: {
    label: 'External Link',
    plural: 'External Links',
    iconColor: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    badge: 'bg-cyan-50 text-cyan-600',
  },
  leader_verification: {
    label: 'Leader Verification',
    plural: 'Leader Verifications',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    badge: 'bg-purple-50 text-purple-600',
  },
};

export const STATUS_META: Record<ContentStatus, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-green-50 text-green-600' },
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-500' },
  archive: { label: 'Archived', cls: 'bg-red-50 text-red-500' },
};

/** "Est. Time" column value (manual free text). */
export function estTimeLabel(item: Pick<ContentItemSummary, 'estTime'>): string {
  const t = item.estTime?.trim();
  return t ? t : '—';
}

export function usedInLabel(count: number): string {
  return `${count} Action${count === 1 ? '' : 's'}`;
}

/**
 * Human-readable video length, e.g. "4 min 32 sec" or "1 hr 3 min". Seconds are
 * dropped once the duration reaches an hour to keep the label compact. Returns
 * null for non-finite input so callers can fall back to manual entry.
 */
export function formatDuration(totalSeconds: number): string | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return null;
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours} hr`);
  if (minutes) parts.push(`${minutes} min`);
  if (seconds && !hours) parts.push(`${seconds} sec`);
  return parts.length ? parts.join(' ') : '0 sec';
}

/** Compact relative time for the "Last Updated" column. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (days < 30) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  if (days < 365) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

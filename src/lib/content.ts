/**
 * Content Manager (KAN-90) client types + shared constants. Mirrors the NestJS
 * `src/content` responses. Content is workspace-scoped; the cross-workspace
 * distribution model (ticket open-question #1) is deferred.
 */

export const CONTENT_TYPES = [
  'video',
  'resource',
  'external_link',
  'form',
  'quiz',
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = ['active', 'draft', 'archive'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Fixed MVP category list (open-question #2 — admin-managed later). */
export const CONTENT_CATEGORIES = [
  'Buyer',
  'Listing',
  'CRM',
  'Lead Generation',
  'Marketing',
  'Contracts',
  'Leadership',
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

export type ContentSort = 'recently_updated' | 'recently_created' | 'title';

/** Accepted upload MIME types, kept in sync with the API allowlists. */
export const RESOURCE_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp';
export const VIDEO_ACCEPT = '.mp4,.webm,.mov,.avi';

export interface VideoConfig {
  source: 'embed' | 'upload';
  url?: string;
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
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
export interface FormConfig {
  fields: Array<{ id: string; label: string; type: string; required?: boolean }>;
}
export interface QuizConfig {
  questions: Array<{ id: string; prompt: string }>;
}
export type ContentConfig =
  | VideoConfig
  | ResourceConfig
  | ExternalLinkConfig
  | FormConfig
  | QuizConfig
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
  estTimeMinutes: number | null;
  questionCount: number | null;
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
  form: {
    label: 'Form',
    plural: 'Forms',
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
    badge: 'bg-green-50 text-green-600',
  },
  quiz: {
    label: 'Quiz',
    plural: 'Quizzes',
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

/** "Est. Time" column value per the design: minutes for video, count for quiz. */
export function estTimeLabel(item: ContentItemSummary): string {
  if (item.type === 'video' && item.estTimeMinutes != null) {
    return `${item.estTimeMinutes} min`;
  }
  if (item.type === 'quiz' && item.questionCount != null) {
    return `${item.questionCount} Question${item.questionCount === 1 ? '' : 's'}`;
  }
  return '—';
}

export function usedInLabel(count: number): string {
  return `${count} Action${count === 1 ? '' : 's'}`;
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

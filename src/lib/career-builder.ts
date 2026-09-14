/**
 * Career Builder Topic -> Section -> Step authoring hierarchy client types +
 * shared constants. Mirrors pcx-api-v2's src/content/topic.entity.ts,
 * section.entity.ts, and the Topic/Section additions to
 * src/content/types/content.ts (migrations 0033/0034).
 *
 * A Step is still a content_item row (see lib/content.ts for its full
 * ContentItemDetail shape) — this file only adds the two new step types and
 * the Topic/Section layer above it.
 */
import {
  BookOpen, Type, User, Users, Home, MapPin, Database, FileText, Zap,
  TrendingUp, Lightbulb, Target, ClipboardList, Scale, Layers, Video,
  Briefcase, Shield, Star, Award, Compass, GraduationCap, Phone, Handshake,
  Calculator, type LucideIcon,
} from 'lucide-react';
import type { ContentItemDetail } from './content';

/** The two step types added for this hierarchy — see types/content.ts on the API side. */
export const CAREER_BUILDER_STEP_TYPES = ['instruction', 'video', 'resource', 'plain_text'] as const;
export type CareerBuilderStepType = (typeof CAREER_BUILDER_STEP_TYPES)[number];

/** Shared config shape for `instruction` and `plain_text` — identical fields, distinct types. */
export interface TextConfig {
  body: string | null;
}

export interface FileAttachment {
  kind: 'file';
  fileKey: string;
  fileName: string;
  mimeType?: string;
  fileSizeBytes?: number;
}
export interface LinkAttachment {
  kind: 'link';
  url: string;
  label?: string;
}
export type Attachment = FileAttachment | LinkAttachment;

/**
 * Matches the server's TOPIC_ICONS allowlist (pcx-api-v2/src/content/types/content.ts)
 * exactly — keep in sync. Order here is the order shown in the icon picker.
 */
export const TOPIC_ICONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'user', label: 'Person', Icon: User },
  { value: 'users', label: 'People', Icon: Users },
  { value: 'home', label: 'Home', Icon: Home },
  { value: 'map-pin', label: 'Location', Icon: MapPin },
  { value: 'database', label: 'Database', Icon: Database },
  { value: 'file-text', label: 'Document', Icon: FileText },
  { value: 'zap', label: 'Energy', Icon: Zap },
  { value: 'trending-up', label: 'Growth', Icon: TrendingUp },
  { value: 'lightbulb', label: 'Idea', Icon: Lightbulb },
  { value: 'target', label: 'Target', Icon: Target },
  { value: 'clipboard-list', label: 'Checklist', Icon: ClipboardList },
  { value: 'scale', label: 'Balance', Icon: Scale },
  { value: 'layers', label: 'Systems', Icon: Layers },
  { value: 'book-open', label: 'Learning', Icon: BookOpen },
  { value: 'video', label: 'Video', Icon: Video },
  { value: 'briefcase', label: 'Business', Icon: Briefcase },
  { value: 'shield', label: 'Protection', Icon: Shield },
  { value: 'star', label: 'Star', Icon: Star },
  { value: 'award', label: 'Award', Icon: Award },
  { value: 'compass', label: 'Direction', Icon: Compass },
  { value: 'graduation-cap', label: 'Education', Icon: GraduationCap },
  { value: 'phone-call', label: 'Calls', Icon: Phone },
  { value: 'handshake', label: 'Negotiation', Icon: Handshake },
  { value: 'calculator', label: 'Finance', Icon: Calculator },
];

/**
 * Plain object, not a Map — a component consumer does `TOPIC_ICON_BY_VALUE[x]`
 * directly (same pattern as content-icons.tsx's TYPE_ICON), so the lookup
 * reads as a static, direct index to the react-hooks/static-components lint
 * rule rather than an opaque function call that "might construct a new
 * component" on every render.
 */
export const TOPIC_ICON_BY_VALUE: Record<string, LucideIcon> = Object.fromEntries(
  TOPIC_ICONS.map((i) => [i.value, i.Icon]),
);

export interface Topic {
  id: string;
  workspaceId: string | null;
  isMasterContent: boolean;
  title: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicSummary extends Topic {
  sectionCount: number;
  stepCount: number;
}

/** A step row in the sections table — a thin summary, not the full content_item. */
export interface StepSummary {
  id: string;
  type: CareerBuilderStepType | string;
  title: string;
  status: 'active' | 'draft' | 'archive';
  assignmentStatus: 'required' | 'recommended' | 'optional' | null;
  displayOrder: number;
}

export interface Section {
  id: string;
  title: string;
  displayOrder: number;
  steps: StepSummary[];
}

export interface TopicDetail extends Topic {
  sections: Section[];
}

/**
 * Full step detail, fetched via GET .../content/:id when opening a step for
 * edit (the topic-detail `sections[].steps` array only carries StepSummary).
 * Extends lib/content.ts's ContentItemDetail with the fields migration 0033
 * added to content_item; `config` is loosely typed here since instruction/
 * plain_text's TextConfig isn't part of that file's ContentConfig union.
 */
export interface StepDetail extends Omit<ContentItemDetail, 'config'> {
  sectionId: string;
  displayOrder: number;
  attachments: Attachment[];
  config: Record<string, unknown>;
}

/* ------------------------------------------------------------- presentation */

export const STEP_TYPE_META: Record<
  CareerBuilderStepType,
  { label: string; description: string; iconColor: string; iconBg: string; badge: string; Icon: LucideIcon }
> = {
  instruction: {
    label: 'Instruction',
    description: 'Written directions or guidance',
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    badge: 'bg-indigo-50 text-indigo-600',
    Icon: BookOpen,
  },
  video: {
    label: 'Video',
    description: 'Upload or link a video',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    badge: 'bg-blue-50 text-blue-600',
    Icon: Video,
  },
  resource: {
    label: 'Resource',
    description: 'Upload or link a file or document',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    badge: 'bg-orange-50 text-orange-600',
    Icon: FileText,
  },
  plain_text: {
    label: 'Plain Text',
    description: 'Write a text description',
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    badge: 'bg-slate-100 text-slate-600',
    Icon: Type,
  },
};

export const REQUIREMENT_OPTIONS = [
  { value: 'required', label: 'Required' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'optional', label: 'Optional' },
] as const;

export const STEP_STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-green-50 text-green-600' },
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-500' },
  archive: { label: 'Archived', cls: 'bg-red-50 text-red-500' },
};

export function requirementLabel(value: string | null): string {
  return REQUIREMENT_OPTIONS.find((o) => o.value === value)?.label ?? 'Optional';
}

export function sectionCountLabel(sections: number, steps: number): string {
  return `${sections} Section${sections === 1 ? '' : 's'} · ${steps} Step${steps === 1 ? '' : 's'}`;
}

/**
 * Scope discriminant shared by TopicsListView/TopicDetailView/the modals so
 * the exact same components drive both the workspace-scoped Career Builder
 * page and the master-only Content Library page — only the API base paths
 * differ.
 */
export type CareerBuilderScope =
  | { kind: 'workspace'; workspaceId: string }
  | { kind: 'master' };

export function topicsApiBase(scope: CareerBuilderScope): string {
  return scope.kind === 'workspace'
    ? `/api/workspaces/${scope.workspaceId}/topics`
    : '/api/master/topics';
}

export function contentApiBase(scope: CareerBuilderScope): string {
  return scope.kind === 'workspace'
    ? `/api/workspaces/${scope.workspaceId}/content`
    : '/api/master/content';
}

/**
 * Full step detail/update/status/delete — `/master/content/:id` now mirrors
 * the workspace-scoped route 1:1 (GET/PATCH/PATCH status/DELETE), so this is
 * just `contentApiBase(scope)/:id` for both scopes, no workaround needed.
 */
export function contentItemPath(scope: CareerBuilderScope, stepId: string): string {
  return `${contentApiBase(scope)}/${stepId}`;
}

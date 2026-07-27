/**
 * Office Page content shapes — MIRROR of
 * `pcx-api-v2-new/src/office-page/types/office-page-content.ts`. Keep the two in
 * sync. This is the single source of truth for the builder/render UI (KAN-88).
 */

export const OFFICE_PAGE_SECTION_TYPES = [
  'hero-cards',
  'vendor-carousel',
  'quick-links',
  'announcements',
  'resources',
  'events',
  'leadership',
  'support-cards',
] as const;
export type OfficePageSectionType = (typeof OFFICE_PAGE_SECTION_TYPES)[number];

export const OFFICE_PAGE_LOCK_STATES = ['editable', 'locked_by_pcx', 'view_only'] as const;
export type SectionLockState = (typeof OFFICE_PAGE_LOCK_STATES)[number];

export type LinkOpenBehavior = 'same_tab' | 'new_tab' | 'popup';

export type OfficePageActionType =
  | 'url'
  | 'internal_page'
  | 'document'
  | 'folder'
  | 'form'
  | 'video'
  | 'google_drive'
  | 'dropbox'
  | 'pdf'
  | 'spreadsheet'
  | 'popup'
  | 'email'
  | 'phone'
  | 'message'
  | 'schedule';

export interface OfficePageAction {
  type: OfficePageActionType;
  label?: string;
  destination?: string;
  openBehavior?: LinkOpenBehavior;
  popupCardId?: string;
}

export type FileRefType =
  | 'url'
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'slides'
  | 'image'
  | 'video'
  | 'form'
  | 'internal_page'
  | 'internal_file'
  | 'google_drive'
  | 'dropbox'
  | 'scheduling'
  | 'folder';

export interface FileRef {
  id: string;
  type: FileRefType;
  title?: string;
  destination?: string;
  openBehavior?: LinkOpenBehavior;
  visible?: boolean;
}

export interface OfficePageItemBase {
  id: string;
  order: number;
  active: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroCardItem extends OfficePageItemBase {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  buttonText?: string;
  primaryAction?: OfficePageAction;
  secondaryAction?: OfficePageAction;
}

export interface VendorItem extends OfficePageItemBase {
  name: string;
  category?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  accentColor?: string;
  tags?: string[];
  featured?: boolean;
  rating?: number;
  action?: OfficePageAction;
}

export interface QuickLinkItem extends OfficePageItemBase {
  title: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  action: OfficePageAction;
}

export interface AnnouncementItem extends OfficePageItemBase {
  title: string;
  description?: string;
  date?: string;
  category?: string;
  imageUrl?: string;
  icon?: string;
  action?: OfficePageAction;
  expiresAt?: string;
  pinned?: boolean;
}

export interface ResourceItem extends OfficePageItemBase {
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  accentColor?: string;
  action: OfficePageAction;
}

export interface EventItem extends OfficePageItemBase {
  title: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  description?: string;
  registrationLink?: string;
  category?: string;
  accentColor?: string;
  pinned?: boolean;
}

export interface LeadershipItem extends OfficePageItemBase {
  workspaceMembershipId: string;
  accentColor?: string;
  showMessageButton?: boolean;
  showScheduleButton?: boolean;
  showProfileButton?: boolean;
  showContactInfo?: boolean;
  scheduleLink?: string;
}

export interface SupportCardItem extends OfficePageItemBase {
  title: string;
  description?: string;
  icon?: string;
  assignedMembershipId?: string;
  accentColor?: string;
  buttonText?: string;
  action?: OfficePageAction;
}

export type OfficePageItem =
  | HeroCardItem
  | VendorItem
  | QuickLinkItem
  | AnnouncementItem
  | ResourceItem
  | EventItem
  | LeadershipItem
  | SupportCardItem;

export interface PopupCardItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  links?: OfficePageAction[];
  files?: FileRef[];
  email?: string;
  phone?: string;
  ctaText?: string;
  ctaAction?: OfficePageAction;
  notes?: string;
}

export interface SectionLayout {
  rowId: string;
  span: number;
  minWidth?: number;
}

export interface OfficePageSection {
  key: string;
  type: OfficePageSectionType;
  title: string;
  subtitle?: string;
  order: number;
  visible: boolean;
  lockState: SectionLockState;
  displayLimit?: number;
  layout?: SectionLayout;
  items: OfficePageItem[];
}

export interface RowLayout {
  align?: 'start' | 'center' | 'stretch' | 'end';
  gap?: 'sm' | 'md' | 'lg';
  stackBelow?: 'sm' | 'md' | 'lg';
}

export interface OfficePageContent {
  sections: OfficePageSection[];
  popupCards?: PopupCardItem[];
  rowLayouts?: Record<string, RowLayout>;
}

/** API response for the builder view (`GET /workspaces/:id/office-page`). */
export interface WorkspaceAccess {
  workspaceId: string;
  platformRole: string | null;
  membershipRole: 'manager' | 'leader' | 'agent' | null;
  visibilityScope: 'workspace' | 'assigned_agents' | null;
  canView: boolean;
  canEdit: boolean;
  canPublish: boolean;
}

export interface OfficePageBuilderResponse {
  pageId: string;
  workspaceId: string;
  pageStatus: 'draft' | 'published' | 'archived';
  content: OfficePageContent;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
  lastEditedBy: string | null;
  access: WorkspaceAccess;
}

/**
 * API response for the agent/read view (`GET /workspaces/:id/office-page/published`).
 * `content` is null until the page has been published (never exposes drafts).
 */
export interface OfficePagePublishedResponse {
  workspaceId: string;
  owningWorkspaceId: string;
  pageStatus: 'draft' | 'published' | 'archived' | null;
  content: OfficePageContent | null;
  access: WorkspaceAccess;
}

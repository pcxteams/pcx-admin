import type {
  OfficePageActionType,
  OfficePageItem,
  OfficePageSectionType,
} from '@/lib/office-page-content';

/**
 * Section-type metadata driving the builder: a label, the item noun, how to
 * derive an item's display title, a factory for a blank item, and the editable
 * fields the Inspector renders. Ported/adapted from v2's section-registry to the
 * v3 content types (membership references, no brokerage/course action types).
 */

export type InspectorFieldKind = 'text' | 'textarea' | 'boolean' | 'color' | 'action' | 'icon';

export interface InspectorField {
  key: string;
  label: string;
  kind: InspectorFieldKind;
  placeholder?: string;
  swatches?: string[];
  actionTypes?: OfficePageActionType[];
  actionShowLabel?: boolean;
}

export const ACCENT_COLORS = ['#0d9488', '#4f46e5', '#db2777', '#ea580c', '#2563eb', '#16a34a'];
export const HERO_COLORS = ['#0f172a', '#1e293b', '#134e4a', '#312e81', '#7c2d12', '#164e63'];

const HERO_ACTION_TYPES: OfficePageActionType[] = ['url', 'internal_page', 'document', 'folder', 'popup'];
const QUICK_LINK_ACTION_TYPES: OfficePageActionType[] = ['url', 'internal_page', 'document', 'folder', 'form', 'video', 'popup'];
const RESOURCE_ACTION_TYPES: OfficePageActionType[] = ['document', 'pdf', 'folder', 'url', 'form', 'video', 'internal_page', 'popup'];
const VENDOR_ACTION_TYPES: OfficePageActionType[] = ['url', 'internal_page', 'email', 'phone', 'popup'];
const ANNOUNCEMENT_ACTION_TYPES: OfficePageActionType[] = ['url', 'internal_page', 'document', 'popup'];
const SUPPORT_ACTION_TYPES: OfficePageActionType[] = ['url', 'internal_page', 'email', 'phone', 'message', 'schedule', 'popup'];

const COLOR_FIELD: InspectorField = { key: 'accentColor', label: 'Accent color', kind: 'color', swatches: ACCENT_COLORS };
const TITLE_FIELD: InspectorField = { key: 'title', label: 'Title', kind: 'text' };
const ICON_FIELD: InspectorField = { key: 'icon', label: 'Icon', kind: 'icon' };

export interface SectionTypeMeta {
  label: string;
  itemNoun: string;
  itemTitle: (item: OfficePageItem) => string;
  createItem: (order: number) => OfficePageItem;
  fields: InspectorField[];
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function base(order: number) {
  return { id: newId(), order, active: true };
}

function accent(order: number) {
  return { accentColor: ACCENT_COLORS[order % ACCENT_COLORS.length] };
}

function str(item: OfficePageItem, key: string): string {
  const v = (item as unknown as Record<string, unknown>)[key];
  return typeof v === 'string' && v.trim() ? v : '';
}

export const SECTION_REGISTRY: Record<OfficePageSectionType, SectionTypeMeta> = {
  'hero-cards': {
    label: 'Hero Cards',
    itemNoun: 'card',
    itemTitle: (i) => str(i, 'title') || 'Untitled card',
    createItem: (order) =>
      ({
        ...base(order),
        title: 'Hero headline',
        subtitle: 'Short supporting line',
        backgroundColor: HERO_COLORS[order % HERO_COLORS.length],
      }) as OfficePageItem,
    fields: [
      TITLE_FIELD,
      { key: 'subtitle', label: 'Subtitle', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'backgroundColor', label: 'Card color', kind: 'color', swatches: HERO_COLORS },
      { key: 'backgroundImageUrl', label: 'Background image URL', kind: 'text', placeholder: 'https://…' },
      { key: 'buttonText', label: 'Button text', kind: 'text' },
      { key: 'primaryAction', label: 'Button action', kind: 'action', actionTypes: HERO_ACTION_TYPES },
      { key: 'secondaryAction', label: 'Secondary link', kind: 'action', actionTypes: HERO_ACTION_TYPES, actionShowLabel: true },
    ],
  },
  'vendor-carousel': {
    label: 'Vendor Carousel',
    itemNoun: 'vendor',
    itemTitle: (i) => str(i, 'name') || 'Untitled vendor',
    createItem: (order) =>
      ({ ...base(order), name: 'Vendor name', category: 'Category', ...accent(order) }) as OfficePageItem,
    fields: [
      { key: 'name', label: 'Name', kind: 'text' },
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'logoUrl', label: 'Logo URL', kind: 'text', placeholder: 'https://…' },
      { key: 'website', label: 'Website', kind: 'text', placeholder: 'https://…' },
      { key: 'contactName', label: 'Contact name', kind: 'text' },
      { key: 'contactEmail', label: 'Contact email', kind: 'text', placeholder: 'name@example.com' },
      { key: 'contactPhone', label: 'Contact phone', kind: 'text', placeholder: '+1 555 000 1234' },
      { key: 'action', label: 'Button action', kind: 'action', actionTypes: VENDOR_ACTION_TYPES, actionShowLabel: true },
      { key: 'featured', label: 'Featured', kind: 'boolean' },
      COLOR_FIELD,
    ],
  },
  'quick-links': {
    label: 'Quick Links',
    itemNoun: 'link',
    itemTitle: (i) => str(i, 'title') || 'Untitled link',
    createItem: (order) => ({ ...base(order), title: 'Quick link', action: { type: 'url' } }) as OfficePageItem,
    fields: [
      TITLE_FIELD,
      { key: 'subtitle', label: 'Subtitle', kind: 'text' },
      ICON_FIELD,
      { key: 'action', label: 'Link action', kind: 'action', actionTypes: QUICK_LINK_ACTION_TYPES },
      COLOR_FIELD,
    ],
  },
  announcements: {
    label: 'Announcements',
    itemNoun: 'announcement',
    itemTitle: (i) => str(i, 'title') || 'Untitled announcement',
    createItem: (order) =>
      ({ ...base(order), title: 'Announcement title', description: 'What this announcement is about.' }) as OfficePageItem,
    fields: [
      TITLE_FIELD,
      { key: 'description', label: 'Description', kind: 'textarea' },
      ICON_FIELD,
      { key: 'date', label: 'Date', kind: 'text' },
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'imageUrl', label: 'Image URL', kind: 'text', placeholder: 'https://…' },
      { key: 'action', label: 'Action', kind: 'action', actionTypes: ANNOUNCEMENT_ACTION_TYPES, actionShowLabel: true },
      { key: 'expiresAt', label: 'Expires at', kind: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'pinned', label: 'Pinned', kind: 'boolean' },
    ],
  },
  resources: {
    label: 'Resources',
    itemNoun: 'resource',
    itemTitle: (i) => str(i, 'title') || 'Untitled resource',
    createItem: (order) =>
      ({ ...base(order), title: 'Resource name', category: 'Category', action: { type: 'url' }, ...accent(order) }) as OfficePageItem,
    fields: [
      TITLE_FIELD,
      { key: 'description', label: 'Description', kind: 'textarea' },
      ICON_FIELD,
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'action', label: 'Opens', kind: 'action', actionTypes: RESOURCE_ACTION_TYPES },
      COLOR_FIELD,
    ],
  },
  events: {
    label: 'Upcoming Events',
    itemNoun: 'event',
    itemTitle: (i) => str(i, 'title') || 'Untitled event',
    createItem: (order) =>
      ({ ...base(order), title: 'Event title', startsAt: 'Date · time', ...accent(order) }) as OfficePageItem,
    fields: [
      TITLE_FIELD,
      { key: 'startsAt', label: 'Starts at', kind: 'text' },
      { key: 'endsAt', label: 'Ends at', kind: 'text' },
      { key: 'location', label: 'Location', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'registrationLink', label: 'Registration link', kind: 'text', placeholder: 'https://…' },
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'pinned', label: 'Pinned', kind: 'boolean' },
      COLOR_FIELD,
    ],
  },
  leadership: {
    label: 'Office Leadership',
    itemNoun: 'leader',
    itemTitle: (i) => (str(i, 'workspaceMembershipId') ? 'Leadership member' : 'Unassigned leader'),
    // A proper roster picker (reading workspace_membership) is a follow-up; for now
    // the reference is entered as a membership id.
    createItem: (order) =>
      ({
        ...base(order),
        workspaceMembershipId: '',
        showMessageButton: true,
        showScheduleButton: true,
        showProfileButton: true,
        ...accent(order),
      }) as unknown as OfficePageItem,
    fields: [
      { key: 'workspaceMembershipId', label: 'Membership ID', kind: 'text', placeholder: 'workspace_membership.id' },
      { key: 'scheduleLink', label: 'Schedule link', kind: 'text', placeholder: 'https://…' },
      { key: 'showMessageButton', label: 'Show message button', kind: 'boolean' },
      { key: 'showScheduleButton', label: 'Show schedule button', kind: 'boolean' },
      { key: 'showProfileButton', label: 'Show profile button', kind: 'boolean' },
      { key: 'showContactInfo', label: 'Show contact info', kind: 'boolean' },
      { ...COLOR_FIELD, label: 'Avatar color' },
    ],
  },
  'support-cards': {
    label: 'Support Cards',
    itemNoun: 'card',
    itemTitle: (i) => str(i, 'title') || 'Untitled card',
    createItem: (order) =>
      ({ ...base(order), title: 'Support option', description: 'How this option can help.', ...accent(order) }) as OfficePageItem,
    fields: [
      TITLE_FIELD,
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'buttonText', label: 'Button text', kind: 'text' },
      { key: 'action', label: 'Button action', kind: 'action', actionTypes: SUPPORT_ACTION_TYPES, actionShowLabel: true },
      { key: 'assignedMembershipId', label: 'Assigned contact (membership ID)', kind: 'text' },
      COLOR_FIELD,
    ],
  },
};

export function sectionMeta(type: OfficePageSectionType): SectionTypeMeta {
  return SECTION_REGISTRY[type];
}

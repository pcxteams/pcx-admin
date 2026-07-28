import type { ComponentType } from 'react';
import {
  BadgeDollarSign,
  BookOpenText,
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  Cloud,
  FileSignature,
  FileText,
  FolderOpen,
  GraduationCap,
  Megaphone,
  MessagesSquare,
  Repeat2,
  Search,
  ShieldCheck,
  Signature,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

/**
 * Named icons an editor can attach to a tool / announcement / resource via a
 * section item's `icon` field. Shared by the render view (`OfficePageView`) and
 * the builder's icon picker so both agree. Names (not glyphs) keep content
 * professional and swappable; unknown names fall back gracefully at the call site.
 */

export type IconComponent = ComponentType<{ size?: number; className?: string }>;

export const ICON_MAP: Record<string, IconComponent> = {
  // quick-access tools
  building: Building2,
  search: Search,
  'file-signature': FileSignature,
  signature: Signature,
  cloud: Cloud,
  megaphone: Megaphone,
  calendar: CalendarDays,
  sparkles: Sparkles,
  bot: Bot,
  // announcements
  clipboard: ClipboardList,
  dollar: BadgeDollarSign,
  message: MessagesSquare,
  graduation: GraduationCap,
  trophy: Trophy,
  folder: FolderOpen,
  // resources
  business: FileText,
  policies: BookOpenText,
  marketing: Megaphone,
  training: Repeat2,
  success: Users,
  hr: ShieldCheck,
  document: FileText,
  book: BookOpenText,
  users: Users,
  shield: ShieldCheck,
};

/** Resolve a named icon, or `undefined` if the name is empty/unknown (or a glyph). */
export function iconFor(name?: string): IconComponent | undefined {
  return name ? ICON_MAP[name] : undefined;
}

/**
 * Curated, de-duplicated list for the builder's icon picker (one entry per
 * distinct glyph, with a friendly label). The full `ICON_MAP` still resolves any
 * alias names already stored in content.
 */
export const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'building', label: 'Building' },
  { name: 'search', label: 'Search' },
  { name: 'file-signature', label: 'Contract' },
  { name: 'signature', label: 'Signature' },
  { name: 'cloud', label: 'Cloud' },
  { name: 'megaphone', label: 'Megaphone' },
  { name: 'calendar', label: 'Calendar' },
  { name: 'sparkles', label: 'Sparkles' },
  { name: 'bot', label: 'Bot' },
  { name: 'clipboard', label: 'Clipboard' },
  { name: 'dollar', label: 'Dollar' },
  { name: 'message', label: 'Message' },
  { name: 'graduation', label: 'Training' },
  { name: 'trophy', label: 'Trophy' },
  { name: 'folder', label: 'Folder' },
  { name: 'business', label: 'Document' },
  { name: 'policies', label: 'Handbook' },
  { name: 'training', label: 'Systems' },
  { name: 'success', label: 'People' },
  { name: 'hr', label: 'Shield' },
];

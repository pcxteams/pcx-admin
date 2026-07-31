import { Video, FileText, Link2, ClipboardList, CircleHelp, type LucideIcon } from 'lucide-react';
import type { ContentType } from '@/lib/content';

export const TYPE_ICON: Record<ContentType, LucideIcon> = {
  video: Video,
  resource: FileText,
  external_link: Link2,
  form: ClipboardList,
  quiz: CircleHelp,
};

/** Rounded icon tile used in table rows, detail panels, and related-content lists. */
export function TypeIcon({
  type,
  iconColor,
  iconBg,
  size = 15,
  tile = 'w-7 h-7',
}: {
  type: ContentType;
  iconColor: string;
  iconBg: string;
  size?: number;
  tile?: string;
}) {
  const Icon = TYPE_ICON[type];
  return (
    <span
      className={`inline-flex items-center justify-center ${tile} rounded ${iconBg} ${iconColor} shrink-0`}
    >
      <Icon size={size} />
    </span>
  );
}

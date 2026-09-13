import { Layers } from 'lucide-react';
import { TOPIC_ICON_BY_VALUE } from '@/lib/career-builder';

/** Resolves a Topic's icon value to a lucide component and renders it. */
export function TopicIcon({ icon, size = 17 }: { icon: string | null; size?: number }) {
  const Icon = (icon && TOPIC_ICON_BY_VALUE[icon]) || Layers;
  return <Icon size={size} />;
}

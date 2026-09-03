'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

const TABS = [
  { href: '/platform/ai-configuration/ranking-weights', label: 'Ranking Weights' },
  { href: '/platform/ai-configuration/prompts', label: 'Prompts' },
];

/** Separate component so useLinkStatus can run inside the <Link>; see Sidebar. */
function TabBody({ label, isActive }: { label: string; isActive: boolean }) {
  const { pending } = useLinkStatus();
  const highlighted = isActive || pending;

  return (
    <span
      className={`relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        highlighted
          ? 'border-teal-600 text-teal-700'
          : 'border-transparent text-gray-500 group-hover:text-gray-700'
      }`}
    >
      {label}
      <span aria-hidden className={`nav-pending ${pending ? 'is-pending' : ''}`}>
        <LoaderCircle size={12} className="animate-spin" />
      </span>
    </span>
  );
}

export default function AiConfigTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-gray-100">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className="group block"
          >
            <TabBody label={tab.label} isActive={!!isActive} />
          </Link>
        );
      })}
    </div>
  );
}

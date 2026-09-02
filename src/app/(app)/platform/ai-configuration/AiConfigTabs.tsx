'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/platform/ai-configuration/ranking-weights', label: 'Ranking Weights' },
  { href: '/platform/ai-configuration/prompts', label: 'Prompts' },
];

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
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

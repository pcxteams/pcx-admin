import type { ReactNode } from 'react';

/**
 * Building blocks for the route-level `loading.tsx` fallbacks. Every page under
 * (app) is a dynamic route, and Next.js won't prefetch one that has no loading
 * boundary — it blocks the client-side transition until the server responds.
 */

export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

/** Mirrors the `p-8` padding every page under (app) uses. */
export function SkeletonPage({
  children,
  className = 'p-8',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading" className={`skeleton-fade ${className}`}>
      {children}
    </div>
  );
}

export function SkeletonPageHeader({
  actions = 0,
  subtitle = true,
}: {
  actions?: number;
  subtitle?: boolean;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <SkeletonBar className="h-6 w-44" />
        {subtitle && <SkeletonBar className="mt-2.5 h-3.5 w-72" />}
      </div>
      {actions > 0 && (
        <div className="flex items-center gap-3">
          {Array.from({ length: actions }, (_, i) => (
            <SkeletonBar key={i} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Matches users/StatsCards.tsx. */
export function SkeletonStatCards({ count = 2 }: { count?: number }) {
  return (
    <div className={`mb-6 grid gap-4 ${count === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white px-6 py-5">
          <SkeletonBar className="h-3.5 w-20" />
          <SkeletonBar className="mt-2.5 h-8 w-14" />
          <SkeletonBar className="mt-3 h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonFilters() {
  return (
    <div className="mb-4 flex items-center gap-3">
      <SkeletonBar className="h-9 flex-1 rounded-lg" />
      <SkeletonBar className="h-9 w-32 rounded-lg" />
      <SkeletonBar className="h-9 w-32 rounded-lg" />
    </div>
  );
}

export function SkeletonTable({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-6 border-b border-gray-100 px-6 py-3.5">
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonBar key={i} className={i === 0 ? 'h-3 w-36' : 'h-3 flex-1'} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="flex items-center gap-6 border-b border-gray-50 px-6 py-4 last:border-b-0"
        >
          <div className="flex w-36 items-center gap-3">
            <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
            <SkeletonBar className="h-3.5 flex-1" />
          </div>
          {Array.from({ length: columns - 1 }, (_, c) => (
            <SkeletonBar key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ lines = 4, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-6 py-5">
      {title && <SkeletonBar className="mb-5 h-4 w-40" />}
      <div className="space-y-4">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>
            <SkeletonBar className="h-3 w-28" />
            <SkeletonBar className="mt-2 h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

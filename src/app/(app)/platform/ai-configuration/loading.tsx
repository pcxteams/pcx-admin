import { SkeletonPanel } from '@/components/Skeleton';

/**
 * Sits below AI Configuration's own layout so the tab bar stays put while the
 * selected tab loads. The boundary at the (app) root can't cover this: for a
 * navigation between two siblings, the shared layout is the entry point.
 */
export default function Loading() {
  return (
    <div className="skeleton-fade" role="status" aria-label="Loading">
      <SkeletonPanel lines={4} />
    </div>
  );
}

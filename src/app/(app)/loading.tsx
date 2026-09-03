import { SkeletonPage, SkeletonPageHeader, SkeletonPanel } from '@/components/Skeleton';

/**
 * Default boundary for everything under (app) — Home, the [...slug]
 * placeholders, and anything added later. Routes with a distinctive shape
 * override it with their own `loading.tsx`.
 */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader />
      <SkeletonPanel lines={3} />
    </SkeletonPage>
  );
}

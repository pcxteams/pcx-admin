import { SkeletonPage, SkeletonPageHeader, SkeletonPanel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage className="p-8 max-w-3xl mx-auto">
      <SkeletonPageHeader />
      <SkeletonPanel lines={4} />
    </SkeletonPage>
  );
}

import { SkeletonBar, SkeletonPage, SkeletonPageHeader, SkeletonPanel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage className="p-8 max-w-7xl mx-auto">
      <SkeletonBar className="mb-4 h-3 w-36" />
      <SkeletonPageHeader actions={1} />
      <div className="space-y-6">
        <SkeletonPanel lines={2} />
        <SkeletonPanel lines={3} />
      </div>
    </SkeletonPage>
  );
}

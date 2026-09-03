import { SkeletonPage, SkeletonPageHeader, SkeletonPanel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage className="p-8 max-w-5xl mx-auto">
      <SkeletonPageHeader />
      <div className="space-y-6">
        <SkeletonPanel lines={4} />
        <SkeletonPanel lines={3} />
      </div>
    </SkeletonPage>
  );
}

import { SkeletonPage, SkeletonPageHeader, SkeletonPanel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader actions={1} />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={3} />
        </div>
        <SkeletonPanel lines={3} />
      </div>
    </SkeletonPage>
  );
}

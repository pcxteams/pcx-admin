import {
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonPanel,
  SkeletonTable,
} from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader actions={1} />
      <div className="mb-6">
        <SkeletonPanel lines={3} />
      </div>
      <SkeletonTable rows={6} columns={4} />
    </SkeletonPage>
  );
}

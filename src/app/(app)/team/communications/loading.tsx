import { SkeletonPage, SkeletonPageHeader, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader actions={1} />
      <SkeletonTable rows={8} columns={4} />
    </SkeletonPage>
  );
}

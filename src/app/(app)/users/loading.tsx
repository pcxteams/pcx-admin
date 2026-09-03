import {
  SkeletonFilters,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonStatCards,
  SkeletonTable,
} from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader actions={4} />
      <SkeletonStatCards count={2} />
      <SkeletonFilters />
      <SkeletonTable rows={10} columns={5} />
    </SkeletonPage>
  );
}

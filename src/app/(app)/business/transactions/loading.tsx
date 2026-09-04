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
      <SkeletonPageHeader actions={3} />
      <SkeletonStatCards count={4} />
      <SkeletonFilters />
      <SkeletonTable rows={10} columns={7} />
    </SkeletonPage>
  );
}

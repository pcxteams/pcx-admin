import {
  SkeletonFilters,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader />
      <SkeletonFilters />
      <SkeletonTable rows={10} columns={5} />
    </SkeletonPage>
  );
}

import {
  SkeletonBar,
  SkeletonFilters,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage className="p-8 max-w-[1400px] mx-auto">
      <SkeletonBar className="mb-4 h-3 w-36" />
      <SkeletonPageHeader actions={1} />
      <SkeletonFilters />
      <SkeletonTable rows={10} columns={5} />
    </SkeletonPage>
  );
}

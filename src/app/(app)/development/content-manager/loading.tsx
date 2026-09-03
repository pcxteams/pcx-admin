import { SkeletonBar, SkeletonPage, SkeletonPageHeader } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage className="p-8 max-w-3xl mx-auto">
      <SkeletonPageHeader />
      <div className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <SkeletonBar className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="flex-1">
              <SkeletonBar className="h-3.5 w-48" />
              <SkeletonBar className="mt-2 h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}

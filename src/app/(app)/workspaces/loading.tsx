import { SkeletonBar, SkeletonPage, SkeletonPageHeader } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader subtitle={false} actions={1} />
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4"
          >
            <SkeletonBar className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="flex-1">
              <SkeletonBar className="h-3.5 w-56" />
              <SkeletonBar className="mt-2 h-3 w-32" />
            </div>
            <SkeletonBar className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { ContentListResponse } from '@/lib/content';
import ContentManagerView from './ContentManagerView';

export default async function ContentManagerPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { workspaceId } = await params;
  // Initial page-1 load with the default sort (Recently Updated). Client-side
  // interactions refetch with filters/search/sort/pagination applied.
  const data = await apiGet<ContentListResponse>(
    `/workspaces/${workspaceId}/content?sort=recently_updated&page=1&pageSize=25`,
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <Link
        href="/workspaces"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4"
      >
        <ArrowLeft size={13} />
        Back to workspaces
      </Link>

      {!data ? (
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">
            This content library couldn&apos;t be loaded — it may not exist, or you may not have
            access to this workspace.
          </p>
        </div>
      ) : (
        <ContentManagerView workspaceId={workspaceId} initialData={data} />
      )}
    </div>
  );
}

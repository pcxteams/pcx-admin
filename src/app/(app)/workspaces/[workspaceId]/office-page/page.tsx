import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, PencilLine } from 'lucide-react';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { OfficePagePublishedResponse } from '@/lib/office-page-content';
import OfficePageView from './OfficePageView';

function StatusBadge({ status }: { status: OfficePagePublishedResponse['pageStatus'] }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500',
    published: 'bg-green-50 text-green-600',
    archived: 'bg-red-50 text-red-500',
  };
  const label = status ?? 'draft';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        map[label] ?? map.draft
      }`}
    >
      {label}
    </span>
  );
}

export default async function OfficePagePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { workspaceId } = await params;
  // The read/"Agent Office" surface must only ever show published content — the
  // published endpoint returns null content until the page is published, never
  // the in-progress draft (that lives behind the builder, gated on canEdit).
  const data = await apiGet<OfficePagePublishedResponse>(
    `/workspaces/${workspaceId}/office-page/published`,
  );

  return (
    <div className="p-8 max-w-6xl">
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
            This office page couldn&apos;t be loaded — it may not exist, or you may not have access
            to this workspace.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Agent Office</h1>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={data.pageStatus} />
                {!data.access.canEdit && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Lock size={11} />
                    View only
                  </span>
                )}
              </div>
            </div>
            {data.access.canEdit && (
              <Link
                href={`/workspaces/${workspaceId}/office-page/builder`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors"
              >
                <PencilLine size={13} />
                Edit page
              </Link>
            )}
          </div>

          {data.content ? (
            <OfficePageView content={data.content} />
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
              <p className="text-sm text-gray-500">
                This office page hasn&apos;t been published yet.
                {data.access.canEdit
                  ? ' Open the builder to make changes and publish it.'
                  : ' Check back once a manager publishes it.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

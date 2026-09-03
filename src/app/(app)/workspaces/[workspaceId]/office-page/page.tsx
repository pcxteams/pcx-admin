import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Lock, PencilLine } from 'lucide-react';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { OfficePagePublishedResponse } from '@/lib/office-page-content';
import OfficePageView, { type AgentOfficeVendor } from './OfficePageView';

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
  const { workspaceId } = await params;
  // The read/"Agent Office" surface must only ever show published content — the
  // published endpoint returns null content until the page is published, never
  // the in-progress draft (that lives behind the builder, gated on canEdit).
  const [session, data, vendorData] = await Promise.all([
    getSession(),
    apiGet<OfficePagePublishedResponse>(`/workspaces/${workspaceId}/office-page/published`),
    // Live, DB-backed Vendors (KAN-99) — resolved server-side for Free Team
    // inheritance, independent of whether the page itself has been published.
    apiGet<{ vendors: AgentOfficeVendor[] }>(`/workspaces/${workspaceId}/vendors/active`),
  ]);
  if (!session) redirect('/login');
  const activeVendors = vendorData?.vendors ?? [];

  // A Free Team's Agent Office is inherited from, and editable only through, its
  // Parent Office. Treat it as read-only here for everyone (platform admins
  // included) so the edit affordance never contradicts the read-only banner;
  // the write is refused by the API regardless.
  const isInherited = !!data && data.owningWorkspaceId !== data.workspaceId;
  const canEditHere = !!data && data.access.canEdit && !isInherited;

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
                {!canEditHere && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Lock size={11} />
                    View only
                  </span>
                )}
              </div>
            </div>
            {canEditHere && (
              <Link
                href={`/workspaces/${workspaceId}/office-page/builder`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors"
              >
                <PencilLine size={13} />
                Edit page
              </Link>
            )}
          </div>

          {/* Inherited content: for a Free Team the owning workspace is its
              Parent Office and differs from the one being viewed. */}
          {isInherited && (
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3.5 mb-8">
              <Building2 size={16} aria-hidden className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                This Agent Office content is provided by{' '}
                <span className="font-medium">
                  {data.owningWorkspaceName ?? 'your Parent Office'}
                </span>{' '}
                and is read-only. You can view and search it, but its content is
                managed by the Parent Office.
              </p>
            </div>
          )}

          {data.content || activeVendors.length > 0 ? (
            // Vendors publish immediately on form submission (KAN-99), independent
            // of the builder's own publish step — shown even if the rest of the
            // office page content hasn't been published yet.
            <OfficePageView content={data.content ?? { sections: [] }} activeVendors={activeVendors} />
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
              <p className="text-sm text-gray-500">
                This office page hasn&apos;t been published yet.
                {canEditHere
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

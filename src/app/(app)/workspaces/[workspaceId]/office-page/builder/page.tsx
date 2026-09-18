import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { OfficePageBuilderResponse } from '@/lib/office-page-content';
import type { AgentOfficeVendor } from '../OfficePageView';
import OfficePageBuilder from './OfficePageBuilder';

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const [session, data, vendorData] = await Promise.all([
    getSession(),
    apiGet<OfficePageBuilderResponse>(`/workspaces/${workspaceId}/office-page`),
    // Vendors publish on approval, not through this page's publish step, so the
    // canvas has to fetch them too.
    apiGet<{ vendors: AgentOfficeVendor[] }>(`/workspaces/${workspaceId}/vendors/active`),
  ]);
  if (!session) redirect('/login');

  // Fall back to the read view when there's no access, when the page is
  // view-only, or when the content is inherited from a Parent Office (a Free
  // Team). Inherited content is editable only through the Parent Office, so no
  // role opens the builder here, keeping the UI consistent with the API.
  if (
    !data ||
    !data.access.canEdit ||
    data.owningWorkspaceId !== data.workspaceId
  ) {
    redirect(`/workspaces/${workspaceId}/office-page`);
  }

  return (
    <OfficePageBuilder
      workspaceId={workspaceId}
      initialContent={data.content}
      pageStatus={data.pageStatus}
      brokerage={data.brokerage}
      directory={data.directory ?? {}}
      roster={data.roster ?? []}
      activeVendors={vendorData?.vendors ?? []}
    />
  );
}

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { OfficePageBuilderResponse } from '@/lib/office-page-content';
import OfficePageBuilder from './OfficePageBuilder';

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { workspaceId } = await params;
  const data = await apiGet<OfficePageBuilderResponse>(
    `/workspaces/${workspaceId}/office-page`,
  );

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
    />
  );
}

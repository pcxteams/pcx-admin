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

  // No data (no access / not found) or view-only → fall back to the read view.
  if (!data || !data.access.canEdit) {
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

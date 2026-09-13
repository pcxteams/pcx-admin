import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TopicsListView from '@/components/career-builder/TopicsListView';

export default async function WorkspaceCareerBuilderPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <TopicsListView
      scope={{ kind: 'workspace', workspaceId }}
      basePath={`/workspaces/${workspaceId}/career-builder`}
    />
  );
}

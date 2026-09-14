import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TopicDetailView from '@/components/career-builder/TopicDetailView';

export default async function WorkspaceTopicDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; topicId: string }>;
}) {
  const { workspaceId, topicId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <TopicDetailView
      scope={{ kind: 'workspace', workspaceId }}
      topicId={topicId}
      backHref={`/workspaces/${workspaceId}/career-builder`}
      backLabel="Career Builder"
    />
  );
}

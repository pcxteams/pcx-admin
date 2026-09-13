import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TopicDetailView from '@/components/career-builder/TopicDetailView';

export default async function PlatformTopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.role !== 'master') redirect('/');

  return (
    <TopicDetailView
      scope={{ kind: 'master' }}
      topicId={topicId}
      backHref="/platform/content"
      backLabel="Content Library"
    />
  );
}

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TopicsListView from '@/components/career-builder/TopicsListView';

/**
 * PCx Platform > Content Library — master content, authored through the
 * same Topic -> Section -> Step hierarchy as workspace Career Builder
 * (product decision 2026-09-13: master content moves off the flat
 * create-and-link-to-workspaces model). Master-only (not opened to plain
 * "admin"), same gating tier as the Workspaces admin surface. See
 * POST /master/topics and POST /master/content on the API side.
 */
export default async function PlatformContentPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.role !== 'master') redirect('/');

  return <TopicsListView scope={{ kind: 'master' }} basePath="/platform/content" />;
}

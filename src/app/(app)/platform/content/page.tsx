import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import MasterContentView from './MasterContentView';

interface ActiveWorkspace {
  id: string;
  name: string;
  type: 'office' | 'team';
}
interface WorkspacesData {
  active: ActiveWorkspace[];
}

/**
 * PCx Platform > Content Library — master content that targets a single
 * workspace, a specific subset, or all workspaces (present and future).
 * Master-only (not opened to plain "admin"), same gating tier as the
 * Workspaces admin surface — broadcasting content everywhere is treated as
 * sensitive as workspace management itself. See POST /master/content and
 * CreateMasterContentDto on the API side.
 */
export default async function PlatformContentPage() {
  const [session, data] = await Promise.all([
    getSession(),
    apiGet<WorkspacesData>('/workspaces'),
  ]);
  if (!session) redirect('/login');
  if (session.user.role !== 'master') redirect('/');

  return <MasterContentView workspaces={data?.active ?? []} />;
}

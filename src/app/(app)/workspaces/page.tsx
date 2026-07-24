import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@/lib/session';
import AddWorkspaceButton from './AddWorkspaceButton';
import WorkspacesList from './WorkspacesList';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

async function fetchWorkspaces(cookie: string) {
  try {
    const res = await fetch(`${API_URL}/workspaces`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!res.ok) return { total: 0, pending: [], active: [] };
    return res.json();
  } catch {
    return { total: 0, pending: [], active: [] };
  }
}

export default async function WorkspacesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isMaster = session.user.role === 'master';
  const cookie = (await headers()).get('cookie') ?? '';
  const data = isMaster ? await fetchWorkspaces(cookie) : { total: 0, pending: [], active: [] };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Workspaces</h1>
        {isMaster && <AddWorkspaceButton />}
      </div>
      {isMaster ? (
        <WorkspacesList data={data} />
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">You don&apos;t have access to workspace management.</p>
        </div>
      )}
    </div>
  );
}

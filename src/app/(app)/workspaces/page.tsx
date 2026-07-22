import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import AddWorkspaceButton from './AddWorkspaceButton';

export default async function WorkspacesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isMaster = session.user.role === 'master';

  return (
    <div className="relative flex items-center justify-center h-full min-h-screen">
      {isMaster && (
        <div className="absolute top-8 right-8">
          <AddWorkspaceButton />
        </div>
      )}
      <h1 className="text-2xl font-semibold text-gray-500">Workspaces</h1>
    </div>
  );
}

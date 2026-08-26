import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import AddUserForm from './AddUserForm';

export default async function AddUserPage({
  searchParams,
}: {
  // KAN-115: the Team Profile page's "Add Member" button links here with
  // the Team's Workspace + Team preselected.
  searchParams: Promise<{
    workspaceId?: string;
    workspaceLabel?: string;
    teamId?: string;
    teamLabel?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Same access gate as the Users list page — this form's pickers call the
  // same read-only endpoints, so anyone without directory access shouldn't
  // see the form either.
  const stats = await apiGet('/users/stats');
  if (stats === null) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">You don&apos;t have access to the Users directory.</p>
        </div>
      </div>
    );
  }

  const { workspaceId, workspaceLabel, teamId, teamLabel } = await searchParams;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <AddUserForm
        initialWorkspaceId={workspaceId}
        initialWorkspaceLabel={workspaceLabel}
        initialTeamId={teamId}
        initialTeamLabel={teamLabel}
      />
    </div>
  );
}

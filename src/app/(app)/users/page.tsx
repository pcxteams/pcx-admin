import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import UsersPageHeader from './UsersPageHeader';
import StatsCards, { type UsersStats } from './StatsCards';
import UsersList, { type UsersListResponse } from './UsersList';

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // apiGet returns null on any non-OK response, including the 403 an Agent
  // (or a user with no active workspace membership) gets from the API —
  // access is enforced there, not by a hardcoded role check here, since
  // Master, PCx Admin, Workspace Manager, and Workspace Leader all have
  // access (scoped differently), unlike the Workspaces page which is
  // Master-only.
  const [stats, initialList] = await Promise.all([
    apiGet<UsersStats>('/users/stats'),
    apiGet<UsersListResponse>('/users?page=1&perPage=10'),
  ]);

  const hasAccess = stats !== null && initialList !== null;

  return (
    <div className="p-8">
      <UsersPageHeader />
      {hasAccess ? (
        <>
          <StatsCards stats={stats} />
          <UsersList initialData={initialList} />
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">You don&apos;t have access to the Users directory.</p>
        </div>
      )}
    </div>
  );
}

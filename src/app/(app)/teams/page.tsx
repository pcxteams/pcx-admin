import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import TeamsPageHeader from './TeamsPageHeader';
import { type TeamsListResponse } from './TeamsList';
import TeamsPageClient from './TeamsPageClient';

export default async function TeamsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // apiGet returns null on any non-OK response, including the 403 an Agent
  // (or a user with no active workspace membership) gets from the API —
  // access is enforced there, not by a hardcoded role check here, since
  // Master, PCx Admin, Workspace Manager, and Workspace Leader all have
  // access (scoped differently). Mirrors the Users page's own pattern.
  const initialList = await apiGet<TeamsListResponse>('/teams?page=1&perPage=10');

  return (
    <div className="p-8">
      {initialList ? (
        <TeamsPageClient initialList={initialList} />
      ) : (
        <>
          <TeamsPageHeader total={0} />
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-sm">You don&apos;t have access to the Teams directory.</p>
          </div>
        </>
      )}
    </div>
  );
}

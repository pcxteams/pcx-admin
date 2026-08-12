'use client';

import { useEffect, useState } from 'react';
import UsersPageHeader from './UsersPageHeader';
import StatsCards, { type UsersStats } from './StatsCards';
import UsersList, { type UsersListResponse } from './UsersList';
import { fetchMyWorkspaceScope } from '@/lib/workspaces';

interface Props {
  stats: UsersStats;
  initialList: UsersListResponse;
}

/**
 * Owns the Workspace filter (lifted out of UsersList) so the header's "Add
 * Team" link can default to whichever workspace is currently selected there
 * — KAN-97, confirmed: for a Master/PCx Admin (no fixed home Office), the
 * Free Team's Parent Office defaults to the Users page's own workspace
 * filter rather than a second, independent picker. A scoped Manager/Leader
 * doesn't need this at all — the Add Team page resolves their own Office
 * directly, the same way Add User already does.
 */
export default function UsersPageClient({ stats, initialList }: Props) {
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLabel, setWorkspaceLabel] = useState('');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    fetchMyWorkspaceScope().then((scope) => {
      setIsPlatformAdmin(scope.mode === 'all');
    });
  }, []);

  const addTeamHref =
    isPlatformAdmin && workspaceId
      ? `/users/add-team?officeWorkspaceId=${encodeURIComponent(workspaceId)}&officeWorkspaceLabel=${encodeURIComponent(workspaceLabel)}`
      : '/users/add-team';

  return (
    <>
      <UsersPageHeader addTeamHref={addTeamHref} />
      <StatsCards stats={stats} />
      <UsersList
        initialData={initialList}
        workspaceId={workspaceId}
        workspaceLabel={workspaceLabel}
        onWorkspaceChange={(id, label) => {
          setWorkspaceId(id);
          setWorkspaceLabel(label);
        }}
      />
    </>
  );
}

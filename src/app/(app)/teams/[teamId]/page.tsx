import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import TeamDetailView from './TeamDetailView';

export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'invited' | 'suspended';
  leaderName: string | null;
}

export interface TeamDetail {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  phone: string | null;
  parentOffice: { id: string; name: string | null } | null;
  teamLeader: { userId: string; name: string; email: string } | null;
  plan: string | null;
  billingStatus: string | null;
  seatLimit: number | null;
  activeAgentCount: number;
  canEdit: boolean;
  members: TeamMemberRow[];
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const [session, data] = await Promise.all([
    getSession(),
    apiGet<TeamDetail>(`/teams/${teamId}`),
  ]);
  if (!session) redirect('/login');

  // apiGet returns null for any non-OK response (403 out-of-scope, 404
  // unknown id, network error alike) — same "friendly empty state, not a
  // hard 404" convention users/add/page.tsx uses for a caller with no
  // Users-directory access, since this page's access boundary (KAN-115:
  // Admin any Team, Manager in scope, Leader of the Team, never an Agent)
  // is enforced server-side and isn't something the client can pre-check.
  if (data === null) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">You don&apos;t have access to this Team.</p>
        </div>
      </div>
    );
  }

  return <TeamDetailView data={data} />;
}

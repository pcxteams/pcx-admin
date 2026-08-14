import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { ProfileLeader } from '@/components/LeadershipTeamEditor';
import type { ProfileVendor } from '@/components/VendorsSection';
import WorkspaceProfileView from './WorkspaceProfileView';

export interface WorkspaceProfileData {
  id: string;
  name: string;
  type: 'office' | 'team';
  status: string;
  clientFacingName: string | null;
  timeZone: string | null;
  brandingConfig: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    address?: string;
    website?: string;
  } | null;
  settingsConfig: Record<string, unknown> | null;
  reportsTo: { id: string; name: string; type: 'office' | 'team' } | null;
  maxUsers: number | null;
  setupCompleted: boolean;
  customizationCompleted: boolean;
  leadership: ProfileLeader[];
  access: {
    canView: boolean;
    canManage: boolean;
    membershipRole: 'manager' | 'leader' | 'agent' | null;
    visibilityScope: 'workspace' | 'assigned_agents' | null;
  };
}

/**
 * Workspace-facing Workspace Profile (Manager/Leader). Reads the caller's own
 * workspace via `/workspaces/me`, which resolves their home workspace and
 * returns the same underlying record the PCx Admin profile shows — plus the
 * caller's resolved capabilities, so editing is permission-gated.
 */
export default async function WorkspaceProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const data = await apiGet<WorkspaceProfileData>('/workspaces/me');

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm px-6">
          <h1 className="text-lg font-semibold text-gray-700">No workspace assigned</h1>
          <p className="text-sm text-gray-400 mt-2">
            Your account isn&apos;t linked to a workspace yet. Contact your administrator if you
            believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Vendor invitation is scoped to Office Workspaces (KAN-99) — Team workspaces
  // don't get their own invite flow, so skip the fetch entirely.
  const vendorData =
    data.type === 'office'
      ? await apiGet<{ vendors: ProfileVendor[] }>(`/workspaces/${data.id}/vendors`)
      : null;

  return <WorkspaceProfileView data={data} vendors={vendorData?.vendors ?? []} />;
}

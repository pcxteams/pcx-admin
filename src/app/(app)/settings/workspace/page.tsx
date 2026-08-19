import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import WorkspaceSettingsView from './WorkspaceSettingsView';

export interface WorkspaceSettingsLeader {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  role: 'manager' | 'leader';
  isActive: boolean;
  lastActive: string | null;
}

export interface WorkspaceSettingsProfile {
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
  settingsConfig: {
    mls_website?: string;
    board_of_realtors_website?: string;
    training_calendar_url?: string;
    office_crm_url?: string;
    additional_links?: { label: string; url: string }[];
    videos?: { title: string; source: string; url: string }[];
    resources?: { name: string; type: string; url: string; video_url?: string }[];
  } | null;
  createdAt: string;
  updatedAt: string;
  reportsTo: { id: string; name: string; type: 'office' | 'team' } | null;
  leadership: WorkspaceSettingsLeader[];
  access: {
    canView: boolean;
    canManage: boolean;
  };
}

/**
 * Self-service Workspace Settings, reached after login (as opposed to the
 * master-only /workspaces/[workspaceId] admin view). Resolves the caller's
 * own workspace via GET /workspaces/me; renders an empty state for platform
 * accounts with no home workspace rather than redirecting.
 */
export default async function WorkspaceSettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const profile = await apiGet<WorkspaceSettingsProfile>('/workspaces/me');

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-16 text-center">
        <p className="text-lg font-semibold text-gray-900 mb-2">No workspace found</p>
        <p className="text-sm text-gray-500">
          Your account isn&apos;t associated with a workspace yet. Contact your PCx administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return <WorkspaceSettingsView data={profile} />;
}

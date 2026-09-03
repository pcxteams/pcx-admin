import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { ProfileLeader } from '@/components/LeadershipTeamEditor';
import type { ProfileVendor } from '@/components/VendorsSection';
import WorkspaceSettingsView from './WorkspaceSettingsView';

export interface WorkspaceTeamRow {
  id: string;
  name: string;
  contactName: string | null;
  teamLeaderName: string | null;
  plan: string | null;
  planTier: 'free' | 'paid';
  assignedAgents: number;
  activeAgentCount: number;
  lastActive: string | null;
  status: string;
}

export interface WorkspaceEmailSettings {
  senderDisplayName: string | null;
  replyToEmail: string | null;
  effectiveSenderDisplayName: string;
  effectiveReplyToEmail: string;
  /** Platform From address — read-only. */
  fromEmail: string;
  platformSenderDisplayName: string;
  platformReplyToEmail: string | null;
}

export interface WorkspaceAuditSummary {
  createdBy: string | null;
  createdAt: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
  entryCount: number;
}

export interface WorkspaceSettingsProfile {
  id: string;
  name: string;
  type: 'office' | 'team';
  status: string;
  clientFacingName: string | null;
  timeZone: string | null;
  maxUsers: number | null;
  subscriptionPlan: string | null;
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
    google_drive_url?: string;
    office_crm_url?: string;
    additional_links?: { label: string; url: string }[];
    videos?: { title: string; source: string; url: string }[];
    resources?: { name: string; type: string; url: string; video_url?: string }[];
  } | null;
  email: WorkspaceEmailSettings;
  audit: WorkspaceAuditSummary;
  createdAt: string;
  updatedAt: string;
  reportsTo: { id: string; name: string; type: 'office' | 'team' } | null;
  leadership: ProfileLeader[];
  workspaceTeams: WorkspaceTeamRow[];
  setupCompleted: boolean;
  customizationCompleted: boolean;
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

  // Vendor invitation is scoped to Office Workspaces (KAN-99) — Team workspaces
  // don't get their own invite flow, so skip the fetch entirely.
  const vendorData =
    profile.type === 'office'
      ? await apiGet<{ vendors: ProfileVendor[] }>(`/workspaces/${profile.id}/vendors`)
      : null;

  return <WorkspaceSettingsView data={profile} vendors={vendorData?.vendors ?? []} />;
}

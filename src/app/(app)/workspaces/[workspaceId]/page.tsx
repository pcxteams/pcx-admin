import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { ProfileVendor } from '@/components/VendorsSection';
import WorkspaceDetailView from './WorkspaceDetailView';

export interface WorkspaceTeamRow {
  id: string;
  name: string;
  contactName: string | null;
  assignedAgents: number;
  lastActive: string | null;
  status: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  clientFacingName: string | null;
  type: 'office' | 'team';
  status: string;
  timeZone: string | null;
  memberCount: number;
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
  } | null;
  createdAt: string;
  updatedAt: string;
  setupCompleted: boolean;
  customizationCompleted: boolean;
  reportsTo: { id: string; name: string; type: 'office' | 'team' } | null;
  primaryContact: { name: string; email: string };
  billing: {
    subscriptionPlan: string | null;
    subscriptionAmount: number;
    seatLimit: number | null;
    billingStatus: string | null;
  };
  leaders: {
    membershipId: string;
    userId: string;
    name: string;
    email: string;
    role: 'manager' | 'leader';
    phone: string | null;
    jobTitle: string | null;
    canEditSettings: boolean;
    visibilityScope: 'workspace' | 'assigned_agents';
    showProfile: boolean;
    isActive: boolean;
    lastActive: string;
  }[];
  workspaceTeams: WorkspaceTeamRow[];
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  // The API enforces the same master-only boundary, so a non-master's request
  // comes back 403 (null) and they are redirected below regardless.
  const [session, data] = await Promise.all([
    getSession(),
    apiGet<WorkspaceDetail>(`/workspaces/${workspaceId}`),
  ]);
  if (!session) redirect('/login');
  if (session.user.role !== 'master') redirect('/workspaces');
  if (!data) notFound();

  // Vendor invitation is scoped to Office Workspaces (KAN-99) — Team workspaces
  // don't get their own invite flow, so skip the fetch entirely.
  const vendorData =
    data.type === 'office'
      ? await apiGet<{ vendors: ProfileVendor[] }>(`/workspaces/${workspaceId}/vendors`)
      : null;

  return <WorkspaceDetailView data={data} vendors={vendorData?.vendors ?? []} />;
}

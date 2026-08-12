import type { AsyncOption } from '@/components/AsyncSearchableSelect';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UsersListResponse {
  items: UserRow[];
}

const ROLE_LABELS: Record<string, string> = {
  leader: 'Leader',
  manager: 'Manager',
};

async function fetchUsersByRole(workspaceId: string, role: string, query: string): Promise<UserRow[]> {
  const params = new URLSearchParams({ workspaceId, role, perPage: '50' });
  if (query.trim()) params.set('search', query.trim());
  try {
    const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = (await res.json()) as UsersListResponse;
    return data.items;
  } catch {
    return [];
  }
}

/**
 * Leaders/managers eligible to be assigned as an agent's leader, scoped to a
 * workspace (the selected Team if one is chosen, else the Office). Per
 * KAN-96, "eligible Leaders" includes both the Leader and Manager roles,
 * since a Manager can also coach agents directly.
 */
export async function fetchLeaderOptions(workspaceId: string, query: string): Promise<AsyncOption[]> {
  if (!workspaceId) return [];
  const [leaders, managers] = await Promise.all([
    fetchUsersByRole(workspaceId, 'leader', query),
    fetchUsersByRole(workspaceId, 'manager', query),
  ]);
  return [...leaders, ...managers].map((u) => ({
    id: u.id,
    label: `${u.name} (${ROLE_LABELS[u.role] ?? u.role})`,
  }));
}

export type CreateUserRole = 'agent' | 'manager' | 'leader';
export type VisibilityScopeInput = 'workspace' | 'assigned_agents';
export type ProductionLevelInput = 'no_production' | 'some_production' | 'consistent_producer';

export interface CreateInvitedUserPayload {
  role: CreateUserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  primaryWorkspaceId: string;
  teamId?: string;
  primaryLeaderId?: string;
  additionalLeaderIds?: string[];
  productionLevel?: ProductionLevelInput;
  visibilityScope?: VisibilityScopeInput;
  sendWelcomeEmail?: boolean;
  sendPasswordSetupEmail?: boolean;
}

export async function createInvitedUser(
  payload: CreateInvitedUserPayload,
): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: body.message ?? 'Something went wrong. Please try again.' };
    }
    const data = (await res.json()) as { userId: string };
    return { ok: true, userId: data.userId };
  } catch {
    return { ok: false, message: 'Network error. Please check your connection and try again.' };
  }
}

/**
 * Removes the membership tying this person to `workspaceId` — someone with
 * memberships in more than one workspace keeps the rest and their account.
 * `workspaceId` is omitted only for a platform admin/master with no
 * membership row at all, in which case the whole account is deleted.
 */
export async function deleteUser(
  id: string,
  workspaceId?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const url = workspaceId
      ? `/api/users/${id}?workspaceId=${encodeURIComponent(workspaceId)}`
      : `/api/users/${id}`;
    const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: body.message ?? 'Something went wrong. Please try again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Network error. Please check your connection and try again.' };
  }
}

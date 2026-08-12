import type { AsyncOption } from '@/components/AsyncSearchableSelect';

export interface WorkspaceOption extends AsyncOption {
  type: 'office' | 'team';
}

/** Typeahead search across office + team workspaces, scoped server-side to the caller. */
export async function fetchWorkspaceOptions(query: string, limit = 20): Promise<WorkspaceOption[]> {
  try {
    const res = await fetch(`/api/workspaces/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { id: string; name: string; type: 'office' | 'team' }[];
    return data.map((w) => ({ id: w.id, label: w.name, type: w.type }));
  } catch {
    return [];
  }
}

/**
 * Active Teams reporting to a given Office — KAN-96's Agent "Team" field.
 * Server-side restricts this to status='active' whenever type=team is
 * requested, so no separate status filter is needed here.
 */
export async function fetchTeamOptions(
  officeWorkspaceId: string,
  query: string,
  limit = 20,
): Promise<AsyncOption[]> {
  if (!officeWorkspaceId) return [];
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      type: 'team',
      parentWorkspaceId: officeWorkspaceId,
    });
    const res = await fetch(`/api/workspaces/search?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = (await res.json()) as { id: string; name: string; type: string }[];
    return data.map((w) => ({ id: w.id, label: w.name }));
  } catch {
    return [];
  }
}

/**
 * Active Office workspaces — KAN-97's Add Team "Parent Office" resolution
 * for a Master/PCx Admin caller (a scoped Manager/Leader never needs this;
 * their own Office is resolved from my-scope instead).
 */
export async function fetchOfficeOptions(query: string, limit = 20): Promise<AsyncOption[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit), type: 'office' });
    const res = await fetch(`/api/workspaces/search?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = (await res.json()) as { id: string; name: string; type: string }[];
    return data.map((w) => ({ id: w.id, label: w.name }));
  } catch {
    return [];
  }
}

export type MyWorkspaceScope =
  | { mode: 'all' }
  | { mode: 'workspaces'; workspaces: { id: string; name: string; type: 'office' | 'team' }[] }
  | { mode: 'none' };

/**
 * Tells the Add User form whether to show, hide, or autofill the Primary
 * Workspace field (KAN-96): PCx Admin/Master always get the full picker; a
 * single-workspace manager/leader gets none (that workspace is autofilled);
 * a multi-workspace manager/leader gets a picker scoped to just theirs.
 */
export async function fetchMyWorkspaceScope(): Promise<MyWorkspaceScope> {
  try {
    const res = await fetch('/api/workspaces/my-scope', { credentials: 'include' });
    if (!res.ok) return { mode: 'none' };
    return (await res.json()) as MyWorkspaceScope;
  } catch {
    return { mode: 'none' };
  }
}

export interface CreateFreeTeamPayload {
  teamName: string;
  teamLeaderId: string;
  officeWorkspaceId: string;
}

/** KAN-97: self-service Free Team creation from the Users page. */
export async function createFreeTeam(
  payload: CreateFreeTeamPayload,
): Promise<{ ok: true; workspaceId: string } | { ok: false; message: string }> {
  try {
    const res = await fetch('/api/workspaces/free-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: body.message ?? 'Something went wrong. Please try again.' };
    }
    const data = (await res.json()) as { workspaceId: string };
    return { ok: true, workspaceId: data.workspaceId };
  } catch {
    return { ok: false, message: 'Network error. Please check your connection and try again.' };
  }
}

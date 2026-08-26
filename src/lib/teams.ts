export interface UpdateTeamPayload {
  name?: string;
  teamLeaderId?: string;
}

/** KAN-115: Team Profile "Team Details" edit (name + Team Leader only). */
export async function updateTeam(
  id: string,
  payload: UpdateTeamPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: body.message ?? 'Something went wrong. Please try again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Network error. Please check your connection and try again.' };
  }
}

import { apiGet } from '@/lib/api';
import { getSession } from '@/lib/session';
import CommunicationsPage from './CommunicationsPage';
import type { EmailSendSummary } from './types';

/** The slice of GET /workspaces/me the templates section needs. */
interface HomeWorkspace {
  id: string;
  name: string;
  access: {
    /** Platform role (master / admin / user), null for a pure member. */
    platformRole: string | null;
    membershipRole: 'manager' | 'leader' | 'agent' | null;
  };
}

// The (app) layout already enforces a valid session and redirects to /login,
// so by the time this renders the caller is authenticated.
export default async function Page() {
  const [data, session, homeWorkspace] = await Promise.all([
    apiGet<EmailSendSummary[]>('/communications/emails'),
    getSession(),
    // Null for a platform account with no seat, which is what the picker is for.
    apiGet<HomeWorkspace>('/workspaces/me'),
  ]);
  // apiGet returns null on any error; a healthy endpoint returns the array.
  // Guard against an unexpected non-array 200 body so the page can't crash
  // in CommunicationsPage's .map — fall back to the empty state instead.
  const sends = Array.isArray(data) ? data : [];
  const role = session?.user.role ?? null;
  const isPlatformAdmin = role === 'master' || role === 'admin';
  // Decided here, not from the API's 403, so the section never renders for a
  // Leader and then disappears. The API enforces the same rule per request.
  const canManageTemplates =
    isPlatformAdmin || homeWorkspace?.access?.membershipRole === 'manager';

  return (
    <CommunicationsPage
      initialSends={sends}
      defaultWorkspaceId={homeWorkspace?.id ?? null}
      defaultWorkspaceName={homeWorkspace?.name ?? null}
      isPlatformAdmin={isPlatformAdmin}
      canManageTemplates={canManageTemplates}
    />
  );
}

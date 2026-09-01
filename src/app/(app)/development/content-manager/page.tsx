import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, FolderOpen, ChevronRight } from 'lucide-react';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';

interface ActiveWorkspace {
  id: string;
  name: string;
  type: 'office' | 'team';
  memberCount: number;
}
interface WorkspacesData {
  active: ActiveWorkspace[];
}

interface MyWorkspaceProfile {
  id: string;
}

/**
 * The sidebar "Content Manager" item is a global entry point, but content is
 * workspace-scoped (KAN-90). Master/admin manage many workspaces, so they get
 * a picker (GET /workspaces, platform-admin-only by design). A Manager/Leader
 * only ever has one workspace, so they're resolved straight into it via
 * GET /workspaces/me instead — that endpoint didn't exist yet when this page
 * was first written; calling the master-only list for every caller regardless
 * of role was the bug (a Manager/Leader always saw an empty picker pointing at
 * a Workspaces page they also can't access).
 */
export default async function ContentManagerPickerPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isPlatformAdmin = session.user.role === 'master' || session.user.role === 'admin';

  if (!isPlatformAdmin) {
    const myWorkspace = await apiGet<MyWorkspaceProfile | null>('/workspaces/me');
    if (myWorkspace?.id) {
      redirect(`/workspaces/${myWorkspace.id}/content-manager`);
    }

    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
          <FolderOpen size={22} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No workspace found for your account. Contact your administrator if you believe this
            is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const data = await apiGet<WorkspacesData>('/workspaces');
  const workspaces = data?.active ?? [];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Content Manager</h1>
        <p className="text-sm text-gray-400 mt-1">
          Choose a workspace to manage its reusable learning content.
        </p>
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
          <FolderOpen size={22} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No workspaces available. Open a workspace from the{' '}
            <Link href="/workspaces" className="text-teal-600 hover:text-teal-700 font-medium">
              Workspaces
            </Link>{' '}
            page to manage its content.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {workspaces.map((w) => {
            const Icon = w.type === 'office' ? Building2 : Users;
            return (
              <Link
                key={w.id}
                href={`/workspaces/${w.id}/content-manager`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                  <Icon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{w.name}</p>
                  <p className="text-xs text-gray-400">
                    {w.type === 'office' ? 'Office' : 'Team'} · {w.memberCount} member
                    {w.memberCount === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

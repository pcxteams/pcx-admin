import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Trophy, ChevronRight } from 'lucide-react';
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
 * The sidebar "Career Builder" item is a global entry point, but topics are
 * workspace-scoped — same picker pattern as
 * (app)/development/content-manager/page.tsx (KAN-90). Master/admin get a
 * workspace picker; a Manager/Leader only ever has one workspace and is
 * resolved straight into it via GET /workspaces/me.
 */
export default async function CareerBuilderPickerPage() {
  const [session, myWorkspace, data] = await Promise.all([
    getSession(),
    apiGet<MyWorkspaceProfile | null>('/workspaces/me'),
    apiGet<WorkspacesData>('/workspaces'),
  ]);
  if (!session) redirect('/login');

  const isPlatformAdmin = session.user.role === 'master' || session.user.role === 'admin';

  if (!isPlatformAdmin) {
    if (myWorkspace?.id) {
      redirect(`/workspaces/${myWorkspace.id}/career-builder`);
    }

    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
          <Trophy size={22} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No workspace found for your account. Contact your administrator if you believe this
            is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const workspaces = data?.active ?? [];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Career Builder</h1>
        <p className="text-sm text-gray-400 mt-1">
          Choose a workspace to build its skills, content, and certifications.
        </p>
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
          <Trophy size={22} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No workspaces available. Open a workspace from the{' '}
            <Link href="/workspaces" className="text-teal-600 hover:text-teal-700 font-medium">
              Workspaces
            </Link>{' '}
            page to build its Career Builder.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {workspaces.map((w) => {
            const Icon = w.type === 'office' ? Building2 : Users;
            return (
              <Link
                key={w.id}
                href={`/workspaces/${w.id}/career-builder`}
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

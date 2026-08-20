import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';

interface MyWorkspaceProfile {
  access: {
    membershipRole: 'manager' | 'leader' | 'agent' | null;
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Safety net: if the catch-all route group captured a public /setup/* URL
  // (Next.js resolves group conflicts alphabetically and (app) comes first),
  // skip the sidebar and auth check entirely so the public page renders correctly.
  if (pathname.startsWith('/setup/') || pathname.startsWith('/activate/')) {
    return <>{children}</>;
  }

  const session = await getSession();
  if (!session) redirect('/login');

  // Nav sections marked requiresWorkspaceAccess (e.g. SETTINGS) should show
  // for a workspace Manager/Leader but not an Agent — a distinction the
  // platform role (session.user.role) can't make, since Managers/Leaders/
  // Agents all share the same platform role. Resolve their actual membership
  // role via the same endpoint the self-service workspace pages themselves use.
  const myWorkspace = await apiGet<MyWorkspaceProfile | null>('/workspaces/me');
  const hasWorkspaceAccess =
    myWorkspace?.access.membershipRole === 'manager' ||
    myWorkspace?.access.membershipRole === 'leader';

  return (
    <div className="h-full flex bg-gray-50">
      <Sidebar user={session.user} hasWorkspaceAccess={hasWorkspaceAccess} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

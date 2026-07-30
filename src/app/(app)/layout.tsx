import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSession } from '@/lib/session';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Safety net: if the catch-all route group captured a public /setup/* URL
  // (Next.js resolves group conflicts alphabetically and (app) comes first),
  // skip the sidebar and auth check entirely so the public page renders correctly.
  if (pathname.startsWith('/setup/')) {
    return <>{children}</>;
  }

  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="h-full flex bg-gray-50">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

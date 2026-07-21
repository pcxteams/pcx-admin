import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function AdminPage() {
  const session = await getSession();

  if (session?.user.role !== 'master_admin') {
    redirect('/');
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen gap-6 px-8">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold text-gray-700">PCx Master Admin</h1>
        <p className="text-sm text-gray-500">
          This page is accessible only to users with the <code className="font-mono bg-gray-100 px-1 rounded">master_admin</code> role.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
          <span className="font-medium text-gray-400 uppercase text-xs tracking-wide">Signed in as</span>
          <p className="mt-1 font-mono text-gray-600">{session.user.email}</p>
        </div>
      </div>
    </div>
  );
}

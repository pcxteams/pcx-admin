import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import AddTeamForm from './AddTeamForm';

export default async function AddTeamPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Same access gate as the Users list page — this form's pickers call the
  // same read-only endpoints, so anyone without directory access shouldn't
  // see the form either.
  const stats = await apiGet('/users/stats');
  if (stats === null) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">You don&apos;t have access to the Users directory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <AddTeamForm />
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import type { PlatformSettings } from '@/lib/platform-settings';
import PlatformSettingsView from './PlatformSettingsView';

/**
 * PCx Platform > Settings (KAN-108) — platform-wide email-delivery identity and
 * default branding. Restricted to the platform roles master and admin
 * ("PCx Admin"); any other role is redirected. The backend independently gates
 * every /platform/settings API with @Roles(['master','admin']), so this is
 * defense-in-depth on top of the real authorization boundary.
 */
export default async function PlatformSettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const role = session.user.role;
  if (role !== 'master' && role !== 'admin') redirect('/');

  const settings = await apiGet<PlatformSettings>('/platform/settings');
  if (!settings) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-16 text-center">
        <p className="text-lg font-semibold text-gray-900 mb-2">
          Couldn&apos;t load platform settings
        </p>
        <p className="text-sm text-gray-500">
          Please refresh the page. If the problem persists, contact the PCx
          engineering team.
        </p>
      </div>
    );
  }

  return <PlatformSettingsView initial={settings} />;
}

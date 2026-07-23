import { apiGet } from '@/lib/api';
import CommunicationsPage from './CommunicationsPage';
import type { EmailSendSummary } from './types';

// The (app) layout already enforces a valid session and redirects to /login,
// so by the time this renders the caller is authenticated.
export default async function Page() {
  const sends =
    (await apiGet<EmailSendSummary[]>('/communications/emails')) ?? [];

  return <CommunicationsPage initialSends={sends} />;
}

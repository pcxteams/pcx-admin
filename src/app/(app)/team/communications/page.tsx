import { apiGet } from '@/lib/api';
import CommunicationsPage from './CommunicationsPage';
import type { EmailSendSummary } from './types';

// The (app) layout already enforces a valid session and redirects to /login,
// so by the time this renders the caller is authenticated.
export default async function Page() {
  const data = await apiGet<EmailSendSummary[]>('/communications/emails');
  // apiGet returns null on any error; a healthy endpoint returns the array.
  // Guard against an unexpected non-array 200 body so the page can't crash
  // in CommunicationsPage's .map — fall back to the empty state instead.
  const sends = Array.isArray(data) ? data : [];

  return <CommunicationsPage initialSends={sends} />;
}

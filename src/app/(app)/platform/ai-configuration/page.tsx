import { redirect } from 'next/navigation';

/** Bare index — always redirects to the first tab. */
export default function AiConfigurationPage() {
  redirect('/platform/ai-configuration/ranking-weights');
}

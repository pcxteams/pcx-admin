import ActivateAccountForm from './ActivateAccountForm';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

async function fetchContext(token: string) {
  try {
    const res = await fetch(`${API_URL}/activate/${token}`, { cache: 'no-store' });
    return { status: res.status, data: res.ok ? await res.json() : null };
  } catch {
    return { status: 500, data: null };
  }
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full px-8 py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl">!</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500">{body}</p>
      </div>
    </div>
  );
}

export default async function ActivatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { status, data } = await fetchContext(token);

  if (status === 410) {
    return (
      <ErrorCard
        title="Link no longer active"
        body="This activation link has already been used or has expired. Please contact your workspace administrator for assistance."
      />
    );
  }

  if (!data || status !== 200) {
    return (
      <ErrorCard
        title="Invalid link"
        body="This activation link is not valid. Please check the link in your email or contact your administrator."
      />
    );
  }

  return <ActivateAccountForm prefill={data} token={token} />;
}

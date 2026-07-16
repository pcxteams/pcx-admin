type HealthResult =
  | { ok: true; status: number; body: string }
  | { ok: false; error: string };

async function checkHealth(): Promise<HealthResult> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return { ok: false, error: 'API_URL environment variable is not set.' };
  }

  try {
    const res = await fetch(`${apiUrl}/health`, { cache: 'no-store' });
    const body = await res.text();
    return { ok: true, status: res.status, body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function BeConnTestPage() {
  const result = await checkHealth();
  const apiUrl = process.env.API_URL;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen gap-6 px-8">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-xl font-semibold text-gray-700">Backend Connection Test</h1>

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 break-all">
          <span className="font-medium text-gray-400 uppercase text-xs tracking-wide">Endpoint</span>
          <p className="mt-1 font-mono text-gray-600">{apiUrl}/health</p>
        </div>

        {result.ok ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">
                Connected — HTTP {result.status}
              </span>
            </div>
            <p className="text-sm text-green-800 font-mono whitespace-pre-wrap">{result.body}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-700">Connection failed</span>
            </div>
            <p className="text-sm text-red-800 font-mono whitespace-pre-wrap">{result.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

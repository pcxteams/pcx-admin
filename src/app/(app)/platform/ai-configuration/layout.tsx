import AiConfigTabs from './AiConfigTabs';

/**
 * PCx Platform > AI Configuration — home for platform-wide AI behavior
 * settings (master-only). Split into tabs by kind of config (Ranking Weights,
 * Prompts) rather than one long page, since more prompt types are expected —
 * each kind gets its own tab/route instead of everything competing for space
 * on a single page.
 */
export default function AiConfigurationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">AI Configuration</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Platform-wide settings for how AI behaves across PCx.
      </p>
      <AiConfigTabs />
      {children}
    </div>
  );
}

import WeightPanel from './WeightPanel';

/**
 * PCx Platform > AI Configuration — home for platform-wide AI behavior
 * settings (master-only). Currently just the Career Builder ranking weights;
 * moved here (from /development/career-builder) as the first section of a
 * broader area that will grow to include things like the LLM prompt used for
 * "why" explanations and model choice, so those can be tuned without an
 * engineer redeploying.
 */
export default function AiConfigurationPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">AI Configuration</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Platform-wide settings for how AI behaves across PCx.
      </p>

      <h2 className="text-sm font-semibold text-gray-900">Ranking weights</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Tune the weights the Career Builder ranking engine uses to order content for agents.
      </p>
      <WeightPanel />
    </div>
  );
}

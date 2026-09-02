import WeightPanel from './WeightPanel';
import PromptPanel from './PromptPanel';

/**
 * PCx Platform > AI Configuration — home for platform-wide AI behavior
 * settings (master-only). Started with just the Career Builder ranking
 * weights (moved here from /development/career-builder); now also the LLM
 * prompt behind the "why" explanations, externalized so either can be tuned
 * without an engineer redeploying. Will grow further (e.g. model choice).
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

      <h2 className="mt-10 text-sm font-semibold text-gray-900">"Why" explanation prompt</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Tune the prompt the AI uses to explain why each item is recommended to an agent.
      </p>
      <PromptPanel />
    </div>
  );
}

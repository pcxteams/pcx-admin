import PromptPanel from '../PromptPanel';

/**
 * Listed as a registry (not just one panel) even though there's only one
 * prompt today, since more prompt types are expected — adding one later
 * means adding an entry here, not restructuring navigation again. Not yet
 * interactive/selectable since there's nothing else to select; the first
 * prompt type added after this one should turn this into a real picker.
 */
const PROMPTS = [
  {
    key: 'why-explanation',
    label: 'Why Explanation',
    description: "Explains why each ranked item is recommended to an agent, shown on their Home page.",
  },
];

export default function PromptsPage() {
  const activePrompt = PROMPTS[0];

  return (
    <div className="flex gap-8">
      <div className="w-56 shrink-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Prompts
        </p>
        <div className="space-y-1.5">
          {PROMPTS.map((p) => (
            <div
              key={p.key}
              className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2"
            >
              <p className="text-sm font-medium text-teal-800">{p.label}</p>
              <p className="mt-0.5 text-xs text-teal-600">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-gray-900">{activePrompt.label}</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          Tune the prompt the AI uses to explain why each item is recommended to an agent.
        </p>
        <PromptPanel />
      </div>
    </div>
  );
}

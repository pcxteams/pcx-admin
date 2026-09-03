'use client';

import { useState } from 'react';
import PromptPanel from '../PromptPanel';

const PROMPTS = [
  {
    key: 'why_explanation',
    label: 'Why Explanation',
    description: 'Explains why each ranked item is recommended to an agent, shown on their Home page.',
    footerNote:
      'Every save creates a new version rather than overwriting — the "why" explanations always ' +
      'use the most recently saved prompt. Changing it invalidates every cached explanation, so ' +
      'agents will see freshly generated text on their next queue load.',
  },
  {
    key: 'learning_guidance',
    label: 'Learning Guidance',
    description: 'Curates and sequences an agent’s "next steps" plan from their own ranked content queue.',
    footerNote:
      'This prompt only ever chooses from the ranked candidates the deterministic ranking engine ' +
      'already produced for that agent — it cannot introduce content outside that list. Every ' +
      'save creates a new version; the next plan generation uses the most recently saved one.',
  },
];

export default function PromptsView() {
  const [activeKey, setActiveKey] = useState(PROMPTS[0].key);
  const active = PROMPTS.find((p) => p.key === activeKey)!;

  return (
    <div className="flex gap-8">
      <div className="w-56 shrink-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Prompts
        </p>
        <div className="space-y-1.5">
          {PROMPTS.map((p) => {
            const isActive = p.key === activeKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setActiveKey(p.key)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'border-teal-100 bg-teal-50'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <p className={`text-sm font-medium ${isActive ? 'text-teal-800' : 'text-gray-900'}`}>
                  {p.label}
                </p>
                <p className={`mt-0.5 text-xs ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-gray-900">{active.label}</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">{active.description}</p>
        <PromptPanel promptKey={active.key} footerNote={active.footerNote} />
      </div>
    </div>
  );
}

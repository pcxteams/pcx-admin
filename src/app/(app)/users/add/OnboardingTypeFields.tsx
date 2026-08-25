'use client';

const CARD_CLASS = 'bg-white rounded-xl border border-gray-100 overflow-hidden';
const CARD_HEADER_CLASS = 'px-6 py-4 border-b border-gray-100 text-sm font-semibold text-gray-900';
const CARD_BODY_CLASS = 'p-6';

// KAN-96 (Aug 18 clarification): one combined Onboarding Type, replacing the
// old Production Level. The hint spells out each option's two downstream
// effects (Office Setup audience + starting learning path) so the person
// inviting understands what the choice controls. The learning path itself is
// derived and stored server-side — see users.service.ts.
const OPTIONS = [
  {
    value: 'new_agent',
    label: 'New Agent',
    hint: 'New Agent office setup · starts on Foundations',
  },
  {
    value: 'transfer_some_experience',
    label: 'Transfer Agent — Some Experience',
    hint: 'Transfer Agent office setup · starts on Foundations',
  },
  {
    value: 'transfer_highly_experienced',
    label: 'Transfer Agent — Highly Experienced',
    hint: 'Transfer Agent office setup · starts on Mastery',
  },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function OnboardingTypeFields({ value, onChange }: Props) {
  return (
    <div className={CARD_CLASS}>
      <div className={CARD_HEADER_CLASS}>4. Onboarding Type</div>
      <div className={CARD_BODY_CLASS}>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Onboarding Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors cursor-pointer ${
                value === option.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="block">{option.label}</span>
              <span
                className={`mt-1 block text-[11px] font-normal ${
                  value === option.value ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

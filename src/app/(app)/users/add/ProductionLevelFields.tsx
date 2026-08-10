'use client';

const CARD_CLASS = 'bg-white rounded-xl border border-gray-100 overflow-hidden';
const CARD_HEADER_CLASS = 'px-6 py-4 border-b border-gray-100 text-sm font-semibold text-gray-900';
const CARD_BODY_CLASS = 'p-6';

// KAN-96: exactly these three — no "Top Producer".
const LEVELS = [
  { value: 'no_production', label: 'No Production' },
  { value: 'some_production', label: 'Some Production' },
  { value: 'consistent_producer', label: 'Consistent Producer' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function ProductionLevelFields({ value, onChange }: Props) {
  return (
    <div className={CARD_CLASS}>
      <div className={CARD_HEADER_CLASS}>5. Production Information</div>
      <div className={CARD_BODY_CLASS}>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Current Production Level <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors cursor-pointer ${
                value === level.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Check, Minus } from 'lucide-react';

const SECTION = 'bg-white rounded-xl border border-gray-100 p-6';
const SECTION_TITLE = 'text-base font-semibold text-gray-900 mb-1';
const SECTION_SUB = 'text-xs text-gray-400 mb-5';

function ProgressBadge({ completed }: { completed: boolean }) {
  return completed ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
      <Check size={12} />Completed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <Minus size={12} />Not completed
    </span>
  );
}

function ProgressRow({ label, description, completed }: { label: string; description: string; completed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <ProgressBadge completed={completed} />
    </div>
  );
}

/**
 * "Customizations" progress shared by both Workspace Profiles. Shows the two
 * setup steps independently: Workspace Setup (the public setup form) and
 * Workspace Customization (the customization form). Neither changes the
 * workspace's Active status — this is progress display only.
 */
export default function CustomizationsSection({
  setupCompleted,
  customizationCompleted,
}: {
  setupCompleted: boolean;
  customizationCompleted: boolean;
}) {
  return (
    <div className={SECTION}>
      <p className={SECTION_TITLE}>Customizations</p>
      <p className={SECTION_SUB}>Setup progress for this workspace.</p>
      <div className="divide-y divide-gray-50">
        <ProgressRow
          label="Workspace Setup"
          description="Marked complete when the Workspace Setup form is submitted."
          completed={setupCompleted}
        />
        <ProgressRow
          label="Workspace Customization"
          description="Marked complete when the Workspace Customization form is submitted."
          completed={customizationCompleted}
        />
      </div>
    </div>
  );
}

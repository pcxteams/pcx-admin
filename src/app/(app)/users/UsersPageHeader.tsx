import { Download, Columns3, Plus } from 'lucide-react';

/**
 * Toolbar buttons are intentionally inert for now — no onClick handler —
 * per product direction: the UI should exist ahead of the actions behind it.
 */
export default function UsersPageHeader() {
  return (
    <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage agents and leaders within this Workspace.</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors cursor-pointer"
        >
          <Download size={14} />
          Export
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors cursor-pointer"
        >
          <Columns3 size={14} />
          Customize Columns
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Add User
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Add Team
        </button>
      </div>
    </div>
  );
}

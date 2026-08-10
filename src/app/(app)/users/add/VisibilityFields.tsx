'use client';

import { Users, User } from 'lucide-react';

const CARD_CLASS = 'bg-white rounded-xl border border-gray-100 overflow-hidden';
const CARD_HEADER_CLASS = 'px-6 py-4 border-b border-gray-100 text-sm font-semibold text-gray-900';
const CARD_BODY_CLASS = 'p-6';

export type AccessLevel = 'workspace' | 'assigned_agents';

interface Props {
  accessLevel: AccessLevel;
  onAccessLevelChange: (v: AccessLevel) => void;
}

/**
 * Leader-only per KAN-96 ("Show Visibility only for Leader... A Manager
 * always receives full workspace access") — Manager no longer renders this
 * section at all, not even a disabled/locked version of it.
 */
export default function VisibilityFields({ accessLevel, onAccessLevelChange }: Props) {
  return (
    <div className={CARD_CLASS}>
      <div className={CARD_HEADER_CLASS}>4. Visibility</div>
      <div className={CARD_BODY_CLASS}>
        <p className="text-sm text-gray-700 mb-2">Select the access level for this leader</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onAccessLevelChange('workspace')}
            className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
              accessLevel === 'workspace' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                accessLevel === 'workspace' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Users size={16} />
            </div>
            <p className={`text-sm font-semibold ${accessLevel === 'workspace' ? 'text-blue-700' : 'text-gray-900'}`}>
              Entire Workspace
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Can view and manage all agents in the workspace</p>
          </button>

          <button
            type="button"
            onClick={() => onAccessLevelChange('assigned_agents')}
            className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
              accessLevel === 'assigned_agents' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                accessLevel === 'assigned_agents' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <User size={16} />
            </div>
            <p className={`text-sm font-semibold ${accessLevel === 'assigned_agents' ? 'text-blue-700' : 'text-gray-900'}`}>
              Assigned Agents Only
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Restricted to their personally assigned agents only</p>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import AsyncSearchableSelect from '@/components/AsyncSearchableSelect';
import { fetchLeaderOptions } from '@/lib/users';

const LABEL_CLASS = 'block text-xs font-medium text-gray-700 mb-1';
// No overflow-hidden: the Primary/Additional Leader fields use
// AsyncSearchableSelect, whose options list is absolutely positioned and can
// extend past the card's bottom edge — clipping it there hides part of the
// list instead of letting it render on top of whatever comes next.
const CARD_CLASS = 'bg-white rounded-xl border border-gray-100';
const CARD_HEADER_CLASS = 'px-6 py-4 border-b border-gray-100 text-sm font-semibold text-gray-900';
const CARD_BODY_CLASS = 'p-6 space-y-4';

export interface LeaderValue {
  id: string;
  label: string;
}

interface Props {
  workspaceId: string;
  primaryLeader: LeaderValue;
  onPrimaryLeaderChange: (v: LeaderValue) => void;
  additionalLeaders: LeaderValue[];
  onAdditionalLeadersChange: (v: LeaderValue[]) => void;
}

/**
 * KAN-96: "Primary Leader" (required) + "Add Another Leader" — no distinct
 * Secondary/Coach field, just an open-ended repeatable list. The leader pool
 * is scoped to whichever workspace the caller resolved (the selected Team,
 * or the Office when no Team is chosen) and includes both Leader and
 * Manager roles. Primary and additional selections can never duplicate one
 * another (enforced here client-side via exclusion, and again server-side).
 * If exactly one leader is eligible, it's prefilled and the Primary picker
 * is locked.
 */
export default function AssignedLeaderFields({
  workspaceId,
  primaryLeader,
  onPrimaryLeaderChange,
  additionalLeaders,
  onAdditionalLeadersChange,
}: Props) {
  const disabled = !workspaceId;
  // Only meaningful while workspaceId is set — derived below rather than
  // reset via a synchronous setState branch in the effect.
  const [fetchedSingleLeader, setFetchedSingleLeader] = useState<LeaderValue | null>(null);
  const lockedSingleLeader = workspaceId ? fetchedSingleLeader : null;

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    fetchLeaderOptions(workspaceId, '').then((options) => {
      if (cancelled) return;
      if (options.length === 1) {
        setFetchedSingleLeader(options[0]);
        onPrimaryLeaderChange({ id: options[0].id, label: options[0].label });
      } else {
        setFetchedSingleLeader(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, onPrimaryLeaderChange]);

  function fetchOptionsExcluding(excludeIds: string[]) {
    return async (query: string) => {
      const options = await fetchLeaderOptions(workspaceId, query);
      return options.filter((o) => !excludeIds.includes(o.id));
    };
  }

  function addLeader() {
    onAdditionalLeadersChange([...additionalLeaders, { id: '', label: '' }]);
  }

  function updateLeader(index: number, id: string, label: string) {
    const next = [...additionalLeaders];
    next[index] = { id, label };
    onAdditionalLeadersChange(next);
  }

  function removeLeader(index: number) {
    onAdditionalLeadersChange(additionalLeaders.filter((_, i) => i !== index));
  }

  return (
    <div className={CARD_CLASS}>
      <div className={CARD_HEADER_CLASS}>4. Assigned Leader</div>
      <div className={CARD_BODY_CLASS}>
        <div>
          <label className={LABEL_CLASS}>
            Primary Leader <span className="text-red-500">*</span>
          </label>
          <AsyncSearchableSelect
            value={primaryLeader.id}
            selectedLabel={primaryLeader.label}
            onChange={(id, label) => onPrimaryLeaderChange({ id, label })}
            fetchOptions={fetchOptionsExcluding(additionalLeaders.map((l) => l.id))}
            placeholder={disabled ? 'Select a workspace first' : 'Select leader'}
            disabled={disabled || !!lockedSingleLeader}
          />
          {lockedSingleLeader && (
            <p className="mt-1 text-xs text-gray-400">Only one eligible leader — prefilled automatically.</p>
          )}
        </div>

        {additionalLeaders.map((leader, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <label className={LABEL_CLASS}>Additional Leader</label>
              <AsyncSearchableSelect
                value={leader.id}
                selectedLabel={leader.label}
                onChange={(id, label) => updateLeader(i, id, label)}
                fetchOptions={fetchOptionsExcluding([
                  primaryLeader.id,
                  ...additionalLeaders.filter((_, j) => j !== i).map((l) => l.id),
                ])}
                placeholder="Select leader"
                disabled={disabled}
              />
            </div>
            <button
              type="button"
              onClick={() => removeLeader(i)}
              className="mb-2 text-gray-400 hover:text-red-500 cursor-pointer"
              aria-label="Remove leader"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addLeader}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          Add Another Leader
        </button>
      </div>
    </div>
  );
}

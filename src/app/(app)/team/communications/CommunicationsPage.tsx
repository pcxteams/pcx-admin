'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Mail } from 'lucide-react';
import NewEmailModal from './NewEmailModal';
import type { EmailSendSummary } from './types';

// Static filter options. There is no offices/teams/agents data model in v3 yet,
// so these are presentational stubs that don't filter the list. They'll wire
// to real audiences once the workspace model lands.
const SCOPE_OPTIONS = ['PCx Admin', 'PCx Master', 'Workspace Manager'];
const OFFICE_OPTIONS = ['All Offices'];
const TEAM_OPTIONS = ['All Teams'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function openRateColor(rate: number | null): string {
  if (rate == null) return 'text-gray-400';
  if (rate >= 80) return 'text-green-600';
  if (rate >= 50) return 'text-amber-600';
  return 'text-red-500';
}

/** Pill-shaped filter dropdown from the top bar. */
function PillSelect({ options }: { options: string[] }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(options[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
      >
        {value}
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setValue(opt);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                opt === value ? 'text-teal-600 font-medium' : 'text-gray-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunicationsPage({
  initialSends,
}: {
  initialSends: EmailSendSummary[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Top filter bar */}
      <div className="border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">
            View Email Communication For
          </span>
          <PillSelect options={SCOPE_OPTIONS} />
          <PillSelect options={OFFICE_OPTIONS} />
          <PillSelect options={TEAM_OPTIONS} />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Email Communication</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
          The Email Library for your office. Send manual emails and manage
          reusable templates referenced by Career Path, Courses, Tasks, and
          other builders.
        </p>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Send a Manual Email
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Compose and send a one-time email to agents, leaders, or teams.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
              New Email
            </button>
          </div>

          {/* Recent sends */}
          <div className="border-t border-gray-100 px-6 py-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Recent Manual Sends
            </p>

            {initialSends.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Mail size={28} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  No manual emails sent yet
                </p>
                <p className="text-xs text-gray-400">
                  Send your first one-time email with{' '}
                  <span className="font-medium text-gray-500">New Email</span>.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {initialSends.map((send) => (
                  <li
                    key={send.id}
                    className="flex items-center gap-4 py-4"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(send.id)}
                      onChange={() => toggleSelected(send.id)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 accent-teal-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">
                        {send.title}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        To {send.audienceLabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm text-gray-400">
                      {formatDate(send.createdAt)}
                    </div>
                    <div
                      className={`w-20 shrink-0 text-right text-sm font-semibold ${openRateColor(
                        send.openRate,
                      )}`}
                    >
                      {send.openRate == null ? 'N/A' : `${send.openRate}% open`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <NewEmailModal
          onClose={() => setModalOpen(false)}
          onSent={() => {
            setModalOpen(false);
            // Re-run the server component fetch so the new send appears.
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

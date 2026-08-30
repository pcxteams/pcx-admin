'use client';

import { useEffect, useState } from 'react';

interface Weights {
  priority: number;
  assignmentStatus: number;
  topicMatch: number;
  leaderAssigned: number;
  progressStickiness: number;
  recency: number;
}

interface WeightConfig {
  id: string;
  weights: Weights;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
}

const FACTOR_META: { key: keyof Weights; label: string; description: string }[] = [
  { key: 'priority', label: 'Criticality', description: 'How the content is marked: Critical / Very Important / Important.' },
  { key: 'assignmentStatus', label: 'Assignment status', description: 'Required / Recommended / Optional.' },
  { key: 'topicMatch', label: 'Matches agent focus', description: "Does it match what the agent said they need help with." },
  { key: 'leaderAssigned', label: 'Leader assigned', description: 'Was this assigned directly by a Leader.' },
  { key: 'progressStickiness', label: 'Already started', description: 'Is the agent partway through it.' },
  { key: 'recency', label: 'Overdue', description: 'Is it past its due date.' },
];

const INPUT =
  'w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function WeightPanel() {
  const [weights, setWeights] = useState<Weights | null>(null);
  const [active, setActive] = useState<WeightConfig | null>(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/career-builder/weights', { credentials: 'include' });
        if (res.status === 403) {
          setForbidden(true);
          return;
        }
        if (!res.ok) {
          setError('Could not load the current weights.');
          return;
        }
        const data = (await res.json()) as WeightConfig;
        setWeights(data.weights);
        setActive(data);
      } catch {
        setError('Unable to reach the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sum = weights ? Object.values(weights).reduce((s, v) => s + v, 0) : 0;
  const sumIsValid = Math.abs(sum - 100) < 0.5;

  function updateWeight(key: keyof Weights, value: string) {
    if (!weights) return;
    const parsed = value === '' ? 0 : Number(value);
    if (Number.isNaN(parsed)) return;
    setWeights({ ...weights, [key]: parsed });
  }

  async function handleSave() {
    if (!weights || !sumIsValid) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await fetch('/api/career-builder/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weights, label: label.trim() || undefined }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      const saved = (await res.json()) as WeightConfig;
      setActive(saved);
      setLabel('');
      setSavedMessage('Saved. The ranking engine will use these weights immediately.');
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (forbidden) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
        This page is for platform admins only.
      </div>
    );
  }

  if (!weights) {
    return <p className="text-sm text-red-600">{error ?? 'Could not load weights.'}</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Currently active
        </p>
        <p className="text-sm text-gray-700">
          {active?.label ?? 'Unlabeled version'}
          <span className="text-gray-400"> · saved {active ? formatDate(active.createdAt) : '—'}</span>
        </p>

        <div className="mt-6 space-y-4">
          {FACTOR_META.map(({ key, label: factorLabel, description }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{factorLabel}</p>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className={INPUT}
                  value={weights[key]}
                  onChange={(e) => updateWeight(key, e.target.value)}
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-sm text-gray-500">Total</span>
          <span className={`text-sm font-semibold ${sumIsValid ? 'text-gray-900' : 'text-red-600'}`}>
            {sum}% {!sumIsValid && '— must equal 100%'}
          </span>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            Note for this version (optional)
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Boosting leader-assigned content after agent feedback"
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {savedMessage && <p className="mt-4 text-sm text-green-600">{savedMessage}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!sumIsValid || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save new version'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Every save creates a new version rather than overwriting — the ranking engine always uses
        the most recently saved one. Nothing here is a hard rule: the AI weighs all of these
        together rather than any one factor being an absolute cutoff.
      </p>
    </div>
  );
}

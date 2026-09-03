'use client';

import { useEffect, useState } from 'react';

interface PromptConfig {
  id: string;
  prompt: string;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
}

const PROMPT_MAX_LENGTH = 4000;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function PromptPanel({
  promptKey,
  footerNote,
}: {
  promptKey: string;
  footerNote: string;
}) {
  const [prompt, setPrompt] = useState('');
  const [active, setActive] = useState<PromptConfig | null>(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/career-builder/prompt?key=${promptKey}`, { credentials: 'include' });
        if (res.status === 403) {
          setForbidden(true);
          return;
        }
        if (!res.ok) {
          setError('Could not load the current prompt.');
          return;
        }
        const data = (await res.json()) as PromptConfig;
        setPrompt(data.prompt);
        setActive(data);
      } catch {
        setError('Unable to reach the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, [promptKey]);

  const isValid = prompt.trim().length > 0 && prompt.length <= PROMPT_MAX_LENGTH;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await fetch('/api/career-builder/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: promptKey, prompt, label: label.trim() || undefined }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      const saved = (await res.json()) as PromptConfig;
      setActive(saved);
      setLabel('');
      setSavedMessage('Saved. The next queue load will use this prompt.');
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

        <div className="mt-6">
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            System prompt
          </label>
          <textarea
            rows={8}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <p className={`mt-1 text-xs ${prompt.length > PROMPT_MAX_LENGTH ? 'text-red-600' : 'text-gray-400'}`}>
            {prompt.length} / {PROMPT_MAX_LENGTH} characters
          </p>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            Note for this version (optional)
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Shorter, friendlier tone per agent feedback"
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {savedMessage && <p className="mt-4 text-sm text-green-600">{savedMessage}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save new version'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">{footerNote}</p>
    </div>
  );
}

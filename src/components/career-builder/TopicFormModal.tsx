'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { topicsApiBase, TOPIC_ICONS, type CareerBuilderScope, type Topic } from '@/lib/career-builder';

const LABEL = 'block text-xs font-medium text-gray-600 mb-1.5';
const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

export default function TopicFormModal({
  scope, mode, topic, onClose, onSaved,
}: {
  scope: CareerBuilderScope;
  mode: 'create' | 'edit';
  topic?: Topic;
  onClose: () => void;
  onSaved: (saved: Topic) => void;
}) {
  const [title, setTitle] = useState(topic?.title ?? '');
  const [description, setDescription] = useState(topic?.description ?? '');
  const [icon, setIcon] = useState<string | null>(topic?.icon ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        mode === 'create' ? topicsApiBase(scope) : `${topicsApiBase(scope)}/${topic!.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            icon: icon || null,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      onSaved((await res.json()) as Topic);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'Add Topic' : 'Edit Topic'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Title <span className="text-red-500">*</span></label>
            <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Buyer Skills" />
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={2}
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className={LABEL}>Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {TOPIC_ICONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => setIcon(icon === value ? null : value)}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer transition-colors ${
                    icon === value
                      ? 'border-teal-500 bg-teal-50 text-teal-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

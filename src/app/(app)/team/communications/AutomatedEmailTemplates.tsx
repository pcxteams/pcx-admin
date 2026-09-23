'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import AsyncSearchableSelect, { type AsyncOption } from '@/components/AsyncSearchableSelect';
import type {
  EmailTemplate,
  EmailTemplateInventory,
  EmailTemplatePreview,
} from './types';

/**
 * Automated Email Templates (KAN-154): a Workspace edits the subject and body
 * of the emails PCx sends for it, and nothing else about delivery.
 *
 * A Manager gets their own Workspace, a PCx Admin picks any. Entitlement is
 * decided on the server and passed in, never inferred from a 403, or a Leader
 * would see the card for the length of a round trip. The 403 branch is a
 * backstop for entitlement that changes mid-session.
 */
export default function AutomatedEmailTemplates({
  defaultWorkspaceId,
  defaultWorkspaceName,
  isPlatformAdmin,
}: {
  defaultWorkspaceId: string | null;
  defaultWorkspaceName: string | null;
  isPlatformAdmin: boolean;
}) {
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(
    defaultWorkspaceId && defaultWorkspaceName
      ? { id: defaultWorkspaceId, name: defaultWorkspaceName }
      : null,
  );
  const [inventory, setInventory] = useState<EmailTemplateInventory | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>(
    workspace ? 'loading' : 'idle',
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const pickerId = useId();

  const [reloadToken, setReloadToken] = useState(0);
  // Rows with unsaved edits. A ref, so tracking them costs no re-render.
  const dirtyKeys = useRef<Set<string>>(new Set());

  const markDirty = useCallback((key: string, isDirty: boolean) => {
    if (isDirty) dirtyKeys.current.add(key);
    else dirtyKeys.current.delete(key);
  }, []);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${workspace.id}/email-templates`,
          { credentials: 'include' },
        );
        if (cancelled) return;
        if (res.status === 403) {
          setState('forbidden');
          return;
        }
        if (!res.ok) {
          setState('error');
          return;
        }
        const data = (await res.json()) as EmailTemplateInventory;
        if (cancelled) return;
        setInventory(data);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    // A workspace switch mid-flight must not let the slower response win.
    return () => {
      cancelled = true;
    };
  }, [workspace, reloadToken]);

  /** The picker and the retry button. A switch unmounts every open editor. */
  function loadWorkspace(next: { id: string; name: string } | null) {
    if (
      dirtyKeys.current.size > 0 &&
      !window.confirm(
        'You have unsaved template changes. Leave them and load another workspace?',
      )
    ) {
      return;
    }
    dirtyKeys.current.clear();
    setWorkspace(next);
    setInventory(null);
    setState(next ? 'loading' : 'idle');
    setReloadToken((t) => t + 1);
  }

  // Entitlement changed under the viewer. An admin keeps the picker, or they
  // would have no way to choose another workspace short of a reload.
  if (state === 'forbidden' && !isPlatformAdmin) return null;

  // A platform account with no home Workspace still gets the picker.
  if (!workspace && !isPlatformAdmin) return null;

  function replaceTemplate(next: EmailTemplate) {
    setInventory((prev) =>
      prev
        ? {
            ...prev,
            templates: prev.templates.map((t) => (t.key === next.key ? next : t)),
          }
        : prev,
    );
  }

  return (
    <div
      id="automated-email-templates"
      className="mt-6 scroll-mt-6 rounded-2xl border border-gray-200 bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 pb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Automated Email Templates
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            The operational emails PCx sends for this workspace. Edits apply to
            future sends only, and never change who receives an email or when.
          </p>
        </div>
        {isPlatformAdmin && (
          // The select renders a button, so the group carries the name.
          <div
            role="group"
            aria-labelledby={`${pickerId}-label`}
            className="w-72 shrink-0"
          >
            <span
              id={`${pickerId}-label`}
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Workspace
            </span>
            <AsyncSearchableSelect
              value={workspace?.id ?? ''}
              selectedLabel={workspace?.name ?? ''}
              placeholder="Select a workspace"
              fetchOptions={fetchWorkspaces}
              onChange={(id, label) =>
                loadWorkspace(id ? { id, name: label } : null)
              }
              clearable
            />
          </div>
        )}
      </div>

      {inventory && state === 'ready' && (
        <p className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
          Sent as{' '}
          <span className="font-medium text-gray-700">
            {inventory.sender.senderDisplayName}
          </span>{' '}
          &lt;{inventory.sender.fromEmail}&gt;, replies go to{' '}
          <span className="font-medium text-gray-700">
            {inventory.sender.replyToEmail}
          </span>
          . The sending address is managed by PCx and is not editable here.
        </p>
      )}

      <div className="border-t border-gray-100 px-6 py-5">
        {!workspace && (
          <EmptyNote>
            Select a workspace to see the emails PCx sends on its behalf.
          </EmptyNote>
        )}

        {workspace && state === 'loading' && (
          <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Loading templates...
          </div>
        )}

        {state === 'forbidden' && (
          <EmptyNote>
            You cannot manage automated email templates for this workspace.
          </EmptyNote>
        )}

        {workspace && state === 'error' && (
          <div className="flex flex-col items-start gap-2 py-6">
            <p className="flex items-center gap-2 text-sm font-medium text-red-600">
              <AlertCircle size={15} />
              Templates could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => loadWorkspace(workspace)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Try again
            </button>
          </div>
        )}

        {state === 'ready' && inventory && inventory.templates.length === 0 && (
          <EmptyNote>
            PCx does not send any editable automated emails for this workspace
            yet.
          </EmptyNote>
        )}

        {state === 'ready' && inventory && inventory.templates.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {inventory.templates.map((template) => (
              <TemplateRow
                key={template.key}
                template={template}
                workspaceId={inventory.workspaceId}
                isOpen={openKey === template.key}
                onToggle={() =>
                  setOpenKey((k) => (k === template.key ? null : template.key))
                }
                onChanged={replaceTemplate}
                onDirtyChange={markDirty}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <FileText size={26} className="text-gray-300" />
      <p className="max-w-md text-sm text-gray-500">{children}</p>
    </div>
  );
}

/** One template: summary row plus the editor it expands into. */
function TemplateRow({
  template,
  workspaceId,
  isOpen,
  onToggle,
  onChanged,
  onDirtyChange,
}: {
  template: EmailTemplate;
  workspaceId: string;
  isOpen: boolean;
  onToggle: () => void;
  onChanged: (next: EmailTemplate) => void;
  onDirtyChange: (key: string, dirty: boolean) => void;
}) {
  const uid = useId();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [busy, setBusy] = useState<null | 'save' | 'reset' | 'preview' | 'test'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [testTo, setTestTo] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const dirty = subject !== template.subject || body !== template.body;
  // Both actions post the draft, and an empty draft only earns a 400.
  const renderable = subject.trim() !== '' && body.trim() !== '';

  /** Every edit path: updates the parent's ledger and drops stale feedback. */
  function edit(next: { subject?: string; body?: string }) {
    const nextSubject = next.subject ?? subject;
    const nextBody = next.body ?? body;
    if (next.subject !== undefined) setSubject(next.subject);
    if (next.body !== undefined) setBody(next.body);
    onDirtyChange(
      template.key,
      nextSubject !== template.subject || nextBody !== template.body,
    );
    setPreview(null);
    setNotice(null);
  }

  /** Takes what the API stored, which clears the unsaved marker. */
  function adopt(next: EmailTemplate) {
    onChanged(next);
    setSubject(next.subject);
    setBody(next.body);
    onDirtyChange(template.key, false);
    setPreview(null);
  }

  async function call(
    action: 'save' | 'reset' | 'preview' | 'test',
    run: () => Promise<Response>,
  ) {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const res = await run();
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        // 4xx and the API's own 503 carry copy for this person; a bare 500
        // carries Nest's "Internal server error", which explains nothing.
        const trusted = res.status < 500 || res.status === 503;
        setError(
          (trusted ? messageOf(payload) : null) ??
            'Something went wrong. Try again.',
        );
        return null;
      }
      if (payload === null) {
        // No route does this today, but a silent no-op would look like a bug.
        setError('The server replied with nothing. Reload and try again.');
        return null;
      }
      return payload;
    } catch {
      setError('Something went wrong. Try again.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onSave() {
    const saved = await call('save', () =>
      fetch(`/api/workspaces/${workspaceId}/email-templates/${template.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, body }),
      }),
    );
    if (saved) {
      adopt(saved as EmailTemplate);
      setNotice('Saved. New sends will use this version.');
    }
  }

  async function onReset() {
    if (
      dirty &&
      !window.confirm(
        'Reset discards your unsaved changes and restores the PCx default. Continue?',
      )
    ) {
      return;
    }
    const reset = await call('reset', () =>
      fetch(`/api/workspaces/${workspaceId}/email-templates/${template.key}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    );
    if (reset) {
      adopt(reset as EmailTemplate);
      setNotice('Back to the PCx default.');
    }
  }

  async function onPreview() {
    const result = await call('preview', () =>
      fetch(
        `/api/workspaces/${workspaceId}/email-templates/${template.key}/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subject, body }),
        },
      ),
    );
    if (result) setPreview(result as EmailTemplatePreview);
  }

  async function onTest() {
    const result = await call('test', () =>
      fetch(
        `/api/workspaces/${workspaceId}/email-templates/${template.key}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subject, body, to: testTo || undefined }),
        },
      ),
    );
    if (result) {
      const sentTo = (result as { sentTo?: string }).sentTo;
      setNotice(`Test email sent to ${sentTo ?? 'your address'}.`);
    }
  }

  /** Inserts a field at the cursor. */
  function insertField(token: string) {
    const el = bodyRef.current;
    const snippet = `{{${token}}}`;
    if (!el) {
      edit({ body: `${body}${snippet}` });
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${snippet}${body.slice(end)}`;
    edit({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  return (
    <li className="py-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{template.name}</p>
            {template.isCustomized ? (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                Customized
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                PCx default
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{template.purpose}</p>
          <p className="mt-1 text-xs text-gray-400">{template.trigger}</p>
          {template.isCustomized && template.updatedByName && (
            <p className="mt-1 text-xs text-gray-400">
              Last edited by {template.updatedByName}
              {formatDate(template.updatedAt)
                ? ` on ${formatDate(template.updatedAt)}`
                : ''}
              .
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`${uid}-panel`}
          // Every row's visible label is "Edit", so name it for screen readers.
          aria-label={`${isOpen ? 'Close' : 'Edit'} the ${template.name} template`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {isOpen ? 'Close' : 'Edit'}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          id={`${uid}-panel`}
          role="group"
          aria-label={`${template.name} template`}
          className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <label
            htmlFor={`${uid}-subject`}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Subject
          </label>
          <input
            id={`${uid}-subject`}
            value={subject}
            onChange={(e) => edit({ subject: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />

          <label
            htmlFor={`${uid}-body`}
            className="mt-4 mb-1 block text-xs font-medium text-gray-600"
          >
            Body
          </label>
          <textarea
            id={`${uid}-body`}
            ref={bodyRef}
            value={body}
            onChange={(e) => edit({ body: e.target.value })}
            rows={12}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />

          <div className="mt-3">
            <p className="text-xs font-medium text-gray-600">
              Merge fields for this email
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {template.mergeFields.map((field) => (
                <button
                  key={field.token}
                  type="button"
                  onClick={() => insertField(field.token)}
                  title={`${field.description} Example: ${field.sample}`}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] text-gray-700 hover:border-teal-400 hover:text-teal-700"
                >
                  {`{{${field.token}}}`}
                  {field.requiredInBody && (
                    <span className="ml-1 text-[10px] text-amber-600">required</span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              Click a field to insert it. Anything else between double braces is
              rejected when you save.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              <AlertCircle size={14} className="mt-px shrink-0" />
              {error}
            </p>
          )}
          {notice && !error && (
            <p
              role="status"
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700"
            >
              <Check size={14} className="shrink-0" />
              {notice}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={busy !== null || !dirty}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busy === 'save' && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => void onPreview()}
              disabled={busy !== null || !renderable}
              title={
                renderable ? undefined : 'Fill in a subject and a body first.'
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'preview' && <Loader2 size={14} className="animate-spin" />}
              Preview
            </button>
            <button
              type="button"
              onClick={() => void onReset()}
              disabled={busy !== null || !template.isCustomized}
              title={
                template.isCustomized
                  ? 'Remove this workspace version'
                  : 'Already on the PCx default'
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'reset' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              Reset to PCx default
            </button>
            {dirty && (
              <span className="text-xs text-amber-600">Unsaved changes</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
            <label htmlFor={`${uid}-test-to`} className="sr-only">
              Send a test email to
            </label>
            <input
              id={`${uid}-test-to`}
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="Send a test to (defaults to you)"
              className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => void onTest()}
              disabled={busy !== null || !renderable}
              title={
                renderable ? undefined : 'Fill in a subject and a body first.'
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'test' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send test
            </button>
            <span className="text-xs text-gray-400">
              Uses sample data and does not trigger the real workflow.
            </span>
          </div>

          {preview && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Preview with sample data
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {preview.subject}
                </p>
              </div>
              <div
                className="prose prose-sm max-w-none px-4 py-3 text-sm text-gray-700 [&_a]:text-teal-700 [&_a]:underline [&_p]:my-2"
                // The API escapes the copy and every merge value before it
                // assembles this HTML. Do not relax that escaping.
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Sample values used
                </p>
                <ul className="mt-1.5 space-y-1">
                  {preview.sampleData.map((sample) => (
                    <li key={sample.token} className="text-xs text-gray-500">
                      <span className="font-mono text-gray-700">
                        {`{{${sample.token}}}`}
                      </span>{' '}
                      = <span className="text-gray-700">{sample.value}</span>
                      <span className="text-gray-400"> (sample)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

async function fetchWorkspaces(query: string): Promise<AsyncOption[]> {
  try {
    const res = await fetch(
      `/api/workspaces/search?q=${encodeURIComponent(query)}&limit=20`,
      { credentials: 'include' },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { id: string; name: string }[];
    return data.map((w) => ({ id: w.id, label: w.name }));
  } catch {
    return [];
  }
}

/** Nest puts validation text in `message`, which may be a string or a list. */
function messageOf(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(' ');
  return null;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

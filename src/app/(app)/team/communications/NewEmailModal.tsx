'use client';

import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  X,
  Mail,
  Link2,
  Send,
  Eye,
  Braces,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

const LABEL_CLASS = 'block text-sm text-gray-800 mb-1.5';

// Audience modes. The "group" modes can't resolve to addresses until the
// workspace/agent data model exists, so they set the list label only and the
// user still supplies deliverable addresses below (see helper note).
const AUDIENCE_MODES = [
  'Individual User',
  'Multiple Users',
  'Agents',
  'Leaders',
  'Office',
  'Team',
  'Tags',
  'Custom Search',
] as const;
type AudienceMode = (typeof AUDIENCE_MODES)[number];
const GROUP_MODES: AudienceMode[] = [
  'Agents',
  'Leaders',
  'Office',
  'Team',
  'Tags',
];

const MERGE_FIELDS = [
  '{{First Name}}',
  '{{Last Name}}',
  '{{Full Name}}',
  '{{Office Name}}',
  '{{Team Name}}',
  '{{Email}}',
];

type SendMode = 'now' | 'schedule' | 'draft';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Tags/attributes the compose editor can legitimately produce. Used to sanitise
// the local editor HTML before it's rendered in the Preview via
// dangerouslySetInnerHTML (the server sanitises again at send time).
const PREVIEW_ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'h1', 'h2', 'h3',
  'ul', 'ol', 'li', 'a', 'span', 'div', 'blockquote', 'hr',
];

function sanitizePreview(html: string): string {
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: PREVIEW_ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/** Collapsible section header (icon + title + chevron). */
function SectionHeader({
  icon,
  title,
  open,
  onToggle,
}: {
  icon?: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between py-1 text-left"
    >
      <span className="flex items-center gap-2.5">
        {icon}
        <span className="text-[15px] font-semibold text-gray-900">{title}</span>
      </span>
      {open ? (
        <ChevronUp size={18} className="text-gray-400" />
      ) : (
        <ChevronDown size={18} className="text-gray-400" />
      )}
    </button>
  );
}

interface Props {
  onClose: () => void;
  onSent: () => void;
}

export default function NewEmailModal({ onClose, onSent }: Props) {
  const [open, setOpen] = useState({
    details: true,
    merge: false,
    audience: true,
    send: true,
    preview: false,
  });
  const toggle = (k: keyof typeof open) =>
    setOpen((o) => ({ ...o, [k]: !o[k] }));

  const [internalName, setInternalName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyEmpty, setBodyEmpty] = useState(true);

  const [audienceMode, setAudienceMode] = useState<AudienceMode>('Agents');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  const [sendMode, setSendMode] = useState<SendMode>('now');
  const [scheduleAt, setScheduleAt] = useState('');

  const [previewHtml, setPreviewHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const mergeMenuRef = useRef<HTMLDivElement>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (mergeMenuRef.current && !mergeMenuRef.current.contains(e.target as Node))
        setMergeOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // --- rich text editor -----------------------------------------------------

  // Called after any edit. Tracks the empty-placeholder state and, when the
  // Preview is open, keeps it in sync with the live editor content.
  function refreshEditorState() {
    setBodyEmpty(!editorRef.current?.innerText.trim());
    if (open.preview) {
      setPreviewHtml(sanitizePreview(editorRef.current?.innerHTML ?? ''));
    }
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    // execCommand is deprecated but remains the simplest cross-browser way to
    // drive a contentEditable toolbar; adequate for an internal admin tool.
    document.execCommand(command, false, value);
    refreshEditorState();
  }

  function insertMergeField(token: string) {
    exec('insertText', token);
    setMergeOpen(false);
  }

  // --- recipients -----------------------------------------------------------

  const typedMode = !GROUP_MODES.includes(audienceMode);

  function addRecipient(raw: string) {
    // Accept a single address or a pasted list (comma/space/newline separated).
    const valid = raw
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && isValidEmail(t));
    if (valid.length) {
      setRecipients((prev) => {
        const next = [...prev];
        for (const email of valid) if (!next.includes(email)) next.push(email);
        return next;
      });
    }
    setEmailInput('');
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && recipients.length) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  }

  // --- preview --------------------------------------------------------------

  function togglePreview() {
    if (!open.preview) {
      setPreviewHtml(sanitizePreview(editorRef.current?.innerHTML ?? ''));
    }
    toggle('preview');
  }

  // --- submit ---------------------------------------------------------------

  async function handleSend() {
    setError(null);
    setNotice(null);

    if (sendMode !== 'now') {
      setNotice(
        sendMode === 'schedule'
          ? 'Scheduling isn’t available yet. Send now for the moment.'
          : 'Saving drafts isn’t available yet. Send now for the moment.',
      );
      return;
    }

    const pending = emailInput.trim().toLowerCase();
    const allRecipients =
      pending && isValidEmail(pending) && !recipients.includes(pending)
        ? [...recipients, pending]
        : recipients;

    const bodyText = editorRef.current?.innerText.trim() ?? '';
    const bodyHtml = editorRef.current?.innerHTML ?? '';

    if (!subject.trim()) return setError('A subject line is required.');
    if (!bodyText) return setError('A message body is required.');
    if (allRecipients.length === 0)
      return setError('Add at least one recipient email address.');

    // Group modes label the send; typed modes let the backend derive the label.
    const audienceLabel = typedMode ? undefined : audienceMode;

    setSending(true);
    try {
      const res = await fetch('/api/communications/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: internalName.trim() || undefined,
          subject: subject.trim(),
          body: bodyText,
          bodyHtml,
          audienceLabel,
          recipients: allRecipients,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;
        const message = Array.isArray(data?.message)
          ? data?.message.join(', ')
          : data?.message;
        throw new Error(message || `Send failed (${res.status}).`);
      }

      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.');
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-7 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">New Manual Email</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Send a one-time email to your selected audience.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 divide-y divide-gray-100 overflow-y-auto px-7">
          {/* Email Details */}
          <section className="py-4">
            <SectionHeader
              icon={<Mail size={17} className="text-gray-500" />}
              title="Email Details"
              open={open.details}
              onToggle={() => toggle('details')}
            />
            {open.details && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={LABEL_CLASS}>Internal Email Name</label>
                  <input
                    type="text"
                    value={internalName}
                    onChange={(e) => setInternalName(e.target.value)}
                    placeholder="e.g. June Office Announcement"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>
                    Subject Line <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Important update for {{Office Name}} agents"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Body</label>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
                      <ToolbarBtn label="B" bold onClick={() => exec('bold')} />
                      <ToolbarBtn label="I" italic onClick={() => exec('italic')} />
                      <ToolbarBtn label="U" underline onClick={() => exec('underline')} />
                      <ToolbarBtn label="H1" onClick={() => exec('formatBlock', 'h1')} />
                      <ToolbarBtn label="H2" onClick={() => exec('formatBlock', 'h2')} />
                      <ToolbarBtn label="List" onClick={() => exec('insertUnorderedList')} />
                      <ToolbarBtn
                        label="Link"
                        onClick={() => {
                          const url = window.prompt('Link URL')?.trim();
                          if (!url) return;
                          // Only allow safe schemes; block javascript:/data: etc.
                          if (/^(https?:|mailto:)/i.test(url)) {
                            exec('createLink', url);
                          } else {
                            window.alert(
                              'Only http(s) and mailto links are allowed.',
                            );
                          }
                        }}
                      />

                      <div ref={mergeMenuRef} className="relative ml-auto">
                        <button
                          type="button"
                          onClick={() => setMergeOpen((o) => !o)}
                          className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          <Braces size={14} />
                          Merge Field
                        </button>
                        {mergeOpen && (
                          <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {MERGE_FIELDS.map((token) => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => insertMergeField(token)}
                                className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {token}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Editable area */}
                    <div className="relative">
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={refreshEditorState}
                        className="prose-editor min-h-[150px] max-h-[280px] overflow-y-auto px-3 py-2.5 text-sm text-gray-900 focus:outline-none"
                      />
                      {bodyEmpty && (
                        <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-gray-400">
                          Hi {'{{First Name}}'},
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Merge Fields */}
          <section className="py-4">
            <SectionHeader
              icon={<Link2 size={17} className="text-gray-500" />}
              title="Merge Fields"
              open={open.merge}
              onToggle={() => toggle('merge')}
            />
            {open.merge && (
              <div className="mt-3">
                <p className="mb-2 text-sm text-gray-500">
                  Insert a token into the subject or body. Personalization is
                  filled per-recipient once the workspace model lands; tokens are
                  sent literally until then.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MERGE_FIELDS.map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertMergeField(token)}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600 hover:bg-gray-100"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Audience */}
          <section className="py-4">
            <SectionHeader
              title="Audience"
              open={open.audience}
              onToggle={() => toggle('audience')}
            />
            {open.audience && (
              <div className="mt-3">
                <p className="mb-3 text-sm text-gray-500">
                  Select who receives this email. Options respect your visibility
                  scope.
                </p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_MODES.map((mode) => {
                    const selected = mode === audienceMode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAudienceMode(mode)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>

                {/* Deliverable recipients (typed emails). Always available since
                    group audiences can't be resolved to addresses yet. */}
                <div className="mt-4">
                  <label className={LABEL_CLASS}>
                    Deliver to{' '}
                    <span className="text-gray-400">(email addresses)</span>
                  </label>
                  <div
                    className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-gray-200 px-3 py-2"
                    onClick={() => emailInputRef.current?.focus()}
                  >
                    {recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecipients((prev) =>
                              prev.filter((r) => r !== email),
                            );
                          }}
                          className="text-teal-600 hover:text-teal-900"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={emailInputRef}
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleEmailKeyDown}
                      onBlur={() => emailInput.trim() && addRecipient(emailInput)}
                      placeholder={recipients.length ? '' : 'Add email…'}
                      className="min-w-[140px] flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {typedMode
                      ? 'Press Enter or comma to add an email.'
                      : `“${audienceMode}” resolution arrives with the workspace model. Enter recipient addresses directly for now (they’ll show as “To ${audienceMode}”).`}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Send Options */}
          <section className="py-4">
            <SectionHeader
              icon={<Send size={16} className="text-gray-500" />}
              title="Send Options"
              open={open.send}
              onToggle={() => toggle('send')}
            />
            {open.send && (
              <div className="mt-3">
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      ['now', 'Send Now'],
                      ['schedule', 'Schedule for Later'],
                      ['draft', 'Save Draft'],
                    ] as [SendMode, string][]
                  ).map(([mode, label]) => {
                    const selected = sendMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setSendMode(mode);
                          setNotice(null);
                        }}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {sendMode === 'schedule' && (
                  <div className="mt-3">
                    <label className={LABEL_CLASS}>Send at</label>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className={INPUT_CLASS}
                    />
                    <p className="mt-1.5 text-xs text-amber-600">
                      Scheduling isn’t wired up yet. This is a preview of the
                      option.
                    </p>
                  </div>
                )}
                {sendMode === 'draft' && (
                  <p className="mt-3 text-xs text-amber-600">
                    Drafts aren’t stored yet. This is a preview of the option.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Preview */}
          <section className="py-4">
            <SectionHeader
              icon={<Eye size={17} className="text-gray-500" />}
              title="Preview"
              open={open.preview}
              onToggle={togglePreview}
            />
            {open.preview && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Subject
                </p>
                <p className="mb-3 text-sm font-medium text-gray-900">
                  {subject.trim() || (
                    <span className="text-gray-400">No subject yet</span>
                  )}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Body
                </p>
                {previewHtml.replace(/<[^>]*>/g, '').trim() ? (
                  <div
                    className="prose-editor mt-1 text-sm text-gray-900"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-400">No body yet</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-7 py-4">
          {(error || notice) && (
            <p
              className={`mb-3 rounded-lg px-3 py-2 text-sm ${
                error
                  ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {error || notice}
            </p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setNotice('Saving drafts isn’t available yet.')
                }
                disabled={sending}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                <Send size={15} />
                {sending ? 'Sending…' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  bold,
  italic,
  underline,
}: {
  label: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-sm text-gray-600 hover:bg-gray-200 ${
        bold ? 'font-bold' : ''
      } ${italic ? 'italic' : ''} ${underline ? 'underline' : ''}`}
    >
      {label}
    </button>
  );
}

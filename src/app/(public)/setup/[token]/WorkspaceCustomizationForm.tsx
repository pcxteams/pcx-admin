'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, CheckCircle, Send } from 'lucide-react';

const REDIRECT_DELAY_MS = 3000;

interface Leader {
  name: string;
  email: string;
}

interface QuickLink {
  _key: string;
  label: string;
  url: string;
}

interface Video {
  _key: string;
  title: string;
  source: 'YouTube' | 'Vimeo';
  url: string;
}

interface CustomResource {
  _key: string;
  name: string;
  type: 'Link' | 'Document';
  url: string;
  videoUrl: string;
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function SectionHeader({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-900">{n}. {title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function WorkspaceCustomizationForm({
  token,
  workspaceName,
  leaders,
}: {
  token: string;
  workspaceName: string;
  leaders: Leader[];
}) {
  const uid = useId();
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState<'/login' | '/'>('/login');

  const [mlsWebsite, setMlsWebsite] = useState('');
  const [boardOfRealtorsWebsite, setBoardOfRealtorsWebsite] = useState('');
  const [trainingCalendarUrl, setTrainingCalendarUrl] = useState('');
  const [officeCrmUrl, setOfficeCrmUrl] = useState('');
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [resources, setResources] = useState<CustomResource[]>([]);

  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedLeaders, setSelectedLeaders] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function validateUrl(key: string, value: string) {
    setUrlErrors((prev) => {
      if (!value.trim() || isValidUrl(value)) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: 'Must be a valid URL (e.g. https://example.com)' };
    });
  }

  function urlInputClass(key: string) {
    return urlErrors[key] ? INPUT.replace('border-gray-200', 'border-red-400') : INPUT;
  }

  function addQuickLink() {
    setQuickLinks((prev) => [...prev, { _key: `${uid}-ql-${Date.now()}`, label: '', url: '' }]);
  }
  function updateQuickLink(index: number, patch: Partial<QuickLink>) {
    setQuickLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function removeQuickLink(index: number) {
    setQuickLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function addVideo() {
    setVideos((prev) => [...prev, { _key: `${uid}-vid-${Date.now()}`, title: '', source: 'YouTube', url: '' }]);
  }
  function updateVideo(index: number, patch: Partial<Video>) {
    setVideos((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }
  function removeVideo(index: number) {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  }

  function addResource() {
    setResources((prev) => [...prev, { _key: `${uid}-res-${Date.now()}`, name: '', type: 'Link', url: '', videoUrl: '' }]);
  }
  function updateResource(index: number, patch: Partial<CustomResource>) {
    setResources((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeResource(index: number) {
    setResources((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleLeader(email: string) {
    setSelectedLeaders((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  async function handleSendInvites() {
    setIsSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/workspace-customization/${token}/invite-leaders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaders: leaders.filter((l) => selectedLeaders.has(l.email)),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setSendError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setSendError('Network error. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (!mlsWebsite.trim()) { setSubmitError('MLS is required.'); return; }
    if (!boardOfRealtorsWebsite.trim()) { setSubmitError('Board of Realtors is required.'); return; }
    if (!trainingCalendarUrl.trim()) { setSubmitError('Training Calendar is required.'); return; }
    if (!officeCrmUrl.trim()) { setSubmitError('Office CRM is required.'); return; }

    const urlFields: [string, string][] = [
      ['mlsWebsite', mlsWebsite],
      ['boardOfRealtorsWebsite', boardOfRealtorsWebsite],
      ['trainingCalendarUrl', trainingCalendarUrl],
      ['officeCrmUrl', officeCrmUrl],
      ...quickLinks.map((l): [string, string] => [`quickLink-${l._key}`, l.url]),
      ...videos.map((v): [string, string] => [`video-${v._key}`, v.url]),
      ...resources.map((r): [string, string] => [`resource-${r._key}`, r.url]),
    ];
    const newUrlErrors: Record<string, string> = {};
    for (const [key, val] of urlFields) {
      if (val.trim() && !isValidUrl(val)) {
        newUrlErrors[key] = 'Must be a valid URL (e.g. https://example.com)';
      }
    }
    if (Object.keys(newUrlErrors).length > 0) {
      setUrlErrors(newUrlErrors);
      setSubmitError('Please fix the invalid URLs before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace-customization/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mlsWebsite: mlsWebsite.trim(),
          boardOfRealtorsWebsite: boardOfRealtorsWebsite.trim(),
          trainingCalendarUrl: trainingCalendarUrl.trim(),
          officeCrmUrl: officeCrmUrl.trim(),
          additionalLinks: quickLinks
            .filter((l) => l.label.trim() && l.url.trim())
            .map(({ label, url }) => ({ label, url })),
          videos: videos
            .filter((v) => v.title.trim() && v.url.trim())
            .map(({ title, source, url }) => ({ title, source, url })),
          resources: resources
            .filter((r) => r.name.trim() && r.url.trim())
            .map(({ name, type, url, videoUrl }) => ({
              name,
              type,
              url,
              videoUrl: videoUrl.trim() || undefined,
            })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setSubmitError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Same pattern as activate/[token]: redirect after a short delay rather
  // than auto-logging anyone in. This page is anonymous/public, so there's
  // normally no session — but check anyway (e.g. a PCx admin testing this
  // flow in a browser where they're already signed in) rather than always
  // bouncing to /login. The session check is resolved *before* the countdown
  // starts so the timer's target is already final by the time it fires.
  useEffect(() => {
    if (!submitted) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    fetch('/api/auth/get-session', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (cancelled) return;
        const target = session?.user ? '/' : '/login';
        setRedirectTo(target);
        timer = setTimeout(() => router.push(target), REDIRECT_DELAY_MS);
      })
      .catch(() => {
        if (cancelled) return;
        timer = setTimeout(() => router.push('/login'), REDIRECT_DELAY_MS);
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [submitted, router]);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full px-8 py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-teal-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">You&apos;re All Set!</h1>
          <p className="text-sm text-gray-500">
            {workspaceName} has been created and your workspace customization has been saved.
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Redirecting you to {redirectTo === '/' ? 'Home' : 'Sign In'}…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Workspace Customization</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure the links, videos, and resources available to your workspace.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Want a leader to complete this form instead?{' '}
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="text-teal-600 font-medium underline"
            >
              Invite your leaders to fill out customization details.
            </button>
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-5">
        {/* Invite leaders panel */}
        {inviteOpen && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-base font-semibold text-gray-900">Invite leaders to complete this form</h2>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            {sent ? (
              <p className="text-sm text-green-600 mt-3">Invitation sent — selected leaders will receive an email shortly.</p>
            ) : leaders.length === 0 ? (
              <p className="text-sm text-gray-400 mt-3">No leaders were added in the Leadership Team section.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  Select one or more leaders. They&apos;ll receive an email with a link to customize this workspace.
                </p>
                <div className="space-y-2 mb-4">
                  {leaders.map((leader) => {
                    const checked = selectedLeaders.has(leader.email);
                    return (
                      <label
                        key={leader.email}
                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                          checked ? 'border-teal-500 bg-teal-50/50' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLeader(leader.email)}
                          className="accent-teal-600 w-4 h-4"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{leader.name}</p>
                          <p className="text-xs text-gray-400">{leader.email}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {sendError && <p className="text-sm text-red-600 mb-3">{sendError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendInvites}
                    disabled={isSending || selectedLeaders.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                    {isSending ? 'Sending…' : 'Send Form'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteOpen(false)}
                    disabled={isSending}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Section 1 — Required Links */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader n={1} title="Required Links" subtitle="These links are required before the form can be submitted." />
          <div className="space-y-4">
            <div>
              <label className={LABEL}>MLS <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={mlsWebsite}
                onChange={(e) => setMlsWebsite(e.target.value)}
                onBlur={() => validateUrl('mlsWebsite', mlsWebsite)}
                placeholder="https://mls.example.com"
                className={urlInputClass('mlsWebsite')}
              />
              {urlErrors['mlsWebsite'] && <p className="mt-1 text-xs text-red-500">{urlErrors['mlsWebsite']}</p>}
            </div>
            <div>
              <label className={LABEL}>Board of Realtors <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={boardOfRealtorsWebsite}
                onChange={(e) => setBoardOfRealtorsWebsite(e.target.value)}
                onBlur={() => validateUrl('boardOfRealtorsWebsite', boardOfRealtorsWebsite)}
                placeholder="https://bor.example.com"
                className={urlInputClass('boardOfRealtorsWebsite')}
              />
              {urlErrors['boardOfRealtorsWebsite'] && <p className="mt-1 text-xs text-red-500">{urlErrors['boardOfRealtorsWebsite']}</p>}
            </div>
            <div>
              <label className={LABEL}>Training Calendar <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={trainingCalendarUrl}
                onChange={(e) => setTrainingCalendarUrl(e.target.value)}
                onBlur={() => validateUrl('trainingCalendarUrl', trainingCalendarUrl)}
                placeholder="https://calendar.google.com/…"
                className={urlInputClass('trainingCalendarUrl')}
              />
              {urlErrors['trainingCalendarUrl'] && <p className="mt-1 text-xs text-red-500">{urlErrors['trainingCalendarUrl']}</p>}
            </div>
            <div>
              <label className={LABEL}>Office CRM <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={officeCrmUrl}
                onChange={(e) => setOfficeCrmUrl(e.target.value)}
                onBlur={() => validateUrl('officeCrmUrl', officeCrmUrl)}
                placeholder="https://crm.example.com"
                className={urlInputClass('officeCrmUrl')}
              />
              {urlErrors['officeCrmUrl'] && <p className="mt-1 text-xs text-red-500">{urlErrors['officeCrmUrl']}</p>}
            </div>
          </div>
        </div>

        {/* Section 2 — Custom Quick Links */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            n={2}
            title="Custom Quick Links"
            subtitle='Add shortcuts your team uses regularly — e.g. your agent portal, showing software, transaction management system.'
          />
          <div className="space-y-3">
            {quickLinks.map((link, i) => {
              const urlKey = `quickLink-${link._key}`;
              return (
                <div key={link._key} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Link {i + 1}</span>
                    <button type="button" onClick={() => removeQuickLink(i)} className="text-gray-400 hover:text-gray-600">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Link Label</label>
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateQuickLink(i, { label: e.target.value })}
                        placeholder='e.g. "Agent Portal"'
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>URL</label>
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateQuickLink(i, { url: e.target.value })}
                        onBlur={() => validateUrl(urlKey, link.url)}
                        placeholder="https://…"
                        className={urlInputClass(urlKey)}
                      />
                      {urlErrors[urlKey] && <p className="mt-1 text-xs text-red-500">{urlErrors[urlKey]}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addQuickLink}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <Plus size={14} />
              Add Quick Link
            </button>
          </div>
        </div>

        {/* Section 3 — Custom Videos */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            n={3}
            title="Custom Videos"
            subtitle="Upload or link to videos for your workspace — e.g. a welcome video, office orientation, or market update."
          />
          <div className="space-y-3">
            {videos.map((video, i) => {
              const urlKey = `video-${video._key}`;
              return (
                <div key={video._key} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Video {i + 1}</span>
                    <button type="button" onClick={() => removeVideo(i)} className="text-gray-400 hover:text-gray-600">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={LABEL}>Video Title</label>
                      <input
                        type="text"
                        value={video.title}
                        onChange={(e) => updateVideo(i, { title: e.target.value })}
                        placeholder="e.g. Welcome from the Team"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Source</label>
                      <select
                        value={video.source}
                        onChange={(e) => updateVideo(i, { source: e.target.value as Video['source'] })}
                        className={INPUT}
                      >
                        <option value="YouTube">YouTube</option>
                        <option value="Vimeo">Vimeo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>{video.source} URL</label>
                    <input
                      type="text"
                      value={video.url}
                      onChange={(e) => updateVideo(i, { url: e.target.value })}
                      onBlur={() => validateUrl(urlKey, video.url)}
                      placeholder="https://youtube.com/watch?v=…"
                      className={urlInputClass(urlKey)}
                    />
                    {urlErrors[urlKey] && <p className="mt-1 text-xs text-red-500">{urlErrors[urlKey]}</p>}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addVideo}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <Plus size={14} />
              Add Video
            </button>
          </div>
        </div>

        {/* Section 4 — Custom Resources */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            n={4}
            title="Custom Resources"
            subtitle="Add documents, links, files, or folders for your team — e.g. agent handbook, scripts, listing presentations."
          />
          <div className="space-y-3">
            {resources.map((resource, i) => {
              const urlKey = `resource-${resource._key}`;
              return (
                <div key={resource._key} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Resource {i + 1}</span>
                    <button type="button" onClick={() => removeResource(i)} className="text-gray-400 hover:text-gray-600">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>Resource Name</label>
                      <input
                        type="text"
                        value={resource.name}
                        onChange={(e) => updateResource(i, { name: e.target.value })}
                        placeholder="e.g. Agent Handbook"
                        className={INPUT}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Resource Type</label>
                        <select
                          value={resource.type}
                          onChange={(e) => updateResource(i, { type: e.target.value as CustomResource['type'] })}
                          className={INPUT}
                        >
                          <option value="Link">Link</option>
                          <option value="Document">Document</option>
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>URL</label>
                        <input
                          type="text"
                          value={resource.url}
                          onChange={(e) => updateResource(i, { url: e.target.value })}
                          onBlur={() => validateUrl(urlKey, resource.url)}
                          placeholder="https://…"
                          className={urlInputClass(urlKey)}
                        />
                        {urlErrors[urlKey] && <p className="mt-1 text-xs text-red-500">{urlErrors[urlKey]}</p>}
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Optional Video URL</label>
                      <input
                        type="text"
                        value={resource.videoUrl}
                        onChange={(e) => updateResource(i, { videoUrl: e.target.value })}
                        placeholder="https://youtube.com/… or https://vimeo.com/…"
                        className={INPUT}
                      />
                      <p className="mt-1 text-xs text-gray-400">Attach a walkthrough or explainer video to this resource.</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addResource}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <Plus size={14} />
              Add Resource
            </button>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {submitError ? (
            <p className="flex-1 text-sm text-red-600">{submitError}</p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => window.close()}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? 'Submitting…' : (
                <>
                  <CheckCircle size={14} />
                  Submit Workspace Customization
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

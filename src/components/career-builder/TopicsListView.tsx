'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Trophy, GripVertical } from 'lucide-react';
import {
  topicsApiBase, sectionCountLabel,
  type CareerBuilderScope, type TopicSummary,
} from '@/lib/career-builder';
import TopicFormModal from './TopicFormModal';
import { TopicIcon } from './TopicIcon';

export default function TopicsListView({ scope, basePath }: { scope: CareerBuilderScope; basePath: string }) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Mouse-driven reordering (not native HTML5 drag-and-drop — see
  // TopicDetailView.tsx for why). `overId` drives the live drop-target
  // highlight; the actual drop decision hit-tests the cursor position
  // directly at mouseup, via refs so the listener (attached once) always
  // sees the latest dragged id.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const handleDropRef = useRef<(sourceId: string, targetId: string) => void>(() => {});
  // A card's onClick navigates to it; if the mouseup that ends a drag lands
  // back on a card, guard against that same gesture also firing a
  // navigation click for whatever's under the cursor at that moment.
  const justDraggedRef = useRef(false);
  // `setTopics` updater functions run asynchronously (React batches state
  // updates from native window listeners), so a value only assigned inside
  // one can't be read synchronously right after the setTopics(...) call —
  // it's still the pre-update value. This ref is the current `topics`,
  // always in sync, safe to read synchronously from event handlers.
  const topicsRef = useRef<TopicSummary[]>([]);
  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(topicsApiBase(scope), { credentials: 'include', signal });
        if (!res.ok) {
          setError('Failed to load Career Builder. Please try again.');
          return;
        }
        setTopics((await res.json()) as TopicSummary[]);
      } catch {
        if (!signal?.aborted) setError('Network error. Please check your connection.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  /**
   * Own-scope reordering only: a topic not owned by this exact scope (a
   * global master topic showing up in a workspace's mixed list) can't be
   * dragged here — the workspace-scoped reorder endpoint 400s on anything
   * outside its own topics, and master topics keep their own separate order,
   * set from the master-only Content Library page instead.
   */
  function isOwnScope(t: TopicSummary): boolean {
    return scope.kind === 'master' ? t.isMasterContent && !t.workspaceId : !t.isMasterContent || !!t.workspaceId;
  }

  async function handleDrop(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    // Read the ref, not `topics` — this function is invoked from a native
    // window "mouseup" listener queued through a ref, where the `topics` in
    // this function's own closure can be stale.
    const previous = topicsRef.current;
    const source = previous.find((t) => t.id === sourceId);
    const target = previous.find((t) => t.id === targetId);
    if (!source || !target || !isOwnScope(source) || !isOwnScope(target)) return;

    const ownIds = previous.filter(isOwnScope).map((t) => t.id);
    const from = ownIds.indexOf(sourceId);
    const to = ownIds.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...ownIds];
    reordered.splice(from, 1);
    reordered.splice(to, 0, sourceId);

    const ownIdSet = new Set(ownIds);
    const byId = new Map(previous.map((t) => [t.id, t]));
    let cursor = 0;
    const next = previous.map((t) => (ownIdSet.has(t.id) ? byId.get(reordered[cursor++])! : t));
    topicsRef.current = next;
    setTopics(next);

    const res = await fetch(`${topicsApiBase(scope)}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderedIds: reordered }),
    });
    if (!res.ok) {
      topicsRef.current = previous;
      setTopics(previous);
    }
  }

  useEffect(() => {
    dragIdRef.current = dragId;
  }, [dragId]);
  useEffect(() => {
    handleDropRef.current = handleDrop;
  });

  useEffect(() => {
    function hitTest(clientX: number, clientY: number): string | null {
      const el = document.elementFromPoint(clientX, clientY);
      return (el?.closest('[data-topic-id]') as HTMLElement | null)?.dataset.topicId ?? null;
    }
    function onMouseMove(e: MouseEvent) {
      if (!dragIdRef.current) return;
      setOverId(hitTest(e.clientX, e.clientY));
    }
    function onMouseUp(e: MouseEvent) {
      const sourceId = dragIdRef.current;
      if (!sourceId) return;
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
      const targetId = hitTest(e.clientX, e.clientY);
      if (targetId) handleDropRef.current(sourceId, targetId);
      setDragId(null);
      setOverId(null);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {scope.kind === 'master' ? 'Content Library' : 'Career Builder'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {scope.kind === 'master'
              ? 'Master topics, visible to every workspace, present and future.'
              : 'Build and manage the skills, content, and certifications your agents need to succeed.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
        >
          <Plus size={15} />
          Add Topic
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </span>
        ) : (
          `${topics.length} topic${topics.length === 1 ? '' : 's'}`
        )}
      </p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!loading && topics.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
          <Trophy size={22} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No topics yet. Use &ldquo;Add Topic&rdquo; to create the first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => {
            const draggable = isOwnScope(t);
            return (
              <div
                key={t.id}
                data-topic-id={t.id}
                onClick={() => {
                  if (justDraggedRef.current) return;
                  router.push(`${basePath}/${t.id}`);
                }}
                className={`group text-left rounded-xl border bg-white p-5 hover:shadow-sm transition-all cursor-pointer ${
                  dragId === t.id ? 'opacity-40 border-gray-100' : overId === t.id ? 'border-teal-400' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                    <TopicIcon icon={t.icon} />
                  </span>
                  {draggable && (
                    <span
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragId(t.id);
                        setOverId(t.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-200 group-hover:text-gray-300 cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical size={14} />
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900 truncate">{t.title}</p>
                {t.description && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{t.description}</p>
                )}
                <div className="mt-4 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
                  {sectionCountLabel(t.sectionCount, t.stepCount)}
                  {scope.kind === 'workspace' && t.isMasterContent && !t.workspaceId && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 font-medium">
                      All workspaces
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <TopicFormModal
          scope={scope}
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

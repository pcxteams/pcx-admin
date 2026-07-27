'use client';

import { useReducer, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, type DropResult, type DragStart } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Send,
  RotateCcw,
  Plus,
  Eye,
  Pencil,
} from 'lucide-react';
import type { OfficePageContent, OfficePageSectionType } from '@/lib/office-page-content';
import { OFFICE_PAGE_SECTION_TYPES } from '@/lib/office-page-content';
import OfficePageView from '../OfficePageView';
import BuilderCanvas from './BuilderCanvas';
import Inspector from './Inspector';
import { builderReducer, initBuilderState } from './builder-reducer';
import { sectionMeta } from './section-registry';

type Busy = null | 'save' | 'publish' | 'revert';

async function mutate(path: string, method: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export default function OfficePageBuilder({
  workspaceId,
  initialContent,
  pageStatus,
}: {
  workspaceId: string;
  initialContent: OfficePageContent;
  pageStatus: 'draft' | 'published' | 'archived';
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(builderReducer, initialContent, initBuilderState);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [status, setStatus] = useState(pageStatus);
  const [draggingType, setDraggingType] = useState<string | null>(null);

  const base = `/api/workspaces/${workspaceId}/office-page`;

  const onDragStart = useCallback((start: DragStart) => setDraggingType(start.type), []);

  const onDragEnd = useCallback((result: DropResult) => {
    setDraggingType(null);
    const { source, destination, type, draggableId } = result;
    if (!destination) return;

    if (type === 'ROW') {
      dispatch({ type: 'MOVE_ROW', fromIndex: source.index, toIndex: destination.index });
      return;
    }

    if (type === 'COLUMN') {
      const sectionKey = draggableId.slice('section:'.length);
      if (destination.droppableId.startsWith('newrow:')) {
        const rowIndex = parseInt(destination.droppableId.slice('newrow:'.length), 10);
        dispatch({ type: 'MOVE_SECTION_TO_NEW_ROW', sectionKey, rowIndex });
        return;
      }
      const fromRowId = source.droppableId.slice('cols:'.length);
      const toRowId = destination.droppableId.slice('cols:'.length);
      dispatch({
        type: 'MOVE_SECTION_ACROSS',
        fromRowId,
        fromIndex: source.index,
        toRowId,
        toIndex: destination.index,
      });
      return;
    }

    if (type.startsWith('ITEM:')) {
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;
      const sectionKey = type.slice('ITEM:'.length);
      dispatch({ type: 'MOVE_ITEM', sectionKey, fromIndex: source.index, toIndex: destination.index });
    }
  }, []);

  async function handleSave() {
    setBusy('save');
    setError(null);
    try {
      const res = await mutate(`${base}/draft`, 'PATCH', { content: state.content });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? 'Failed to save draft.');
        return;
      }
      dispatch({ type: 'MARK_SAVED' });
    } catch {
      setError('Network error while saving.');
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish() {
    setBusy('publish');
    setError(null);
    try {
      // Persist the current draft first so publish reflects on-screen edits.
      const draftRes = await mutate(`${base}/draft`, 'PATCH', { content: state.content });
      if (!draftRes.ok) {
        const data = (await draftRes.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? 'Failed to save before publishing.');
        return;
      }
      dispatch({ type: 'MARK_SAVED' });
      const res = await mutate(`${base}/publish`, 'POST');
      if (!res.ok) {
        setError('Failed to publish.');
        return;
      }
      setStatus('published');
      router.refresh();
    } catch {
      setError('Network error while publishing.');
    } finally {
      setBusy(null);
    }
  }

  async function handleRevert() {
    setBusy('revert');
    setError(null);
    try {
      const res = await mutate(`${base}/revert`, 'POST');
      if (!res.ok) {
        setError('Failed to revert.');
        return;
      }
      const data = (await res.json()) as { content: OfficePageContent; pageStatus: typeof status };
      dispatch({ type: 'RESET', content: data.content });
      setStatus(data.pageStatus);
    } catch {
      setError('Network error while reverting.');
    } finally {
      setBusy(null);
    }
  }

  function addSection(type: OfficePageSectionType) {
    dispatch({ type: 'ADD_SECTION', sectionType: type });
    setAddOpen(false);
  }

  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="p-6 max-w-7xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspaces/${workspaceId}/office-page`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={13} />
            Exit
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-800">Office Page Builder</h1>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
              status === 'published' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {status}
          </span>
          {state.dirty && <span className="text-[11px] text-amber-600">● Unsaved changes</span>}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.past.length === 0}
            className={`${btn} text-gray-500 hover:bg-gray-100`}
            title="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={state.future.length === 0}
            className={`${btn} text-gray-500 hover:bg-gray-100`}
            title="Redo"
          >
            <Redo2 size={14} />
          </button>
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className={`${btn} text-gray-600 hover:bg-gray-100`}
          >
            {preview ? <Pencil size={14} /> : <Eye size={14} />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleRevert}
            disabled={busy !== null}
            className={`${btn} text-gray-600 hover:bg-gray-100`}
          >
            <RotateCcw size={14} />
            Revert
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy !== null || !state.dirty}
            className={`${btn} bg-gray-800 text-white hover:bg-gray-900`}
          >
            <Save size={14} />
            {busy === 'save' ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={busy !== null}
            className={`${btn} bg-teal-600 text-white hover:bg-teal-700`}
          >
            <Send size={14} />
            {busy === 'publish' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {preview ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
          <OfficePageView content={state.content} />
        </div>
      ) : (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {/* Canvas */}
            <div>
              <BuilderCanvas
                content={state.content}
                selection={state.selection}
                draggingType={draggingType}
                dispatch={dispatch}
              />
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setAddOpen((o) => !o)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:text-teal-600 hover:border-teal-300"
                >
                  <Plus size={15} />
                  Add section
                </button>
                {addOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg p-1">
                    {OFFICE_PAGE_SECTION_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addSection(t)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {sectionMeta(t).label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inspector */}
            <aside className="lg:sticky lg:top-6 h-fit rounded-xl border border-gray-100 bg-white p-4">
              <Inspector selection={state.selection} content={state.content} dispatch={dispatch} />
            </aside>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

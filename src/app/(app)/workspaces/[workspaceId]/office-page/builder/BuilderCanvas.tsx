'use client';

import { Fragment, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Eye, EyeOff, Plus, Rows2, Trash2 } from 'lucide-react';
import type { OfficePageContent, OfficePageItem, OfficePageSection } from '@/lib/office-page-content';
import type { BuilderAction, BuilderSelection } from './builder-reducer';
import { sectionMeta } from './section-registry';
import { groupSectionsIntoRows, sectionSpan } from './section-rows';

/**
 * WYSIWYG builder canvas with responsive rows (v2 Phase 6 port). Sections lay out
 * in rows — the outer list reorders rows (vertical DnD), each row reorders/receives
 * its columns (horizontal DnD, shared `COLUMN` type so a section drags between
 * rows), and each column reorders its items. Every DnD level is a 1-D list. Column
 * widths follow each section's `layout.span`; the responsive stack shows in Preview,
 * while the canvas keeps columns side by side for editing.
 */
export default function BuilderCanvas({
  content,
  selection,
  draggingType,
  dispatch,
}: {
  content: OfficePageContent;
  selection: BuilderSelection;
  draggingType: string | null;
  dispatch: Dispatch<BuilderAction>;
}) {
  const rows = groupSectionsIntoRows(content.sections);
  const lanesActive = draggingType === 'COLUMN';

  return (
    <Droppable droppableId="rows" type="ROW">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col">
          <NewRowLane index={0} active={lanesActive} />
          {rows.map((row, index) => (
            <Fragment key={row.rowId}>
              <RowBlock
                rowId={row.rowId}
                sections={row.sections}
                index={index}
                selection={selection}
                dispatch={dispatch}
              />
              <NewRowLane index={index + 1} active={lanesActive} />
            </Fragment>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

/** Drop target between rows: dropping a section here pulls it into its own new row. */
function NewRowLane({ index, active }: { index: number; active: boolean }) {
  return (
    <Droppable droppableId={`newrow:${index}`} type="COLUMN" direction="horizontal">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`shrink-0 overflow-hidden transition-all ${active ? 'my-1 h-9' : 'h-3'}`}
        >
          {active && (
            <div
              className={`flex h-9 items-center justify-center rounded-xl border border-dashed text-[11px] font-medium transition-colors ${
                snapshot.isDraggingOver
                  ? 'border-teal-400 bg-teal-50 text-teal-600'
                  : 'border-gray-200 text-gray-400'
              }`}
            >
              Drop here for a new row
            </div>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function RowBlock({
  rowId,
  sections,
  index,
  selection,
  dispatch,
}: {
  rowId: string;
  sections: OfficePageSection[];
  index: number;
  selection: BuilderSelection;
  dispatch: Dispatch<BuilderAction>;
}) {
  const multi = sections.length > 1;
  const rowSelected = selection.kind === 'row' && selection.rowId === rowId;
  const spans = sections.map(sectionSpan);
  const commitPair = (i: number, a: number, b: number) => {
    const next = [...spans];
    next[i] = a;
    next[i + 1] = b;
    dispatch({ type: 'SET_ROW_SPANS', rowId, spans: next });
  };

  return (
    <Draggable draggableId={`row:${rowId}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group/row rounded-2xl transition-colors ${
            rowSelected ? 'bg-gray-50/60 ring-1 ring-gray-300' : ''
          } ${snapshot.isDragging ? 'bg-white shadow-xl ring-1 ring-gray-200' : ''}`}
        >
          <div className="flex items-stretch gap-1">
            <span
              {...provided.dragHandleProps}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SELECT', selection: { kind: 'row', rowId } });
              }}
              title={multi ? 'Drag to reorder · click to set the column layout' : 'Drag to reorder'}
              className={`mt-3 flex w-5 shrink-0 cursor-grab items-start justify-center rounded-md py-1 text-gray-300 transition-opacity hover:text-gray-500 active:cursor-grabbing ${
                rowSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
              }`}
            >
              <GripVertical size={16} />
            </span>

            <Droppable droppableId={`cols:${rowId}`} type="COLUMN" direction="horizontal">
              {(dropProvided) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className="flex min-w-0 flex-1 items-stretch gap-3"
                >
                  {sections.map((section, colIndex) => (
                    <SectionColumn
                      key={section.key}
                      section={section}
                      index={colIndex}
                      inRow={multi}
                      grow={multi ? spans[colIndex] : 1}
                      resize={
                        multi && colIndex < sections.length - 1
                          ? {
                              spanA: spans[colIndex],
                              spanB: spans[colIndex + 1],
                              onCommit: (a, b) => commitPair(colIndex, a, b),
                            }
                          : null
                      }
                      selection={selection}
                      dispatch={dispatch}
                    />
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function SectionColumn({
  section,
  index,
  inRow,
  grow,
  resize,
  selection,
  dispatch,
}: {
  section: OfficePageSection;
  index: number;
  inRow: boolean;
  grow: number;
  resize: { spanA: number; spanB: number; onCommit: (a: number, b: number) => void } | null;
  selection: BuilderSelection;
  dispatch: Dispatch<BuilderAction>;
}) {
  const meta = sectionMeta(section.type);
  const selected = selection.kind === 'section' && selection.sectionKey === section.key;

  return (
    <Draggable draggableId={`section:${section.key}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{ ...provided.draggableProps.style, flexGrow: grow, flexBasis: 0, minWidth: 0 }}
          className={`group/section relative rounded-2xl border bg-white p-3 transition-colors ${
            selected ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
          } ${snapshot.isDragging ? 'shadow-xl' : ''} ${section.visible ? '' : 'opacity-70'}`}
        >
          {resize && <ColumnGutter spanA={resize.spanA} spanB={resize.spanB} onCommit={resize.onCommit} />}

          <div className="mb-2 flex items-center gap-2">
            <span
              {...provided.dragHandleProps}
              title="Drag to move, reorder, or combine into a row"
              className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SELECT', selection: { kind: 'section', sectionKey: section.key } });
              }}
              className="min-w-0 truncate text-sm font-semibold text-gray-800 hover:text-gray-950"
            >
              {section.title}
            </button>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
              {meta.label}
            </span>
            <div
              className={`ml-auto flex shrink-0 items-center gap-0.5 transition-opacity ${
                selected ? 'opacity-100' : 'opacity-0 group-hover/section:opacity-100'
              }`}
            >
              {inRow && (
                <button
                  type="button"
                  title="Move to its own row"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'SPLIT_SECTION', sectionKey: section.key });
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Rows2 size={15} />
                </button>
              )}
              <button
                type="button"
                title={section.visible ? 'Hide section' : 'Show section'}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'TOGGLE_SECTION_VISIBLE', sectionKey: section.key });
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                type="button"
                title="Delete section"
                onClick={(e) => {
                  e.stopPropagation();
                  if (section.items.length === 0 || confirm(`Delete "${section.title}" and its ${section.items.length} ${meta.itemNoun}(s)?`)) {
                    dispatch({ type: 'REMOVE_SECTION', sectionKey: section.key });
                  }
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <Droppable droppableId={`items:${section.key}`} type={`ITEM:${section.key}`}>
            {(dropProvided) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-1.5">
                {section.items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-300">
                    No {meta.itemNoun}s yet.
                  </p>
                )}
                {section.items.map((item, itemIndex) => (
                  <EditableItem
                    key={item.id}
                    section={section}
                    item={item}
                    index={itemIndex}
                    selected={selection.kind === 'item' && selection.itemId === item.id}
                    dispatch={dispatch}
                  />
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'ADD_ITEM', sectionKey: section.key });
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-1.5 text-xs text-gray-400 hover:border-teal-300 hover:text-teal-600"
          >
            <Plus size={13} />
            Add {meta.itemNoun}
          </button>
        </div>
      )}
    </Draggable>
  );
}

/** Resize handle on a column's right edge — drag (or ←/→) re-slices the two neighbours' shared span. */
function ColumnGutter({
  spanA,
  spanB,
  onCommit,
}: {
  spanA: number;
  spanB: number;
  onCommit: (a: number, b: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const pairSpan = spanA + spanB;

  function beginDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const handle = ref.current;
    const colEl = handle?.parentElement as HTMLElement | null;
    const nextEl = colEl?.nextElementSibling as HTMLElement | null;
    if (!handle || !colEl || !nextEl) return;

    const startX = e.clientX;
    const startWidthA = colEl.offsetWidth;
    const pairPx = startWidthA + nextEl.offsetWidth;
    const minPx = 56;
    let pending: [number, number] = [spanA, spanB];
    handle.setPointerCapture(e.pointerId);
    setDragging(true);

    const cleanup = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {
        // capture may already be gone (e.g. the element unmounted) — ignore
      }
      setDragging(false);
    };
    const onMove = (ev: PointerEvent) => {
      const widthA = Math.min(pairPx - minPx, Math.max(minPx, startWidthA + (ev.clientX - startX)));
      const a = Math.min(pairSpan - 1, Math.max(1, Math.round((widthA / pairPx) * pairSpan)));
      pending = [a, pairSpan - a];
      colEl.style.flexGrow = String(pending[0]);
      nextEl.style.flexGrow = String(pending[1]);
    };
    const onUp = () => {
      cleanup();
      if (pending[0] !== spanA || pending[1] !== spanB) onCommit(pending[0], pending[1]);
    };
    // An interrupted drag (touch cancel, gesture, unmount) never fires pointerup:
    // restore the pre-drag widths so the imperatively-set flexGrow doesn't linger
    // out of sync with reducer state, and always tear down capture + listeners.
    const onCancel = () => {
      colEl.style.flexGrow = String(spanA);
      nextEl.style.flexGrow = String(spanB);
      cleanup();
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const a = Math.min(pairSpan - 1, Math.max(1, spanA + (e.key === 'ArrowRight' ? 1 : -1)));
    if (a !== spanA) onCommit(a, pairSpan - a);
  }

  return (
    <button
      ref={ref}
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize columns"
      title="Drag to resize columns · ←/→ to adjust"
      onPointerDown={beginDrag}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()}
      className={`absolute -right-1.5 top-0 z-20 flex h-full w-3 cursor-col-resize touch-none items-center justify-center transition-opacity ${
        dragging
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100'
      }`}
    >
      <span className={`h-8 w-1 rounded-full transition-colors ${dragging ? 'bg-teal-500' : 'bg-gray-300 hover:bg-teal-500'}`} />
    </button>
  );
}

function EditableItem({
  section,
  item,
  index,
  selected,
  dispatch,
}: {
  section: OfficePageSection;
  item: OfficePageItem;
  index: number;
  selected: boolean;
  dispatch: Dispatch<BuilderAction>;
}) {
  const meta = sectionMeta(section.type);
  return (
    <Draggable draggableId={`item:${section.key}:${item.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'SELECT', selection: { kind: 'item', sectionKey: section.key, itemId: item.id } });
          }}
          className={`group/item flex items-center gap-2 rounded-lg border px-2.5 py-2 bg-white cursor-pointer ${
            selected ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-100 hover:border-gray-200'
          } ${snapshot.isDragging ? 'shadow-md' : ''} ${item.active ? '' : 'opacity-50'}`}
        >
          <span
            {...provided.dragHandleProps}
            className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </span>
          <span className="flex-1 truncate text-sm text-gray-700">{meta.itemTitle(item)}</span>
          <div className={`flex shrink-0 items-center gap-0.5 ${selected ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
            <button
              type="button"
              title={item.active ? 'Hide item' : 'Show item'}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'TOGGLE_ITEM_ACTIVE', sectionKey: section.key, itemId: item.id });
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              {item.active ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button
              type="button"
              title="Delete item"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'REMOVE_ITEM', sectionKey: section.key, itemId: item.id });
              }}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

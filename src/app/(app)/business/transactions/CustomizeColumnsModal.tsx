'use client';

import { useEffect } from 'react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Eye, EyeOff, GripVertical, X } from 'lucide-react';
import type { TransactionColumn } from './columns';

interface Props {
  /** Every column in current order, pinned ones included. */
  columns: TransactionColumn[];
  hidden: string[];
  onOrderChange: (order: string[]) => void;
  onToggle: (columnId: string) => void;
  onReset: () => void;
  onClose: () => void;
}

/**
 * "Customize Columns" — ported from v2's OrganizeColumnsModal, minus its
 * TanStack dependency: it drives the plain column-id order/visibility state
 * this page keeps in localStorage.
 *
 * Pinned columns (Agent Name, Actions) are excluded — they anchor the
 * horizontal scroll, so they can't be moved or hidden.
 */
export default function CustomizeColumnsModal({
  columns,
  hidden,
  onOrderChange,
  onToggle,
  onReset,
  onClose,
}: Props) {
  const movable = columns.filter((c) => !c.pinned);
  const hiddenSet = new Set(hidden);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    const movableIds = movable.map((c) => c.id);
    const reordered = [...movableIds];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    // Splice the reordered subset back into the full order so the pinned
    // columns keep their original slots.
    const movableSet = new Set(movableIds);
    let cursor = 0;
    onOrderChange(columns.map((c) => (movableSet.has(c.id) ? reordered[cursor++] : c.id)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-columns-title"
        className="relative bg-white rounded-2xl shadow-xl w-full mx-4 max-w-lg max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-2 shrink-0">
          <div>
            <h2
              id="customize-columns-title"
              className="text-lg font-semibold text-gray-900"
            >
              Customize Columns
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Drag to reorder. Toggle visibility with the eye icon.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="transaction-columns">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {movable.map((column, index) => {
                    const visible = !hiddenSet.has(column.id);
                    return (
                      <Draggable key={column.id} draggableId={column.id} index={index}>
                        {(drag, snapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            className={`group flex items-center gap-3 px-3 py-2.5 bg-white border rounded-xl transition-shadow cursor-grab active:cursor-grabbing ${
                              snapshot.isDragging
                                ? 'border-gray-300 shadow-lg'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <GripVertical
                              size={15}
                              className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0"
                              aria-hidden="true"
                            />
                            <span
                              className={`flex-1 text-sm font-medium min-w-0 truncate ${
                                visible ? 'text-gray-900' : 'text-gray-400'
                              }`}
                            >
                              {column.header}
                            </span>
                            <button
                              type="button"
                              onClick={() => onToggle(column.id)}
                              onPointerDown={(e) => e.stopPropagation()}
                              aria-label={visible ? `Hide ${column.header}` : `Show ${column.header}`}
                              aria-pressed={visible}
                              className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer ${
                                visible ? 'text-gray-600' : 'text-gray-300'
                              }`}
                            >
                              {visible ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

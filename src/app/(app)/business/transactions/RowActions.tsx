'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

const MENU_WIDTH = 176; // w-44

/**
 * Per-row Edit / Delete menu, ported from v2's ActionMenu on the Numbers page.
 *
 * The menu is portalled to the body rather than positioned inside the row: the
 * table scrolls in an `overflow-x-auto` wrapper (which clips vertically too),
 * and the Actions column is a `sticky` cell, whose stacking context traps any
 * absolutely positioned child underneath the pinned cells of later rows.
 */
export default function RowActions({ onEdit, onDelete }: Props) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = position !== null;

  const close = useCallback(() => setPosition(null), []);

  function toggle() {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 4, left: rect.right - MENU_WIDTH });
  }

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    // Fixed coordinates go stale the moment anything scrolls under them.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={16} />
      </button>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
            className="z-50 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onEdit();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Pencil size={14} className="text-gray-400" />
              Edit Transaction
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={14} className="text-red-400" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

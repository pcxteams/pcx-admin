import type {
  OfficePageContent,
  OfficePageSection,
  OfficePageSectionType,
  RowLayout,
} from '@/lib/office-page-content';
import { sectionMeta } from './section-registry';
import {
  ROW_SPAN_UNITS,
  groupSectionsIntoRows,
  type SectionRowGroup,
} from './section-rows';

/**
 * Builder state machine with responsive row/column layout (v2 Phase 6 port).
 *
 * Sections live in a flat, ordered array; those sharing a `layout.rowId` (and
 * contiguous) render side by side. Every content-mutating op deep-clones, mutates
 * freely, then `commit()` re-derives rows and re-applies the invariants
 * (`normalizeRows`) so a stale single-column layout / missing span / non-`row:` id
 * is always cleaned up in one place. Spans are grow-ratios (no sum-≤-12 rule).
 */

export type BuilderSelection =
  | { kind: 'none' }
  | { kind: 'section'; sectionKey: string }
  | { kind: 'item'; sectionKey: string; itemId: string }
  | { kind: 'row'; rowId: string };

export interface BuilderState {
  content: OfficePageContent;
  selection: BuilderSelection;
  past: OfficePageContent[];
  future: OfficePageContent[];
  savedSnapshot: string;
  dirty: boolean;
  /**
   * Identifies the field currently being edited in a continuous burst (e.g. a
   * text input). Consecutive commits with the same key collapse into one undo
   * entry so typing doesn't flood — and evict — the structural history.
   */
  coalesceKey: string | null;
}

export type SectionPatch = Partial<
  Pick<OfficePageSection, 'title' | 'subtitle' | 'visible' | 'displayLimit'>
>;

export type BuilderAction =
  | { type: 'SELECT'; selection: BuilderSelection }
  | { type: 'ADD_SECTION'; sectionType: OfficePageSectionType }
  | { type: 'REMOVE_SECTION'; sectionKey: string }
  | { type: 'UPDATE_SECTION'; sectionKey: string; patch: SectionPatch }
  | { type: 'TOGGLE_SECTION_VISIBLE'; sectionKey: string }
  | { type: 'MOVE_ROW'; fromIndex: number; toIndex: number }
  | { type: 'MOVE_SECTION_ACROSS'; fromRowId: string; fromIndex: number; toRowId: string; toIndex: number; selection?: BuilderSelection }
  | { type: 'MOVE_SECTION_TO_NEW_ROW'; sectionKey: string; rowIndex: number }
  | { type: 'SPLIT_SECTION'; sectionKey: string }
  | { type: 'SET_ROW_SPANS'; rowId: string; spans: number[] }
  | { type: 'SET_ROW_LAYOUT'; rowId: string; patch: Partial<RowLayout> }
  | { type: 'ADD_ITEM'; sectionKey: string }
  | { type: 'UPDATE_ITEM'; sectionKey: string; itemId: string; patch: Record<string, unknown> }
  | { type: 'TOGGLE_ITEM_ACTIVE'; sectionKey: string; itemId: string }
  | { type: 'MOVE_ITEM'; sectionKey: string; fromIndex: number; toIndex: number }
  | { type: 'REMOVE_ITEM'; sectionKey: string; itemId: string }
  | { type: 'RESET'; content: OfficePageContent }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED'; snapshot?: string };

const HISTORY_LIMIT = 50;
/** A row wider than this gets cramped, so drops that would exceed it are ignored. */
const MAX_COLUMNS_PER_ROW = 4;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
const serialize = (content: OfficePageContent): string => JSON.stringify(content);

/** Row ids get a `row:` prefix so they can never collide with a section `key`. */
function newRowId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `row:${rand}`;
}

function clampSpan(value: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return ROW_SPAN_UNITS;
  return Math.min(ROW_SPAN_UNITS, Math.max(1, n));
}

/**
 * Enforce the invariants on one grouped row: a lone section drops its `layout`
 * (full width); a multi-section row gets a collision-proof `row:` id and a span
 * on every column. `rebalance` resets spans to equal (column added/removed);
 * otherwise existing spans are preserved (in-row reorder keeps the ratio).
 */
function finalizeRowGroup(group: SectionRowGroup, rebalance: boolean): void {
  const { sections } = group;
  if (sections.length <= 1) {
    const only = sections[0];
    if (only) delete only.layout;
    return;
  }
  const rowId = group.rowId.startsWith('row:') ? group.rowId : newRowId();
  group.rowId = rowId;
  const equal = clampSpan(ROW_SPAN_UNITS / sections.length);
  sections.forEach((section) => {
    const keep =
      !rebalance && section.layout?.rowId === rowId && typeof section.layout?.span === 'number';
    const span = keep ? clampSpan(section.layout!.span) : equal;
    const minWidth = section.layout?.minWidth;
    section.layout = minWidth != null ? { rowId, span, minWidth } : { rowId, span };
  });
}

/** Re-derive rows from the flat list, re-apply invariants, prune stale rowLayouts. */
function normalizeRows(content: OfficePageContent): void {
  const groups = groupSectionsIntoRows(content.sections);
  for (const group of groups) finalizeRowGroup(group, false);
  content.sections = groups.flatMap((group) => group.sections);
  if (content.rowLayouts) {
    const multiRowIds = new Set(groups.filter((g) => g.sections.length > 1).map((g) => g.rowId));
    for (const rowId of Object.keys(content.rowLayouts)) {
      if (!multiRowIds.has(rowId)) delete content.rowLayouts[rowId];
    }
    if (Object.keys(content.rowLayouts).length === 0) delete content.rowLayouts;
  }
}

/** normalizeRows + keep `order` aligned with array position. */
function normalize(content: OfficePageContent): OfficePageContent {
  normalizeRows(content);
  content.sections.forEach((section, sIdx) => {
    section.order = sIdx;
    section.items.forEach((item, iIdx) => {
      item.order = iIdx;
    });
  });
  return content;
}

/** On load, array position may differ from the intended `order` — sort first. */
function sortByOrder(content: OfficePageContent): OfficePageContent {
  content.sections.sort((a, b) => a.order - b.order);
  content.sections.forEach((section) => section.items.sort((a, b) => a.order - b.order));
  return content;
}

export function initBuilderState(content: OfficePageContent): BuilderState {
  const normalized = normalize(sortByOrder(deepClone(content)));
  return {
    content: normalized,
    selection: { kind: 'none' },
    past: [],
    future: [],
    savedSnapshot: serialize(normalized),
    dirty: false,
    coalesceKey: null,
  };
}

function findSection(content: OfficePageContent, key: string): OfficePageSection | undefined {
  return content.sections.find((s) => s.key === key);
}

/**
 * After a history jump (undo/redo) the previously-selected node may no longer
 * exist in the restored content — drop the selection so the inspector doesn't
 * silently render blank.
 */
function reconcileSelection(
  content: OfficePageContent,
  selection: BuilderSelection,
): BuilderSelection {
  switch (selection.kind) {
    case 'section':
      return content.sections.some((s) => s.key === selection.sectionKey)
        ? selection
        : { kind: 'none' };
    case 'item': {
      const section = findSection(content, selection.sectionKey);
      return section?.items.some((it) => it.id === selection.itemId)
        ? selection
        : { kind: 'none' };
    }
    case 'row':
      return groupSectionsIntoRows(content.sections).some(
        (g) => g.rowId === selection.rowId && g.sections.length > 1,
      )
        ? selection
        : { kind: 'none' };
    default:
      return selection;
  }
}

function uniqueSectionKey(base: string, sections: OfficePageSection[]): string {
  const used = new Set(sections.map((s) => s.key));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Normalize, then push history + recompute dirty (no-op guarded). When `coalesce`
 * is set and matches the previous commit's key, the change folds into the current
 * history entry instead of pushing a new one — so a burst of keystrokes on one
 * field is a single undo step. Any commit without a matching key starts a fresh
 * entry and resets the coalescing key.
 */
function commit(
  state: BuilderState,
  content: OfficePageContent,
  opts: { selection?: BuilderSelection; coalesce?: string } = {},
): BuilderState {
  const { selection, coalesce } = opts;
  const normalized = normalize(content);
  const serialized = serialize(normalized);
  if (serialized === serialize(state.content)) {
    return selection ? { ...state, selection } : state;
  }
  const coalesced = coalesce != null && state.coalesceKey === coalesce;
  return {
    ...state,
    content: normalized,
    selection: selection ?? state.selection,
    past: coalesced
      ? state.past
      : [...state.past.slice(-(HISTORY_LIMIT - 1)), state.content],
    future: [],
    dirty: serialized !== state.savedSnapshot,
    coalesceKey: coalesce ?? null,
  };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selection: action.selection, coalesceKey: null };

    case 'ADD_SECTION': {
      const content = deepClone(state.content);
      const key = uniqueSectionKey(action.sectionType, content.sections);
      content.sections.push({
        key,
        type: action.sectionType,
        title: sectionMeta(action.sectionType).label,
        order: content.sections.length,
        visible: true,
        lockState: 'editable',
        items: [],
      });
      return commit(state, content, { selection: { kind: 'section', sectionKey: key } });
    }

    case 'REMOVE_SECTION': {
      const content = deepClone(state.content);
      content.sections = content.sections.filter((s) => s.key !== action.sectionKey);
      const sel: BuilderSelection =
        (state.selection.kind === 'section' || state.selection.kind === 'item') &&
        state.selection.sectionKey === action.sectionKey
          ? { kind: 'none' }
          : state.selection;
      return commit(state, content, { selection: sel });
    }

    case 'UPDATE_SECTION': {
      const content = deepClone(state.content);
      const section = findSection(content, action.sectionKey);
      if (!section) return state;
      Object.assign(section, action.patch);
      return commit(state, content, {
        coalesce: `section:${action.sectionKey}:${Object.keys(action.patch).join(',')}`,
      });
    }

    case 'TOGGLE_SECTION_VISIBLE': {
      const content = deepClone(state.content);
      const section = findSection(content, action.sectionKey);
      if (!section) return state;
      section.visible = !section.visible;
      return commit(state, content);
    }

    case 'MOVE_ROW': {
      const content = deepClone(state.content);
      const groups = groupSectionsIntoRows(content.sections);
      if (action.fromIndex < 0 || action.fromIndex >= groups.length) return state;
      const [moved] = groups.splice(action.fromIndex, 1);
      if (!moved) return state;
      const to = Math.max(0, Math.min(action.toIndex, groups.length));
      groups.splice(to, 0, moved);
      content.sections = groups.flatMap((group) => group.sections);
      return commit(state, content);
    }

    case 'MOVE_SECTION_ACROSS': {
      const content = deepClone(state.content);
      const groups = groupSectionsIntoRows(content.sections);
      const from = groups.find((g) => g.rowId === action.fromRowId);
      const to = groups.find((g) => g.rowId === action.toRowId);
      if (!from || !to) return state;
      const sameRow = from === to;
      if (!sameRow && to.sections.length >= MAX_COLUMNS_PER_ROW) return state;
      if (action.fromIndex < 0 || action.fromIndex >= from.sections.length) return state;
      const [moved] = from.sections.splice(action.fromIndex, 1);
      if (!moved) return state;
      const insertAt = Math.max(0, Math.min(action.toIndex, to.sections.length));
      to.sections.splice(insertAt, 0, moved);
      finalizeRowGroup(to, !sameRow);
      if (!sameRow) finalizeRowGroup(from, false);
      content.sections = groups
        .filter((group) => group.sections.length > 0)
        .flatMap((group) => group.sections);
      return commit(state, content, { selection: action.selection ?? { kind: 'section', sectionKey: moved.key } });
    }

    case 'MOVE_SECTION_TO_NEW_ROW': {
      const content = deepClone(state.content);
      const groups = groupSectionsIntoRows(content.sections);
      const fromIdx = groups.findIndex((g) => g.sections.some((s) => s.key === action.sectionKey));
      if (fromIdx < 0) return state;
      const from = groups[fromIdx];
      const secIdx = from.sections.findIndex((s) => s.key === action.sectionKey);
      const [moved] = from.sections.splice(secIdx, 1);
      if (!moved) return state;
      const newGroup: SectionRowGroup = { rowId: moved.key, sections: [moved] };
      const insertAt = Math.max(0, Math.min(action.rowIndex, groups.length));
      groups.splice(insertAt, 0, newGroup);
      finalizeRowGroup(newGroup, false);
      if (from.sections.length > 0) finalizeRowGroup(from, false);
      content.sections = groups
        .filter((group) => group.sections.length > 0)
        .flatMap((group) => group.sections);
      return commit(state, content, { selection: { kind: 'section', sectionKey: moved.key } });
    }

    case 'SPLIT_SECTION': {
      const content = deepClone(state.content);
      const groups = groupSectionsIntoRows(content.sections);
      const fromIdx = groups.findIndex((g) => g.sections.some((s) => s.key === action.sectionKey));
      if (fromIdx < 0) return state;
      const from = groups[fromIdx];
      if (from.sections.length <= 1) return state;
      const secIdx = from.sections.findIndex((s) => s.key === action.sectionKey);
      const [moved] = from.sections.splice(secIdx, 1);
      if (!moved) return state;
      const newGroup: SectionRowGroup = { rowId: moved.key, sections: [moved] };
      const insertAt = secIdx === 0 ? fromIdx : fromIdx + 1;
      groups.splice(insertAt, 0, newGroup);
      finalizeRowGroup(newGroup, false);
      finalizeRowGroup(from, false);
      content.sections = groups
        .filter((group) => group.sections.length > 0)
        .flatMap((group) => group.sections);
      return commit(state, content, { selection: { kind: 'section', sectionKey: moved.key } });
    }

    case 'SET_ROW_SPANS': {
      const content = deepClone(state.content);
      const groups = groupSectionsIntoRows(content.sections);
      const group = groups.find((g) => g.rowId === action.rowId);
      if (!group || group.sections.length < 2) return state;
      if (action.spans.length !== group.sections.length) return state;
      group.sections.forEach((section, i) => {
        const minWidth = section.layout?.minWidth;
        const span = clampSpan(action.spans[i]);
        section.layout =
          minWidth != null ? { rowId: action.rowId, span, minWidth } : { rowId: action.rowId, span };
      });
      return commit(state, content);
    }

    case 'SET_ROW_LAYOUT': {
      const content = deepClone(state.content);
      const groups = groupSectionsIntoRows(content.sections);
      const group = groups.find((g) => g.rowId === action.rowId);
      if (!group || group.sections.length < 2) return state;
      const layouts = content.rowLayouts ?? {};
      const merged: RowLayout = { ...(layouts[action.rowId] ?? {}), ...action.patch };
      (Object.keys(merged) as (keyof RowLayout)[]).forEach((k) => {
        if (merged[k] === undefined) delete merged[k];
      });
      if (Object.keys(merged).length === 0) delete layouts[action.rowId];
      else layouts[action.rowId] = merged;
      content.rowLayouts = Object.keys(layouts).length > 0 ? layouts : undefined;
      return commit(state, content, { selection: { kind: 'row', rowId: action.rowId } });
    }

    case 'ADD_ITEM': {
      const content = deepClone(state.content);
      const section = findSection(content, action.sectionKey);
      if (!section) return state;
      const item = sectionMeta(section.type).createItem(section.items.length);
      section.items.push(item);
      return commit(state, content, {
        selection: { kind: 'item', sectionKey: action.sectionKey, itemId: item.id },
      });
    }

    case 'UPDATE_ITEM': {
      const content = deepClone(state.content);
      const section = findSection(content, action.sectionKey);
      const item = section?.items.find((it) => it.id === action.itemId);
      if (!item) return state;
      Object.assign(item, action.patch);
      return commit(state, content, {
        coalesce: `item:${action.sectionKey}:${action.itemId}:${Object.keys(action.patch).join(',')}`,
      });
    }

    case 'TOGGLE_ITEM_ACTIVE': {
      const content = deepClone(state.content);
      const section = findSection(content, action.sectionKey);
      const item = section?.items.find((it) => it.id === action.itemId);
      if (!item) return state;
      item.active = !item.active;
      return commit(state, content);
    }

    case 'MOVE_ITEM': {
      const content = deepClone(state.content);
      const section = findSection(content, action.sectionKey);
      if (!section) return state;
      const items = section.items;
      if (action.fromIndex < 0 || action.fromIndex >= items.length) return state;
      const [moved] = items.splice(action.fromIndex, 1);
      if (!moved) return state;
      items.splice(Math.max(0, Math.min(action.toIndex, items.length)), 0, moved);
      return commit(state, content);
    }

    case 'REMOVE_ITEM': {
      const content = deepClone(state.content);
      const section = findSection(content, action.sectionKey);
      if (!section) return state;
      section.items = section.items.filter((it) => it.id !== action.itemId);
      return commit(state, content, { selection: { kind: 'section', sectionKey: action.sectionKey } });
    }

    case 'RESET':
      return initBuilderState(deepClone(action.content));

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        content: previous,
        selection: reconcileSelection(previous, state.selection),
        past: state.past.slice(0, -1),
        future: [state.content, ...state.future].slice(0, HISTORY_LIMIT),
        dirty: serialize(previous) !== state.savedSnapshot,
        coalesceKey: null,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const nextContent = state.future[0];
      return {
        ...state,
        content: nextContent,
        selection: reconcileSelection(nextContent, state.selection),
        past: [...state.past, state.content].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        dirty: serialize(nextContent) !== state.savedSnapshot,
        coalesceKey: null,
      };
    }

    case 'MARK_SAVED': {
      // Snapshot the content that was actually persisted (passed by the caller),
      // not the reducer's current content — edits made while the save was in
      // flight must stay dirty rather than be silently marked saved.
      const snapshot = action.snapshot ?? serialize(state.content);
      return {
        ...state,
        savedSnapshot: snapshot,
        dirty: serialize(state.content) !== snapshot,
      };
    }

    default:
      return state;
  }
}

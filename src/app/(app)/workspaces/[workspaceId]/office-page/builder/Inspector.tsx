'use client';

import { Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import type { Dispatch } from 'react';
import type {
  OfficePageAction,
  OfficePageActionType,
  OfficePageItem,
  OfficePageContent,
} from '@/lib/office-page-content';
import type { RowLayout, RowTemplate } from '@/lib/office-page-content';
import type { BuilderAction, BuilderSelection } from './builder-reducer';
import { sectionMeta, type InspectorField } from './section-registry';
import { groupSectionsIntoRows, sectionSpan, rowTemplate, templatePlacement } from './section-rows';
import { ICON_OPTIONS, iconFor } from '../office-icons';

const LABEL = 'block text-[11px] font-semibold tracking-wide text-gray-500 uppercase mb-1';
const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

function get(item: OfficePageItem, key: string): unknown {
  return (item as unknown as Record<string, unknown>)[key];
}

function ActionField({
  field,
  value,
  onChange,
}: {
  field: InspectorField;
  value: OfficePageAction | undefined;
  onChange: (next: OfficePageAction) => void;
}) {
  const action: OfficePageAction = value ?? { type: field.actionTypes?.[0] ?? 'url' };
  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={action.type}
          onChange={(e) => onChange({ ...action, type: e.target.value as OfficePageActionType })}
          className={INPUT}
        >
          {(field.actionTypes ?? ['url']).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={action.openBehavior ?? 'new_tab'}
          onChange={(e) =>
            onChange({ ...action, openBehavior: e.target.value as OfficePageAction['openBehavior'] })
          }
          className={INPUT}
        >
          <option value="new_tab">New tab</option>
          <option value="same_tab">Same tab</option>
          <option value="popup">Popup</option>
        </select>
      </div>
      <input
        type="text"
        value={action.destination ?? ''}
        placeholder="Destination (URL, route, email…)"
        onChange={(e) => onChange({ ...action, destination: e.target.value })}
        className={INPUT}
      />
      {field.actionShowLabel && (
        <input
          type="text"
          value={action.label ?? ''}
          placeholder="Link label"
          onChange={(e) => onChange({ ...action, label: e.target.value })}
          className={INPUT}
        />
      )}
    </div>
  );
}

function FieldInput({
  field,
  item,
  onPatch,
}: {
  field: InspectorField;
  item: OfficePageItem;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const raw = get(item, field.key);

  switch (field.kind) {
    case 'textarea':
      return (
        <textarea
          value={typeof raw === 'string' ? raw : ''}
          placeholder={field.placeholder}
          rows={3}
          onChange={(e) => onPatch({ [field.key]: e.target.value })}
          className={INPUT}
        />
      );
    case 'boolean':
      return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(raw)}
            onChange={(e) => onPatch({ [field.key]: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          {field.label}
        </label>
      );
    case 'color':
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.swatches ?? []).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPatch({ [field.key]: c })}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full border-2 transition ${
                raw === c ? 'border-gray-900' : 'border-transparent hover:border-gray-300'
              }`}
              aria-label={c}
            />
          ))}
        </div>
      );
    case 'action':
      return (
        <ActionField
          field={field}
          value={raw as OfficePageAction | undefined}
          onChange={(next) => onPatch({ [field.key]: next })}
        />
      );
    case 'icon': {
      const current = iconFor(typeof raw === 'string' ? raw : undefined);
      return (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            title="No icon"
            onClick={() => onPatch({ [field.key]: '' })}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[9px] font-medium transition ${
              !current ? 'border-gray-900 text-gray-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            None
          </button>
          {ICON_OPTIONS.map((opt) => {
            const Icon = iconFor(opt.name)!;
            const active = current === Icon;
            return (
              <button
                key={opt.name}
                type="button"
                title={opt.label}
                onClick={() => onPatch({ [field.key]: opt.name })}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  active
                    ? 'border-gray-900 text-gray-900 ring-1 ring-gray-300'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      );
    }
    default:
      return (
        <input
          type="text"
          value={typeof raw === 'string' ? raw : ''}
          placeholder={field.placeholder}
          onChange={(e) => onPatch({ [field.key]: e.target.value })}
          className={INPUT}
        />
      );
  }
}

export default function Inspector({
  selection,
  content,
  dispatch,
}: {
  selection: BuilderSelection;
  content: OfficePageContent;
  dispatch: Dispatch<BuilderAction>;
}) {
  if (selection.kind === 'none') {
    return (
      <div className="text-sm text-gray-400 px-1 py-8 text-center">
        Select a section, item, or row on the left to edit it.
      </div>
    );
  }

  if (selection.kind === 'row') {
    return <RowInspector rowId={selection.rowId} content={content} dispatch={dispatch} />;
  }

  const section = content.sections.find((s) => s.key === selection.sectionKey);
  if (!section) return null;

  if (selection.kind === 'section') {
    return (
      <div className="space-y-4">
        <div>
          <span className={LABEL}>Section title</span>
          <input
            type="text"
            value={section.title}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_SECTION', sectionKey: section.key, patch: { title: e.target.value } })
            }
            className={INPUT}
          />
        </div>
        <div>
          <span className={LABEL}>Subtitle</span>
          <input
            type="text"
            value={section.subtitle ?? ''}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_SECTION', sectionKey: section.key, patch: { subtitle: e.target.value } })
            }
            className={INPUT}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={section.visible}
            onChange={() => dispatch({ type: 'TOGGLE_SECTION_VISIBLE', sectionKey: section.key })}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          Visible on the agent page
        </label>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'ADD_ITEM', sectionKey: section.key })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700"
          >
            <Plus size={13} />
            Add {sectionMeta(section.type).itemNoun}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'REMOVE_SECTION', sectionKey: section.key })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 text-xs font-medium hover:bg-red-50"
          >
            <Trash2 size={13} />
            Delete section
          </button>
        </div>
      </div>
    );
  }

  // item selection
  const item = section.items.find((it) => it.id === selection.itemId);
  if (!item) return null;
  const meta = sectionMeta(section.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">
          {meta.label} · {meta.itemNoun}
        </span>
        <button
          type="button"
          onClick={() =>
            dispatch({ type: 'REMOVE_ITEM', sectionKey: section.key, itemId: item.id })
          }
          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
      {meta.fields.map((field) => (
        <div key={field.key}>
          {field.kind !== 'boolean' && <span className={LABEL}>{field.label}</span>}
          <FieldInput
            field={field}
            item={item}
            onPatch={(patch) =>
              dispatch({ type: 'UPDATE_ITEM', sectionKey: section.key, itemId: item.id, patch })
            }
          />
        </div>
      ))}
    </div>
  );
}

/** Column-ratio presets, keyed by the number of columns in the row. */
const SPAN_PRESETS: Record<number, { label: string; spans: number[] }[]> = {
  2: [
    { label: '½ · ½', spans: [6, 6] },
    { label: '⅔ · ⅓', spans: [8, 4] },
    { label: '⅓ · ⅔', spans: [4, 8] },
    { label: '¾ · ¼', spans: [9, 3] },
    { label: '¼ · ¾', spans: [3, 9] },
  ],
  3: [
    { label: '⅓ · ⅓ · ⅓', spans: [4, 4, 4] },
    { label: '½ · ¼ · ¼', spans: [6, 3, 3] },
    { label: '¼ · ½ · ¼', spans: [3, 6, 3] },
    { label: '¼ · ¼ · ½', spans: [3, 3, 6] },
  ],
  4: [{ label: '¼ · ¼ · ¼ · ¼', spans: [3, 3, 3, 3] }],
};

function Seg<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: T; l: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex rounded-lg border border-gray-200 p-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              value === o.v ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Available row arrangements for a given section count (span layouts need ≥ 3). */
const LAYOUT_OPTIONS: { t: RowTemplate; label: string }[] = [
  { t: 'columns', label: 'Columns' },
  { t: 'right-span', label: 'Right spans' },
  { t: 'left-span', label: 'Left spans' },
  { t: 'top-span', label: 'Top spans' },
  { t: 'bottom-span', label: 'Bottom spans' },
];

/** Miniature diagram of a row arrangement (reuses the real placement maths). */
function LayoutThumb({ template, n }: { template: RowTemplate; n: number }) {
  if (template === 'columns') {
    return (
      <div className="flex h-9 gap-0.5">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="flex-1 rounded-sm bg-teal-500/70" />
        ))}
      </div>
    );
  }
  const { cols, cells } = templatePlacement(template, n);
  return (
    <div className="grid h-9 gap-0.5" style={{ gridTemplateColumns: cols, gridAutoRows: '1fr' }}>
      {cells.map((c, i) => (
        <div key={i} className="rounded-sm bg-teal-500/70" style={{ gridColumn: c.gc, gridRow: c.gr }} />
      ))}
    </div>
  );
}

function RowInspector({
  rowId,
  content,
  dispatch,
}: {
  rowId: string;
  content: OfficePageContent;
  dispatch: Dispatch<BuilderAction>;
}) {
  const group = groupSectionsIntoRows(content.sections).find((g) => g.rowId === rowId);
  if (!group || group.sections.length < 2) {
    return (
      <div className="text-sm text-gray-400 px-1 py-8 text-center">
        This is a single-column row. Drag another section beside one to form a multi-column row.
      </div>
    );
  }

  const n = group.sections.length;
  const spans = group.sections.map(sectionSpan);
  const presets = SPAN_PRESETS[n] ?? [];
  const rowLayout: RowLayout = content.rowLayouts?.[rowId] ?? {};
  const template = rowTemplate(rowLayout, n);
  const layoutOptions = LAYOUT_OPTIONS.filter((o) => o.t === 'columns' || n >= 3);
  const spansEqual = (a: number[]) => a.length === spans.length && a.every((v, i) => v === spans[i]);

  const setLayout = (patch: Partial<RowLayout>) => dispatch({ type: 'SET_ROW_LAYOUT', rowId, patch });
  const moveWithin = (fromIndex: number, toIndex: number) =>
    dispatch({ type: 'MOVE_SECTION_ACROSS', fromRowId: rowId, fromIndex, toRowId: rowId, toIndex });

  return (
    <div className="space-y-5">
      <div>
        <span className="text-xs font-medium text-gray-400">Row · {n} sections</span>
      </div>

      {layoutOptions.length > 1 && (
        <div>
          <span className={LABEL}>Layout</span>
          <div className="grid grid-cols-2 gap-1.5">
            {layoutOptions.map((o) => {
              const active = template === o.t;
              return (
                <button
                  key={o.t}
                  type="button"
                  onClick={() => setLayout({ template: o.t === 'columns' ? undefined : o.t })}
                  className={`rounded-lg border p-2 transition ${
                    active ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-1">
                    <LayoutThumb template={o.t} n={n} />
                  </div>
                  <span className="text-[11px] text-gray-500">{o.label}</span>
                </button>
              );
            })}
          </div>
          {template !== 'columns' && (
            <p className="mt-1.5 text-[11px] text-gray-400">
              Reorder the sections below to change which one spans.
            </p>
          )}
        </div>
      )}

      {template === 'columns' && presets.length > 0 && (
        <div>
          <span className={LABEL}>Column ratio</span>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((preset) => {
              const total = preset.spans.reduce((s, n) => s + n, 0);
              const active = spansEqual(preset.spans);
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_ROW_SPANS', rowId, spans: preset.spans })}
                  className={`rounded-lg border p-2 transition ${
                    active ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-0.5 h-4 mb-1">
                    {preset.spans.map((s, i) => (
                      <div key={i} className="rounded-sm bg-teal-500/70" style={{ flexGrow: s / total, flexBasis: 0 }} />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-500">{preset.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">Or drag the gutter between columns on the canvas.</p>
        </div>
      )}

      <Seg
        label="Vertical align"
        value={rowLayout.align ?? 'stretch'}
        onChange={(v) => setLayout({ align: v === 'stretch' ? undefined : v })}
        options={[
          { v: 'stretch', l: 'Fill' },
          { v: 'start', l: 'Top' },
          { v: 'center', l: 'Middle' },
          { v: 'end', l: 'Bottom' },
        ]}
      />
      <Seg
        label="Column gap"
        value={rowLayout.gap ?? 'md'}
        onChange={(v) => setLayout({ gap: v === 'md' ? undefined : v })}
        options={[
          { v: 'sm', l: 'S' },
          { v: 'md', l: 'M' },
          { v: 'lg', l: 'L' },
        ]}
      />
      <Seg
        label="Stack breakpoint"
        value={rowLayout.stackBelow ?? 'md'}
        onChange={(v) => setLayout({ stackBelow: v === 'md' ? undefined : v })}
        options={[
          { v: 'lg', l: 'Late' },
          { v: 'md', l: 'Default' },
          { v: 'sm', l: 'Early' },
        ]}
      />

      <div>
        <span className={LABEL}>Sections</span>
        <div className="space-y-1">
          {group.sections.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5 rounded-lg border border-gray-100 px-2.5 py-1.5">
              <span className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveWithin(i, i - 1)}
                  title="Move up"
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={i === n - 1}
                  onClick={() => moveWithin(i, i + 1)}
                  title="Move down"
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronDown size={13} />
                </button>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{s.title}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SPLIT_SECTION', sectionKey: s.key })}
                className="shrink-0 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                Move out
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

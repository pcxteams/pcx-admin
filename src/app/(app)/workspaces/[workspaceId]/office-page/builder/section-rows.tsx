import type { CSSProperties, ReactNode } from 'react';
import type { OfficePageSection, RowLayout } from '@/lib/office-page-content';

/**
 * Responsive row/column layout for office-page sections (ported from v2 Phase 6).
 *
 * A flat, ordered section list is folded into *rows* by `layout.rowId`; within a
 * row each section takes `layout.span` of a 12-unit grid (e.g. 8 + 4 = a 2/3·1/3
 * split). Whether a row divides into columns or stacks into one is a CSS
 * container query on the row's own width (see `.opb-row` in `globals.css`), so it
 * is correct in the narrow builder canvas, on desktop, and on a phone.
 *
 * Presentational only — no hooks/handlers — so it renders in both the read view
 * and the builder preview, keeping preview == published.
 */

const ALIGN_CSS: Record<NonNullable<RowLayout['align']>, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};
const GAP_CSS: Record<NonNullable<RowLayout['gap']>, string> = {
  sm: '0.75rem',
  md: '1.5rem',
  lg: '2.5rem',
};

/** Full width on the layout grid. */
export const ROW_SPAN_UNITS = 12;

export interface SectionRowGroup {
  rowId: string;
  sections: OfficePageSection[];
}

/**
 * Fold consecutive sections sharing a `layout.rowId` into a row. A section with
 * no `layout` becomes its own full-width row keyed by its `key`. Only *consecutive*
 * matches fold together, keeping a row's sections contiguous.
 */
export function groupSectionsIntoRows(sections: OfficePageSection[]): SectionRowGroup[] {
  const rows: SectionRowGroup[] = [];
  for (const section of sections) {
    const rowId = section.layout?.rowId ?? section.key;
    const current = rows[rows.length - 1];
    if (current && current.rowId === rowId) current.sections.push(section);
    else rows.push({ rowId, sections: [section] });
  }
  return rows;
}

/** A section's span, clamped to the 1–12 grid (defaults to full width). */
export function sectionSpan(section: OfficePageSection): number {
  const span = section.layout?.span;
  if (span == null || !Number.isFinite(span)) return ROW_SPAN_UNITS;
  return Math.min(ROW_SPAN_UNITS, Math.max(1, Math.round(span)));
}

interface SectionRowProps {
  sections: OfficePageSection[];
  rowLayout?: RowLayout;
  children: (section: OfficePageSection) => ReactNode;
}

/**
 * Lay a row's sections out as responsive columns. A lone full-width section
 * renders with no wrapper (identical to the classic stacked layout). `rowLayout`
 * tunes gap, vertical alignment, and the width at which columns stack.
 */
export function SectionRow({ sections, rowLayout, children }: SectionRowProps) {
  if (sections.length <= 1) {
    const only = sections[0];
    return only ? <>{children(only)}</> : null;
  }

  const stack = rowLayout?.stackBelow ?? 'md';
  const innerStyle = {
    '--opb-gap': GAP_CSS[rowLayout?.gap ?? 'md'],
    '--opb-align': ALIGN_CSS[rowLayout?.align ?? 'stretch'],
  } as CSSProperties;

  return (
    <div className="opb-row">
      <div className={`opb-row-inner opb-stack-${stack}`} style={innerStyle}>
        {sections.map((section) => (
          <div
            key={section.key}
            className="opb-col"
            style={{ '--opb-grow': sectionSpan(section), minWidth: section.layout?.minWidth } as CSSProperties}
          >
            {children(section)}
          </div>
        ))}
      </div>
    </div>
  );
}

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

/** Excel and Sheets execute a cell that opens with any of these. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(v: string | number | boolean | null | undefined): string {
  let s = v == null ? '' : String(v);
  // Free-text fields (client name, notes, address) reach the sheet verbatim,
  // so a leading =/+/-/@ has to be defused before it becomes a live formula.
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;
  if (/["\n\r,]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Client-side CSV download — ported from v2 (lib/exportCsv.ts). */
export function exportToCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(',')).join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari/Firefox have raced a synchronous revoke against the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

import type {
  OfficePageAction,
  OfficePageContent,
  OfficePageItem,
  OfficePageSection,
} from '@/lib/office-page-content';
import { groupSectionsIntoRows, SectionRow } from './builder/section-rows';

/**
 * Read-only render of an Office Page's content (all section types). This is the
 * Phase-2 view surface; the interactive drag-and-drop builder (Phase 3) will
 * reuse these section/item shapes. Kept presentational so it can back both the
 * admin preview and the agent-facing published page.
 */

function itemTitle(item: OfficePageItem): string {
  if ('title' in item && item.title) return item.title;
  if ('name' in item && item.name) return item.name;
  if ('workspaceMembershipId' in item) return 'Leadership member';
  return 'Untitled';
}

function itemDescription(item: OfficePageItem): string | undefined {
  return 'description' in item ? item.description : undefined;
}

function primaryAction(item: OfficePageItem): OfficePageAction | undefined {
  if ('action' in item && item.action) return item.action;
  if ('primaryAction' in item && item.primaryAction) return item.primaryAction;
  return undefined;
}

/** Resolve the actual href for an action, honouring scheme-based types. */
function actionHref(action: OfficePageAction, dest: string): string {
  switch (action.type) {
    case 'email':
      return dest.startsWith('mailto:') ? dest : `mailto:${dest}`;
    case 'phone':
      return dest.startsWith('tel:') ? dest : `tel:${dest.replace(/\s+/g, '')}`;
    default:
      return dest;
  }
}

function ActionLink({ action }: { action: OfficePageAction }) {
  const dest = action.destination?.trim();
  const label = action.label || 'Open';
  if (!dest) {
    return <span className="text-xs text-gray-300">{label} (no link set)</span>;
  }
  const href = actionHref(action, dest);
  const external = action.openBehavior !== 'same_tab' && /^https?:\/\//.test(dest);
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="text-xs font-medium text-teal-600 hover:text-teal-700"
    >
      {label} →
    </a>
  );
}

function ItemCard({ item }: { item: OfficePageItem }) {
  const featured = 'featured' in item && item.featured;
  const action = primaryAction(item);
  const description = itemDescription(item);
  return (
    <div
      className={`rounded-lg border px-4 py-3.5 bg-white ${
        featured ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100'
      }`}
    >
      <p className="text-sm font-medium text-gray-900 leading-tight">{itemTitle(item)}</p>
      {description && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{description}</p>}
      {action && (
        <div className="mt-2">
          <ActionLink action={action} />
        </div>
      )}
    </div>
  );
}

function SectionBlock({ section }: { section: OfficePageSection }) {
  // Inactive items are hidden from the agent/published surface, mirroring how
  // invisible sections are filtered below.
  const items = [...section.items]
    .filter((item) => item.active)
    .sort((a, b) => a.order - b.order);
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{section.title}</h2>
          {section.subtitle && <p className="text-xs text-gray-400 mt-0.5">{section.subtitle}</p>}
        </div>
        <span className="text-[10px] font-semibold tracking-widest text-gray-300 uppercase">
          {section.type}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
          No items yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function OfficePageView({ content }: { content: OfficePageContent }) {
  const sections = [...content.sections]
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-12 text-center text-sm text-gray-400">
        This office page has no visible sections yet.
      </div>
    );
  }

  const rows = groupSectionsIntoRows(sections);

  return (
    <div className="space-y-8">
      {rows.map((row) => (
        <SectionRow key={row.rowId} sections={row.sections} rowLayout={content.rowLayouts?.[row.rowId]}>
          {(section) => <SectionBlock section={section} />}
        </SectionRow>
      ))}
    </div>
  );
}

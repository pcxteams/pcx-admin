import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { apiGet } from '@/lib/api';
import { avatarClass, initials } from '@/components/user-badges';

/**
 * Read-only Leader view of each Agent's content progress (KAN-98 read slice).
 * Server-rendered against GET /users/agent-progress, which enforces the same
 * scope as the Users directory — a Leader sees their agents, a Limited Leader
 * only their assigned ones, an Agent gets a 403 (apiGet -> null -> no-access
 * state). Search and pagination ride the URL so the whole page stays a plain
 * server component with no client state.
 */

type AgentProgressItem = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  workspaceId: string | null;
  workspaceName: string | null;
  agentLevel: string | null;
  status: 'active' | 'pending' | 'invited' | 'suspended';
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  assignedCount: number;
  assignedCompletedCount: number;
  lastContentActivityAt: string | null;
  lastActiveAt: string | null;
};

type AgentProgressResponse = {
  items: AgentProgressItem[];
  total: number;
  page: number;
  perPage: number;
};

// Same New / Producer / Top Producer tiers the roster shows (UsersTable.tsx),
// keyed on the Agent's onboarding_type.
const AGENT_LEVEL_LABEL: Record<string, string> = {
  new_agent: 'New',
  transfer_some_experience: 'Producer',
  transfer_highly_experienced: 'Top Producer',
};

const PER_PAGE = 25;

const TH =
  'px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap';
const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function AgentLevelBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-gray-400">&mdash;</span>;
  const label = AGENT_LEVEL_LABEL[level] ?? level;
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {label}
    </span>
  );
}

/** Compact "done / assigned" cell with a thin progress bar. */
function AssignedCell({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span className="text-gray-400">&mdash;</span>;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="min-w-[92px]">
      <div className="mb-1 text-xs font-medium tabular-nums text-gray-700">
        {done}/{total}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function AgentProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const sp = await searchParams;
  const search = (sp.search ?? '').trim();
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('perPage', String(PER_PAGE));
  if (search) qs.set('search', search);

  const data = await apiGet<AgentProgressResponse>(
    `/users/agent-progress?${qs.toString()}`,
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Agent Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          A read-only view of each agent&apos;s content progress. Spot who is
          overdue or hasn&apos;t started so you know where to coach next.
        </p>
      </div>

      {data === null ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-gray-400">
            You don&apos;t have access to agent progress.
          </p>
        </div>
      ) : (
        <ProgressContent data={data} search={search} page={page} />
      )}
    </div>
  );
}

function ProgressContent({
  data,
  search,
  page,
}: {
  data: AgentProgressResponse;
  search: string;
  page: number;
}) {
  const items = Array.isArray(data.items) ? data.items : [];
  const total = data.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);
  const hasPrev = page > 1;
  const hasNext = to < total;

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `/team/progress?${s}` : '/team/progress';
  };

  return (
    <>
      <form method="get" className="mb-4 flex items-center gap-2">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search agents by name or email"
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100"
        />
        <button
          type="submit"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Search
        </button>
        {search && (
          <Link
            href="/team/progress"
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={TH}>Agent</th>
              <th className={TH}>Level</th>
              <th className={TH}>Assigned done</th>
              <th className={TH}>Completed</th>
              <th className={TH}>In progress</th>
              <th className={TH}>Overdue</th>
              <th className={TH}>Last activity</th>
              <th className={TH}>Last active</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className={`${TD} text-center text-gray-400`} colSpan={8}>
                  {search
                    ? 'No agents match your search.'
                    : 'No agents to show yet.'}
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr
                  key={a.membershipId}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                >
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold ${avatarClass(
                          a.userId,
                        )}`}
                      >
                        {initials(a.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">
                          {a.name}
                        </div>
                        <div className="truncate text-xs text-gray-400">
                          {a.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    <AgentLevelBadge level={a.agentLevel} />
                  </td>
                  <td className={TD}>
                    <AssignedCell
                      done={a.assignedCompletedCount}
                      total={a.assignedCount}
                    />
                  </td>
                  <td className={`${TD} tabular-nums`}>{a.completedCount}</td>
                  <td className={`${TD} tabular-nums`}>{a.inProgressCount}</td>
                  <td className={`${TD} tabular-nums`}>
                    {a.overdueCount > 0 ? (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                        {a.overdueCount}
                      </span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-gray-500`}>
                    {formatDate(a.lastContentActivityAt)}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-gray-500`}>
                    {formatDate(a.lastActiveAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span className="tabular-nums">
          {total === 0 ? 'No agents' : `Showing ${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          {hasPrev ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-gray-100 px-3 py-1.5 font-medium text-gray-300">
              Previous
            </span>
          )}
          {hasNext ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-gray-100 px-3 py-1.5 font-medium text-gray-300">
              Next
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  /**
   * Item-level gate for a single entry within an otherwise-inclusive
   * section (e.g. ENGAGEMENT, visible to Agents for its other items) — true
   * hides this item from Agents specifically, while still showing it to
   * Master/PCx Admin (platform roles) and to Manager/Leader (workspace
   * access). Distinct from NavSection's requiresWorkspaceAccess, which also
   * hides from Master/Admin since it gates entire sections meant only for
   * workspace members.
   */
  hiddenFromAgent?: boolean;
  /**
   * Item-level platform-role gate, for when a section is shared by several
   * platform roles but a single entry is narrower. e.g. PCX PLATFORM is shown
   * to master + admin (PCx Admin), but Workspaces stays master-only while
   * Settings is open to both. Omit to inherit the section's visibility.
   */
  requiredRoles?: string[];
};

export type NavSection = {
  section: string;
  items: NavItem[];
  /** Show only to these platform roles (any match); omit to show to everyone. */
  requiredRoles?: string[];
  /**
   * Workspace-membership-level gate — e.g. only 'manager'/'leader' should
   * see this, not 'agent'. Platform role (requiredRoles above) can't make
   * this distinction, since Manager/Leader/Agent all share the same
   * platform role — this is resolved server-side and passed to Sidebar
   * as a prop instead.
   */
  requiresWorkspaceAccess?: boolean;
};

export const navigation: NavSection[] = [
  {
    section: 'PCX PLATFORM',
    requiredRoles: ['master', 'admin'],
    items: [
      // Workspace management stays master-only (see workspaces/page.tsx); PCx
      // Admins get Platform Settings but not the Workspaces admin surface.
      { label: 'Workspaces', href: '/workspaces', icon: 'LayoutGrid', requiredRoles: ['master'] },
      // Master-only, same tier as Workspaces — broadcasting content to every
      // workspace is treated as sensitive as workspace management itself.
      { label: 'Content Library', href: '/platform/content', icon: 'FolderOpen', requiredRoles: ['master'] },
      { label: 'Settings', href: '/platform/settings', icon: 'Settings' },
      { label: 'AI Configuration', href: '/platform/ai-configuration', icon: 'Sparkles', requiredRoles: ['master'] },
    ],
  },
  {
    section: 'HOME',
    items: [
      { label: 'Home', href: '/', icon: 'House' },
    ],
  },
  {
    section: 'BUSINESS',
    items: [
      { label: 'Dashboard', href: '/business/dashboard', icon: 'LayoutDashboard' },
      { label: 'Transactions', href: '/business/transactions', icon: 'ArrowLeftRight' },
      { label: 'Reports', href: '/business/reports', icon: 'FileBarChart2' },
    ],
  },
  {
    section: 'ENGAGEMENT',
    items: [
      { label: 'Users', href: '/users', icon: 'Users' },
      { label: 'Teams', href: '/teams', icon: 'UsersRound', hiddenFromAgent: true },
      { label: 'Assignments', href: '/team/assignments', icon: 'ClipboardList' },
      { label: 'Communications', href: '/team/communications', icon: 'MessageSquare' },
    ],
  },
  {
    section: 'DEVELOPMENT',
    items: [
      { label: 'Career Builder', href: '/development/career-builder', icon: 'Trophy' },
      { label: 'Calendar', href: '/development/calendar', icon: 'Calendar' },
    ],
  },
  {
    section: 'PREVIEW',
    items: [
      { label: 'Agent Home', href: '/preview/agent-home', icon: 'House' },
      { label: 'Agent Office', href: '/preview/agent-office', icon: 'Building2' },
      { label: 'Agent Learn', href: '/preview/agent-learn', icon: 'GraduationCap' },
      { label: 'Agent Plan', href: '/preview/agent-plan', icon: 'Map' },
      { label: 'Agent Track', href: '/preview/agent-track', icon: 'TrendingUp' },
    ],
  },
  {
    section: 'SETTINGS',
    requiresWorkspaceAccess: true,
    items: [
      { label: 'Workspace Settings', href: '/settings/workspace', icon: 'Settings2' },
      { label: 'Leader Resources', href: '/settings/leader-resources', icon: 'BookMarked' },
    ],
  },
];

export function getLabelFromHref(href: string): string {
  for (const group of navigation) {
    for (const item of group.items) {
      if (item.href === href) return item.label;
    }
  }
  const segments = href.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  return last.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

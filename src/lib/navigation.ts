export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export type NavSection = {
  section: string;
  items: NavItem[];
  requiredRole?: string;
};

export const navigation: NavSection[] = [
  {
    section: 'PCX PLATFORM',
    items: [
      { label: 'Workspaces', href: '/workspaces', icon: 'LayoutGrid' },
      { label: 'Settings', href: '/platform/settings', icon: 'Settings' },
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
    section: 'TEAM',
    items: [
      { label: 'Team', href: '/team', icon: 'Users' },
      { label: 'Assignments', href: '/team/assignments', icon: 'ClipboardList' },
      { label: 'Communications', href: '/team/communications', icon: 'MessageSquare' },
    ],
  },
  {
    section: 'DEVELOPMENT',
    items: [
      { label: 'Content Manager', href: '/development/content-manager', icon: 'FolderOpen' },
      { label: 'Learning Paths', href: '/development/learning-paths', icon: 'BookOpen' },
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
    items: [
      { label: 'Workspace Settings', href: '/settings/workspace', icon: 'Settings2' },
      { label: 'Leader Resources', href: '/settings/leader-resources', icon: 'BookMarked' },
      { label: 'BE Conn Test', href: '/settings/be-conn-test', icon: 'PlugZap' },
    ],
  },
  {
    section: 'MASTER ADMIN',
    requiredRole: 'master',
    items: [
      { label: 'Admin Panel', href: '/admin', icon: 'Settings' },
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

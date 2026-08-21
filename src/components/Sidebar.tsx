'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutGrid, Settings, House, LayoutDashboard, ArrowLeftRight,
  FileBarChart2, Users, ClipboardList, MessageSquare, FolderOpen,
  BookOpen, Calendar, Building2, GraduationCap, Map, TrendingUp,
  Settings2, BookMarked, PlugZap, ChevronDown, LogOut, type LucideIcon,
} from 'lucide-react';
import { navigation, type NavItem } from '@/lib/navigation';
import { authClient } from '@/lib/auth-client';

type SidebarUser = { name: string; email: string; role?: string | null };

const iconMap: Record<string, LucideIcon> = {
  LayoutGrid, Settings, House, LayoutDashboard, ArrowLeftRight,
  FileBarChart2, Users, ClipboardList, MessageSquare, FolderOpen,
  BookOpen, Calendar, Building2, GraduationCap, Map, TrendingUp,
  Settings2, BookMarked, PlugZap,
};

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const Icon = iconMap[item.icon];
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded text-sm transition-colors ${
        isActive
          ? 'bg-slate-700 text-white'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {Icon && <Icon size={14} className="flex-shrink-0" />}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

type SidebarWorkspace = { name: string; type: 'office' | 'team' };

export default function Sidebar({
  user,
  hasWorkspaceAccess = false,
  workspace,
}: {
  user?: SidebarUser;
  hasWorkspaceAccess?: boolean;
  workspace?: SidebarWorkspace | null;
}) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  // Close the account menu when clicking anywhere outside it. Mirrors v2's
  // footer dropdown behavior.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleSignOut() {
    // Navigate to /login regardless of outcome so the button is never a dead
    // click on a network error. The proxy no longer bounces /login away, so a
    // not-fully-cleared cookie still lands the user on the sign-in form.
    try {
      await authClient.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  const displayName = user?.name?.trim() || user?.email || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="w-56 bg-slate-900 h-screen flex flex-col flex-shrink-0 sticky top-0">
      {/* Brand — shows the caller's own workspace when they have one (Manager/
          Leader/Agent); falls back to PCx Platform branding for master, who
          has no personal workspace. */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800">
        <div className="w-7 h-7 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          P
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold leading-tight truncate">
            {workspace?.name || 'PCx Platform'}
          </div>
          <div className="text-slate-500 text-xs leading-tight">
            {workspace ? (workspace.type === 'office' ? 'Office' : 'Team') : 'Platform'}
          </div>
        </div>
        <ChevronDown size={13} className="text-slate-500 flex-shrink-0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-3 sidebar-scroll">
        {navigation
          .filter(
            (group) =>
              !group.requiredRoles ||
              (!!user?.role && group.requiredRoles.includes(user.role)),
          )
          .filter((group) => !group.requiresWorkspaceAccess || hasWorkspaceAccess)
          .map((group) => (
            <div key={group.section}>
              <div className="px-5 mb-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                {group.section}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
      </nav>

      {/* User footer */}
      <div ref={userRef} className="relative flex-shrink-0 border-t border-slate-800 px-3 py-3">
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 z-50 rounded-xl border border-slate-700 bg-slate-800 p-1.5 shadow-2xl shadow-black/50">
            {user?.email && (
              <div className="px-3 pt-1.5 pb-2 mb-1 border-b border-slate-700">
                <div className="text-slate-200 text-sm font-medium truncate">{displayName}</div>
                <div className="text-slate-500 text-xs truncate">{user.email}</div>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              <LogOut size={15} className="flex-shrink-0" />
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setUserMenuOpen((o) => !o)}
          className="flex items-center gap-2.5 w-full rounded-lg px-2 py-2 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initial}
          </div>
          <span className="flex-1 min-w-0 text-left text-slate-200 text-sm font-medium truncate">
            {displayName}
          </span>
          <ChevronDown
            size={13}
            className={`text-slate-500 flex-shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Settings, House, LayoutDashboard, ArrowLeftRight,
  FileBarChart2, Users, ClipboardList, MessageSquare, FolderOpen,
  BookOpen, Calendar, Building2, GraduationCap, Map, TrendingUp,
  Settings2, BookMarked, PlugZap, ChevronDown, type LucideIcon,
} from 'lucide-react';
import { navigation, type NavItem } from '@/lib/navigation';

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

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 h-screen flex flex-col flex-shrink-0 sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800">
        <div className="w-7 h-7 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          P
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold leading-tight">PCx Platform</div>
          <div className="text-slate-500 text-xs leading-tight">Platform</div>
        </div>
        <ChevronDown size={13} className="text-slate-500 flex-shrink-0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-3">
        {navigation.map((group) => (
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
      <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          J
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-slate-200 text-sm font-medium leading-tight truncate">Joe D.</div>
        </div>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAV_LINKS } from '@/lib/navLinks';
import { BarChart3, BookOpen, CarFront, ClipboardList, FileBarChart, LayoutDashboard, Users, WalletCards } from 'lucide-react';

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  members: Users,
  vehicles: CarFront,
  applications: ClipboardList,
  bookings: BookOpen,
  payments: WalletCards,
  reports: FileBarChart,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  const visibleLinks = NAV_LINKS.filter((link) => link.roles.includes(user.role));

  return (
    <aside className="min-h-[calc(100vh-65px)] w-64 shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-6 text-sidebar-foreground">
      <div className="mb-6 px-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/50">Workspace</p>
        <p className="mt-1 text-xs text-sidebar-foreground/40">Transport operations</p>
      </div>
      <nav className="flex flex-col gap-1">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
          const Icon = NAV_ICONS[link.href.split('/').pop()] || BarChart3;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-white'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

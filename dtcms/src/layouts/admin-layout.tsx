import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  BusFront,
  LayoutDashboard,
  Users,
  CarFront,
  FileText,
  MapPin,
  CalendarCheck,
  CreditCard,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useGetMyNotifications } from '@workspace/api-client-react';

const ADMIN_LINKS = [
  { href: '/admin/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/members',      label: 'Members',       icon: Users },
  { href: '/admin/applications', label: 'Applications',  icon: FileText },
  { href: '/admin/vehicles',     label: 'Vehicles',      icon: CarFront },
  { href: '/admin/trips',        label: 'Trips',         icon: MapPin },
  { href: '/admin/bookings',     label: 'Bookings',      icon: CalendarCheck },
  { href: '/admin/payments',     label: 'Payments',      icon: CreditCard },
  { href: '/admin/reports',      label: 'Reports',       icon: BarChart3 },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasAdminAccess } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation('/login');
    } else if (!hasAdminAccess()) {
      setLocation('/member/dashboard');
    }
  }, [user, hasAdminAccess, setLocation]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const { data: notifications } = useGetMyNotifications({
    query: {
      enabled: !!user,
      queryKey: ['notifications', 'my'],
    },
  });

  const unreadCount = notifications?.data?.filter(n => !n.isRead).length || 0;

  if (!user || !hasAdminAccess()) return null;

  const pageTitle = ADMIN_LINKS.find(l =>
    l.href === '/admin/dashboard'
      ? location === l.href
      : location.startsWith(l.href)
  )?.label ?? 'Dashboard';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2.5 text-white font-bold text-base tracking-tight"
          data-testid="link-sidebar-home"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <BusFront className="w-4 h-4 text-primary" />
          </div>
          <span>DTCMS</span>
          <span className="text-[10px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded tracking-widest uppercase ml-0.5">
            Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {ADMIN_LINKS.map(link => {
          const isActive =
            link.href === '/admin/dashboard'
              ? location === link.href
              : location.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium group"
              data-testid={`link-sidebar-${link.label.toLowerCase()}`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-sidebar-primary rounded-md"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-3 w-full transition-colors duration-150 ${
                  isActive
                    ? 'text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {link.label}
                {isActive && (
                  <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md mb-1">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {getInitials(user.fullName ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
            <p className="text-[11px] text-sidebar-foreground/50 uppercase tracking-wider">{user.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent text-sm px-2"
          onClick={logout}
          data-testid="btn-sidebar-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className="w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex flex-col shrink-0"
        data-theme-surface
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar text-sidebar-foreground z-50 flex flex-col md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 sticky top-0 z-30"
          data-theme-surface
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(v => !v)}
              data-testid="btn-mobile-menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>

            <div>
              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                DTCMS Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setLocation('/notifications')}
              data-testid="btn-topbar-notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"
                />
              )}
            </Button>

            {/* User chip */}
            <div className="hidden sm:flex items-center gap-2 ml-1 pl-3 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                {getInitials(user.fullName ?? 'U')}
              </div>
              <span className="text-sm font-medium text-foreground">{user.fullName?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

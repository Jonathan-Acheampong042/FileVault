import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  BusFront,
  LogOut,
  LayoutDashboard,
  UserCircle,
  CreditCard,
  CalendarCheck,
  Bell,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useGetMyNotifications } from '@workspace/api-client-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MEMBER_LINKS = [
  { href: '/member/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/member/profile',   label: 'Profile',   icon: UserCircle },
  { href: '/member/payments',  label: 'Payments',  icon: CreditCard },
  { href: '/member/bookings',  label: 'Bookings',  icon: CalendarCheck },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user) setLocation('/login');
  }, [user, setLocation]);

  const { data: notifications } = useGetMyNotifications({
    query: { enabled: !!user, queryKey: ['notifications', 'my'] },
  });

  const unreadCount = notifications?.data?.filter(n => !n.isRead).length || 0;

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header
        className="h-14 bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 transition-colors"
        data-theme-surface
      >
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/member/dashboard"
            className="flex items-center gap-2 font-bold text-sm text-foreground"
            data-testid="link-member-home"
          >
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <BusFront className="w-3.5 h-3.5 text-white" />
            </div>
            <span>DTCMS</span>
            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded tracking-widest uppercase">
              Member
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {MEMBER_LINKS.map(link => {
              const isActive = location.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/8'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  data-testid={`link-member-${link.label.toLowerCase()}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="member-nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setLocation('/notifications')}
              data-testid="btn-member-notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="btn-member-menu">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {MEMBER_LINKS.map(link => (
                  <DropdownMenuItem
                    key={link.href}
                    onClick={() => setLocation(link.href)}
                    data-testid={`menu-member-${link.label.toLowerCase()}`}
                  >
                    <link.icon className="w-4 h-4 mr-2" /> {link.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-member-logout">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop user chip + logout */}
            <div className="hidden md:flex items-center gap-2 pl-3 ml-1 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                {getInitials(user.fullName ?? 'U')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground px-2 text-sm"
                onClick={logout}
                data-testid="btn-member-logout"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 lg:p-6">
        {children}
      </main>

      <footer className="border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Digital Transport Cooperative Management System
        </div>
      </footer>
    </div>
  );
}

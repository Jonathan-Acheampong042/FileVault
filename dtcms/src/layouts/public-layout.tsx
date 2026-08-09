import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { BusFront, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasAdminAccess } = useAuth();
  const [, setLocation] = useLocation();

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
            href="/"
            className="flex items-center gap-2 font-bold text-sm text-foreground"
            data-testid="link-home"
          >
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <BusFront className="w-3.5 h-3.5 text-white" />
            </div>
            <span>DTCMS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-nav-home"
            >
              Home
            </Link>
            <Link
              href="/apply"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-nav-apply"
            >
              Apply for Membership
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <ThemeToggle />

            <div className="hidden md:flex items-center gap-2 ml-1">
              {user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(hasAdminAccess() ? '/admin/dashboard' : '/member/dashboard')}
                    data-testid="btn-nav-dashboard"
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-muted-foreground"
                    data-testid="btn-nav-logout"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Sign out
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setLocation('/login')}
                  data-testid="btn-nav-login"
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="btn-mobile-menu">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setLocation('/')} data-testid="menu-home">
                    Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/apply')} data-testid="menu-apply">
                    Apply for Membership
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {user ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => setLocation(hasAdminAccess() ? '/admin/dashboard' : '/member/dashboard')}
                        data-testid="menu-dashboard"
                      >
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                        <LogOut className="w-4 h-4 mr-2" /> Sign out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => setLocation('/login')} data-testid="menu-login">
                      Sign In
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-card border-t border-border py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <BusFront className="w-3 h-3 text-white" />
              </div>
              DTCMS
            </div>
            <p className="text-xs text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} Digital Transport Cooperative Management System. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link href="/apply" className="hover:text-foreground transition-colors">Apply</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/auth';
import { getHomeHref } from '@/lib/roleHome';
import { Bell, BookOpen, BusFront, CreditCard, LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import Button from './Button';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // BUG-082: logo previously always linked to "/" regardless of login
  // state. From a page outside /admin/* and /member/* (e.g. /notifications),
  // that left signed-in staff with no way back into the app at all.
  const logoHref = !loading && user ? getHomeHref(user) : '/';
  const isAdmin = pathname?.startsWith('/admin');
  const isMemberPortal = pathname?.startsWith('/member') || pathname === '/notifications';
  if (isAdmin) return null;

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-primary/15 bg-primary px-4 py-2.5 text-white shadow-sm sm:px-6">
      <Link href={logoHref} className="group flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition group-hover:bg-white/20">
          <BusFront size={18} strokeWidth={2.2} />
        </span>
        <span className="text-sm font-bold tracking-tight">DTCMS</span>
        {user && isMemberPortal && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider text-white/70">{user.role}</span>}
      </Link>

      <div className="flex items-center gap-3 text-sm">
        <ThemeToggle variant="ghost-light" />
        {!loading && user && (
          <>
            {isMemberPortal && (
              <div className="hidden items-center gap-1 md:flex">
                {[
                  ['/member/dashboard', 'Dashboard', LayoutDashboard],
                  ['/member/profile', 'Profile', UserCircle],
                  ['/member/payments', 'Payments', CreditCard],
                  ['/member/bookings', 'Bookings', BookOpen],
                ].map(([href, label, Icon]) => (
                  <Link key={href} href={href} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${pathname === href ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    <Icon size={13} />
                    {label}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/notifications" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-white/75 hover:bg-white/10 hover:text-white" aria-label="Notifications">
              <Bell size={17} />
              <span className="relative h-1.5 w-1.5 rounded-full bg-danger" />
            </Link>

            {/* BUG-083: name was plain text with no link to any profile
                view — no profile page was reachable for staff roles at all.
                /member/profile works for any authenticated user (it only
                reads user.* fields; the vehicle section is conditional on
                user.vehicle existing), so it doubles as "My Profile" here
                rather than building a separate staff-only profile page. */}
            <Link href="/member/profile" className="hidden items-center gap-2 rounded-lg px-2.5 py-2 text-white/80 hover:bg-white/10 hover:text-white sm:flex">
              <UserCircle size={17} />
              <span>{user.fullName || user.email}</span>
            </Link>

            <Button
              variant="secondary"
              onClick={handleLogout}
              className="border-white/15 bg-white/10 text-white shadow-none hover:border-white/25 hover:bg-white/15"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </>
        )}

        {!loading && !user && (
          <Link href="/login" className="rounded-md bg-white px-3.5 py-2 font-semibold text-primary hover:bg-white/90">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

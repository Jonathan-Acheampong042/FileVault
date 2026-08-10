'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from './ThemeToggle';

const PAGE_META = [
  ['/admin/dashboard', 'Dashboard'],
  ['/admin/members', 'Members'],
  ['/admin/applications', 'Applications'],
  ['/admin/vehicles', 'Vehicles'],
  ['/admin/trips', 'Trips'],
  ['/admin/bookings', 'Bookings'],
  ['/admin/payments', 'Payments'],
  ['/admin/reports', 'Reports'],
];

export default function AdminTopbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const page = PAGE_META.find(([href]) => pathname === href || pathname?.startsWith(`${href}/`));
  const initials = (user?.fullName || user?.email || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-card-border bg-card px-5 lg:px-7">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold text-ink">{page?.[1] || 'DTCMS'}</h1>
        <p className="mt-0.5 text-[0.65rem] text-ink/45">DTCMS Administration</p>
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink/55 hover:bg-accent hover:text-ink"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </Link>
        <Link href="/member/profile" className="hidden items-center gap-2 rounded-lg py-1 pl-2 pr-1 hover:bg-accent sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[0.6rem] font-bold text-white">
            {initials}
          </span>
          <span className="max-w-24 truncate text-xs font-semibold text-ink">{user?.fullName || user?.email}</span>
          <ChevronDown size={13} className="text-ink/45" />
        </Link>
      </div>
    </header>
  );
}

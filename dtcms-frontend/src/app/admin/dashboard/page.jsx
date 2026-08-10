'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';
import Link from 'next/link';
import { ArrowRight, Bell, BookOpen, CarFront, ClipboardList, CreditCard, FileBarChart, Plus, Users, WalletCards } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <RoleGuard allow={['ADMIN','SECRETARY']}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}

function AdminDashboardContent() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // NOTE: this endpoint doesn't exist yet — ask Daniel to add
        // GET /api/dashboard/summary (see FRONTEND_SETUP.md notes).
        const result = await api.get('/dashboard/summary');
        setSummary(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <EmptyState message="Couldn't load the dashboard yet — the summary endpoint may not be ready. Try again shortly." />
    );
  }

  const cards = [
    { label: 'Total members', value: summary?.totalMembers ?? 0, caption: `${summary?.activeMembers ?? 0} active`, icon: Users, color: '#4f8ef7' },
    { label: 'Active vehicles', value: summary?.activeVehicles ?? summary?.totalVehicles ?? 0, caption: `of ${summary?.totalVehicles ?? 0} total`, icon: CarFront, color: '#8b5cf6' },
    { label: 'Pending applications', value: summary?.pendingApplications ?? 0, caption: 'awaiting review', icon: ClipboardList, color: '#f29a0d' },
    {
      label: 'Monthly revenue',
      value:
        summary?.monthlyRevenue != null
          ? `GHS ${Number(summary.monthlyRevenue).toLocaleString()}`
          : '—',
      caption: 'this month',
      icon: CreditCard,
      color: '#279b57',
    },
    { label: 'Active trips', value: summary?.activeTrips ?? 0, caption: `of ${summary?.scheduledTrips ?? 0} scheduled`, icon: BookOpen, color: '#dc4c3c' },
    { label: 'Total bookings', value: summary?.totalBookings ?? 0, caption: 'all time', icon: WalletCards, color: '#06b6d4' },
  ];

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="mt-1 text-xs text-muted-foreground">Cooperative operations overview</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="stat-card-accent surface-panel p-4" style={{ color: c.color }}>
            <div className="flex items-start justify-between">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{c.label}</p>
              <c.icon size={15} className="opacity-80" />
            </div>
            <p className="mt-3 text-2xl font-bold text-ink">{c.value}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[0.65rem] text-muted-foreground">{c.caption}</p>
              <ArrowRight size={13} className="text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.4fr]">
        <div className="surface-panel p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Plus size={15} className="text-primary" />
            Quick Actions
          </div>
          <div className="mt-4 space-y-1">
            {[
              ['/admin/vehicles/new', 'Register Vehicle', CarFront],
              ['/admin/trips/new', 'Schedule Trip', BookOpen],
              ['/admin/payments/new', 'Record Payment', CreditCard],
              ['/admin/reports/generate', 'Generate Report', FileBarChart],
            ].map(([href, label, Icon]) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-primary">
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="surface-panel p-5">
          <div className="flex items-center justify-between text-sm font-bold text-ink">
            <span className="flex items-center gap-2"><Bell size={15} className="text-primary" />Recent Activity</span>
            <Link href="/notifications" className="text-[0.65rem] font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-4 flex min-h-28 items-center justify-center rounded-lg border border-dashed border-card-border text-center">
            <EmptyState message="No recent activity" />
          </div>
        </div>
      </div>
    </div>
  );
}
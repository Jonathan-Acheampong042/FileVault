import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useGetDashboardSummary } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  CarFront,
  FileText,
  TrendingUp,
  MapPin,
  CalendarCheck,
  CreditCard,
  ArrowUpRight,
  Bell,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Animation variants ─────────────────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

const headerVariant = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface StatCard {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ElementType;
  color: string;
  accentColor: string;
  link: string;
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { data: summaryRes, isLoading } = useGetDashboardSummary({
    query: { queryKey: ['dashboard', 'summary'] },
  });

  const summary = summaryRes?.data;

  const statCards: StatCard[] = [
    {
      title: 'Total Members',
      value: summary?.totalMembers ?? 0,
      subtext: `${summary?.activeMembers ?? 0} active`,
      icon: Users,
      color: 'text-blue-500',
      accentColor: '#3B82F6',
      link: '/admin/members',
    },
    {
      title: 'Active Vehicles',
      value: summary?.activeVehicles ?? 0,
      subtext: `of ${summary?.totalVehicles ?? 0} total`,
      icon: CarFront,
      color: 'text-violet-500',
      accentColor: '#8B5CF6',
      link: '/admin/vehicles',
    },
    {
      title: 'Pending Applications',
      value: summary?.pendingApplications ?? 0,
      subtext: 'awaiting review',
      icon: FileText,
      color: 'text-amber-500',
      accentColor: '#F59E0B',
      link: '/admin/applications',
    },
    {
      title: 'Monthly Revenue',
      value: `₵${(summary?.monthlyRevenue ?? 0).toFixed(2)}`,
      subtext: 'this month',
      icon: TrendingUp,
      color: 'text-emerald-500',
      accentColor: '#10B981',
      link: '/admin/payments',
    },
    {
      title: 'Active Trips',
      value: summary?.activeTrips ?? 0,
      subtext: `of ${summary?.totalTrips ?? 0} scheduled`,
      icon: MapPin,
      color: 'text-rose-500',
      accentColor: '#EF4444',
      link: '/admin/trips',
    },
    {
      title: 'Total Bookings',
      value: summary?.totalBookings ?? 0,
      subtext: 'all time',
      icon: CalendarCheck,
      color: 'text-cyan-500',
      accentColor: '#06B6D4',
      link: '/admin/bookings',
    },
  ];

  const quickActions = [
    { label: 'Register Vehicle',  icon: CarFront,    href: '/admin/vehicles/new' },
    { label: 'Schedule Trip',     icon: MapPin,      href: '/admin/trips/new' },
    { label: 'Record Payment',    icon: CreditCard,  href: '/admin/payments/new' },
    { label: 'Generate Report',   icon: FileText,    href: '/admin/reports/generate' },
  ];

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <motion.div
        variants={headerVariant}
        initial="hidden"
        animate="show"
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cooperative operations overview
          </p>
        </div>
      </motion.div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={i} variants={cardVariant}>
                <Link href={stat.link}>
                  <Card
                    className="group cursor-pointer hover:shadow-md transition-all duration-200 border-border overflow-hidden"
                    data-testid={`stat-card-${stat.title.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {/* Top accent line */}
                    <div
                      className="h-[3px] w-full opacity-70 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: stat.accentColor }}
                    />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {stat.title}
                        </p>
                        <Icon
                          className={`w-4 h-4 ${stat.color} opacity-50 group-hover:opacity-80 transition-opacity`}
                        />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-3xl font-bold tracking-tight text-foreground">
                            {stat.value}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{stat.subtext}</p>
                        </div>
                        <ArrowUpRight
                          className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors mb-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Bottom row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="grid lg:grid-cols-3 gap-4"
      >
        {/* Quick actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
                >
                  <Icon className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                  {action.label}
                  <ArrowUpRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Notifications / activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" asChild>
                <Link href="/notifications">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
              <Bell className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Events from members, trips, and payments will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, BookOpen, BusFront, CircleUserRound, CreditCard, Bell } from "lucide-react";
import { LoadingSpinner } from "@/components/ui";

export default function MemberDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-lg bg-primary p-5 text-white shadow-lg sm:p-6">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-xl font-bold sm:text-2xl">Welcome back, {user.fullName}</h1>
            <p className="mt-2 max-w-md text-xs leading-5 text-white/75">Manage your cooperative membership, view your payment history, and track your scheduled trips from your dashboard.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/member/profile" className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-primary hover:bg-white/90">
                <CircleUserRound size={14} /> View Profile
              </Link>
              <Link href="/notifications" className="inline-flex items-center gap-2 rounded-md border border-white/45 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10">
                <Bell size={14} /> You have 3 unread notifications
              </Link>
            </div>
          </div>
          <BusFront size={128} className="absolute -right-3 bottom-0 text-white/10" strokeWidth={1} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PortalPanel href="/member/payments" title="Recent Payments" subtitle="Your latest financial transactions" icon={CreditCard} empty="No recent payments found" />
          <PortalPanel href="/member/bookings" title="Upcoming Trips" subtitle="Your scheduled assignments and bookings" icon={BookOpen} empty="No upcoming trips scheduled" />
        </div>
      </section>
    </main>
  );
}

function PortalPanel({ href, title, subtitle, icon: Icon, empty }) {
  return (
    <div className="surface-panel min-h-40 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Icon size={15} className="text-primary" />{title}</h2>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">{subtitle}</p>
        </div>
        <Link href={href} className="flex items-center gap-1 text-[0.65rem] font-semibold text-primary hover:underline">View All <ArrowRight size={12} /></Link>
      </div>
      <div className="flex min-h-24 items-center justify-center text-xs text-muted-foreground">
        {empty}
      </div>
    </div>
  );
}

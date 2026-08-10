"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getHomeHref } from "@/lib/roleHome";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, CarFront, CircleUserRound, LockKeyhole, Mail, MapPin, Phone } from "lucide-react";
import { LoadingSpinner } from "@/components/ui";

export default function MemberProfilePage() {
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
      <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="page-title">My Profile</h1>
          </div>
          <Link href={getHomeHref(user)} className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-[0.65fr_1.35fr]">
          <div className="flex min-h-72 flex-col items-center rounded-lg bg-gradient-to-b from-primary via-primary to-secondary p-5 text-center text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/15"><CircleUserRound size={38} /></div>
            <h2 className="mt-4 text-base font-bold">{user.fullName}</h2>
            <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-widest text-white/70">{user.role}</p>
            <div className="mt-4 w-full rounded-md bg-white/10 px-3 py-2 text-[0.62rem] uppercase tracking-wider text-white/70">
              Account Status
              <div className="mt-1 inline-flex rounded bg-success px-2 py-0.5 text-[0.55rem] font-bold text-white">{user.accountStatus || 'ACTIVE'}</div>
            </div>
            <p className="mt-auto pt-5 text-[0.62rem] text-white/60">ID: {user.id || user.member?.id || '—'}</p>
          </div>
          <div className="space-y-4">
            <div className="surface-panel p-5">
              <h2 className="text-sm font-bold text-ink">Contact Information</h2>
              <div className="mt-4 space-y-4">
                <ContactRow icon={Mail} label="Email Address" value={user.email} />
            {/* BUG-084: real field is phoneNumber, not phone — was always
                blank even before BUG-044 (backend not returning it at all)
                made it moot. Fixing both is required for this to ever show
                a phone number. */}
                <ContactRow icon={Phone} label="Phone Number" value={user.phoneNumber || 'Add via administration'} />
                <ContactRow icon={MapPin} label="Address" value={user.address || 'Add via administration'} />
              </div>
            </div>
            <div className="surface-panel p-5">
              <h2 className="text-sm font-bold text-ink">Security Settings</h2>
              <p className="mt-1 text-xs text-muted-foreground">Manage your account security</p>
              <div className="mt-4 flex items-center justify-between rounded-md border border-card-border px-3 py-3">
                <div className="flex items-center gap-3"><LockKeyhole size={16} className="text-muted-foreground" /><div><p className="text-xs font-semibold text-ink">Password</p><p className="text-[0.62rem] text-muted-foreground">Last changed 3 months ago</p></div></div>
                <button type="button" className="text-[0.65rem] font-semibold text-primary hover:underline">Change</button>
              </div>
            </div>
          </div>
        </div>

        {/* NOTE for whoever implements BUG-044 on the backend: Member has
            no singular "vehicle" field — the real relation is
            member.ownedVehicles (an array, a co-op member could own more
            than one). This UI assumes a single vehicle object at
            user.vehicle; that assumption needs to be resolved (send just
            the first owned vehicle? all of them?) before this section can
            work, not just "add the field" like the other BUG-044 fixes. */}
        {user.vehicle && (
          <div className="surface-panel mt-4 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-primary/10 px-5 py-4">
              <CarFront size={18} className="text-secondary" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
                Registered vehicle
              </h2>
            </div>
            <dl className="divide-y divide-primary/10">
              <Row label="Plate number" value={user.vehicle.plateNumber} />
              <Row label="Type" value={user.vehicle.type} />
              <Row label="Make / Model" value={`${user.vehicle.make} ${user.vehicle.model}`} />
              <Row label="Year" value={user.vehicle.year} />
            </dl>
          </div>
        )}
      </section>
    </main>
  );
}

function ContactRow({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3"><Icon size={15} className="mt-0.5 text-muted-foreground" /><div><p className="text-xs font-semibold text-ink">{label}</p><p className="text-[0.68rem] text-muted-foreground">{value}</p></div></div>;
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-primary/10 px-5 py-3.5 last:border-b-0">
      <dt className="text-sm text-ink/60">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

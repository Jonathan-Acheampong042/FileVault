import Link from "next/link";
import { ArrowRight, BarChart3, BusFront, CheckCircle2, ShieldCheck, Sparkles, Users } from "lucide-react";

const STATS = [
  { value: "1,248", label: "Active members" },
  { value: "36", label: "Trips today" },
  { value: "84", label: "Vehicles" },
  { value: "GHS 48.2k", label: "Collected this month" },
];

const FEATURES = [
  {
    icon: Users,
    title: "Member-first records",
    text: "Keep every member, vehicle, and document organized and easy to find.",
  },
  {
    icon: BusFront,
    title: "Clear daily operations",
    text: "Give your team a shared view of trips, bookings, and availability.",
  },
  {
    icon: BarChart3,
    title: "Confident decisions",
    text: "Turn payments and activity into a reliable picture of the cooperative.",
  },
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-background">
      {/* Hero */}
      <section className="relative bg-primary text-white">
        <div className="dot-grid absolute inset-0 opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-primary" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-16 sm:px-10 sm:pt-24 lg:px-12">
          <div className="max-w-2xl">
            <div className="eyebrow inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white">
              <Sparkles size={13} />
              Built for better transport operations
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-6xl">
              Move your cooperative forward.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70 sm:text-xl">
              Manage membership, vehicles, trips, payments, and bookings from one
              calm, connected workspace.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/apply"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3.5 text-sm font-semibold text-primary shadow-md hover:bg-white/90"
              >
                Apply for membership
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-white/25 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Member login
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/70">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={16} className="text-white" />
                One connected workspace
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-white" />
                Secure member records
              </span>
            </div>
          </div>

          {/* Floating stat strip */}
          <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="glass rounded-xl px-4 py-4 text-center">
                <div className="mb-0.5 text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-[11px] leading-tight text-white/55">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="bg-background px-6 py-20 sm:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow mb-3">Platform capabilities</p>
          <h2 className="max-w-lg text-3xl font-bold leading-snug text-primary">
            Everything the cooperative needs, nothing it doesn&apos;t.
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-ink/60">
            A focused toolset that replaces spreadsheets and paper registers
            with a single, auditable digital system.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-xl border border-primary/10 bg-white p-6 shadow-sm transition hover:border-secondary/30 hover:shadow-md"
                >
                  <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-secondary">
                    <Icon size={18} />
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-primary">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-ink/60">{feature.text}</p>
                  <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-secondary transition-transform duration-200 group-hover:scale-x-100" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-primary/10 bg-accent/40 px-6 py-16 sm:px-10 lg:px-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
          <div>
            <h2 className="text-2xl font-bold text-primary">Ready to join?</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/65">
              Submit your application online. Once approved, you&apos;ll get
              immediate access to the member portal.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/apply"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-secondary"
            >
              Start application
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-primary/15 bg-white px-6 py-3 text-sm font-semibold text-primary hover:border-primary/30"
            >
              Already a member? Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

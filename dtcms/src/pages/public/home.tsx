import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  BusFront,
  ShieldCheck,
  Users,
  TrendingUp,
  ArrowRight,
  BarChart3,
  FileText,
  MapPin,
} from 'lucide-react';

/* ─── Animation variants ─────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Data ───────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '1,200+', label: 'Registered Members' },
  { value: '340',    label: 'Active Vehicles' },
  { value: '₵2.4M', label: 'Payments Processed' },
  { value: '18 yrs', label: 'Serving the Union' },
];

const FEATURES = [
  {
    icon: Users,
    title: 'Member Management',
    description:
      'Track driver profiles, vehicle ownership, membership status, and historical data — all in one auditable database.',
    accent: '#3B82F6',
  },
  {
    icon: BusFront,
    title: 'Fleet & Trip Operations',
    description:
      'Register vehicles, schedule trips, manage bookings, and monitor fleet availability with real-time status tracking.',
    accent: '#8B5CF6',
  },
  {
    icon: ShieldCheck,
    title: 'Financial Records',
    description:
      'Log dues, fines, and trip fares with a full audit trail. Generate transparent financial statements on demand.',
    accent: '#10B981',
  },
  {
    icon: FileText,
    title: 'Application Processing',
    description:
      'Receive, review, and approve membership applications online — no paper forms, no delays.',
    accent: '#F59E0B',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Monthly revenue reports, member activity summaries, and fleet utilisation data — exportable in minutes.',
    accent: '#EF4444',
  },
  {
    icon: MapPin,
    title: 'Route Administration',
    description:
      'Define and manage routes, assign vehicles, and track occupancy across every scheduled service.',
    accent: '#06B6D4',
  },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="flex flex-col w-full">

      {/* ── Hero ── */}
      <section className="relative bg-sidebar text-sidebar-foreground overflow-hidden">
        {/* Dot grid pattern */}
        <div className="absolute inset-0 dot-grid opacity-100" />
        {/* Gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-sidebar/30 via-transparent to-sidebar" />
        {/* Horizontal gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="relative z-10 container mx-auto max-w-5xl px-4 pt-24 pb-32">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-2xl"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-primary px-3 py-1.5 bg-primary/15 rounded-full border border-primary/25 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Digital Transport Cooperative
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6"
            >
              Cooperative<br />
              management<br />
              <span className="text-primary">done right.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-base md:text-lg text-sidebar-foreground/55 max-w-md mb-10 leading-relaxed"
            >
              One platform for members, vehicles, trips, and payments.
              Built for Ghana's transport unions — replacing paper with precision.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
              <Link href="/apply">
                <Button
                  size="lg"
                  className="h-11 px-6 font-semibold text-sm w-full sm:w-auto"
                  data-testid="btn-hero-apply"
                >
                  Apply for Membership
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-6 text-sm border-white/20 text-white hover:bg-white/10 hover:border-white/30 w-full sm:w-auto"
                  data-testid="btn-hero-login"
                >
                  Member Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Floating stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="glass rounded-xl px-4 py-4 text-center"
              >
                <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                <div className="text-[11px] text-sidebar-foreground/50 leading-tight">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4 }}
            className="mb-14"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">
              Platform capabilities
            </p>
            <h2 className="text-3xl font-bold text-foreground mb-4 max-w-lg leading-snug">
              Everything the cooperative needs, nothing it doesn't.
            </h2>
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              A focused toolset that replaces spreadsheets and paper registers
              with a single, auditable digital system.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div key={i} variants={cardVariant}>
                  <Card className="group h-full border-border hover:border-border/80 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-5"
                        style={{ backgroundColor: feature.accent + '18' }}
                      >
                        <Icon
                          className="w-4.5 h-4.5"
                          style={{ color: feature.accent }}
                        />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                    {/* Accent bottom line */}
                    <div
                      className="h-0.5 rounded-b-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ backgroundColor: feature.accent }}
                    />
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 border-t border-border bg-card">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Ready to join?
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Apply for membership today.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Submit your application online. Once approved, you'll get
                immediate access to the member portal.
              </p>
            </div>
            <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
              <Link href="/apply">
                <Button
                  size="lg"
                  className="h-11 px-8 w-full font-semibold"
                  data-testid="btn-bottom-apply"
                >
                  Start Application
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 px-8 w-full"
                  data-testid="btn-bottom-login"
                >
                  Already a member? Sign in
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

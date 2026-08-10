import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function ApplySuccessPage() {
  return (
    <main className="page-shell">
      <section className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="surface-panel px-6 py-10 sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 size={32} strokeWidth={1.8} />
          </div>

          <h1 className="page-title mt-6">
            Application submitted
          </h1>
          <p className="mt-3 text-sm leading-7 text-ink/65">
            Thanks for applying. The secretary&apos;s office will review your
            details and vehicle information. You&apos;ll receive an email with
            your member login once your application is approved.
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-secondary"
          >
            Back to home
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { ArrowRight, BusFront, LockKeyhole } from "lucide-react";
import { getHomeHref } from "@/lib/roleHome";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login(email, password);
      router.push(getHomeHref(user));
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell flex min-h-[calc(100vh-65px)] flex-col items-center justify-center bg-accent/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BusFront size={30} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Welcome back
          </h1>
          <p className="mt-2 text-ink/65">
            Log in to view your profile, payments, and bookings.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="surface-panel mt-6 space-y-5 p-6 sm:p-8">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5"
          >
            {submitting ? "Logging in..." : "Log in"}
            {!submitting && <ArrowRight size={17} />}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-ink/50">
            <LockKeyhole size={13} /> Your account details are securely protected
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-ink/65">
          Not a member yet?{" "}
          <Link
            href="/apply"
            className="font-semibold text-primary hover:text-secondary hover:underline"
          >
            Apply for membership
          </Link>
        </p>
      </div>
    </main>
  );
}
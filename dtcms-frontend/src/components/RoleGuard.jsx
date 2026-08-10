"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui";

export default function RoleGuard({ allow, children }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const normalizedRole = user?.role?.toUpperCase();
  const allowedRoles = (allow || []).map((role) => role?.toUpperCase());

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Covers both "still checking" and "about to redirect" — avoids a flash of
  // the access-denied message right before router.push() kicks in.
  if (loading || !user) {
    return (
      <div className="page-shell flex min-h-[calc(100vh-65px)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!allowedRoles.includes(normalizedRole)) {
    return (
      <div className="page-shell flex min-h-[calc(100vh-65px)] items-center justify-center p-6">
        <div className="surface-panel max-w-md p-8 text-center">
          <h2 className="text-lg font-bold text-primary">You don&apos;t have access to this page</h2>
          <p className="mt-2 text-sm text-ink/60">Limited to: {allowedRoles.join(", ")}.</p>
        </div>
      </div>
    );
  }

  return children;
}
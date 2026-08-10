"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Badge, EmptyState, LoadingSpinner } from "@/components/ui";

export default function DriverTripsPage() {
  const router = useRouter();
  const { user, loading, isDriver } = useAuth();
  const [trips, setTrips] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "DRIVER") return;

    const fetchMyTrips = async () => {
      try {
        const result = await api.get("/trips/mine");
        setTrips(result.data || []);
      } catch (err) {
        setError(err.message || "Could not load your trip schedule.");
      } finally {
        setFetching(false);
      }
    };

    fetchMyTrips();
  }, [user]);

  if (loading || !user) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (!isDriver()) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <div className="surface-panel max-w-md p-8 text-center">
          <h1 className="text-lg font-bold text-primary">
            You don&apos;t have access to this page
          </h1>
          <p className="mt-2 text-sm text-ink/60">Limited to: DRIVER.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-4xl px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
        <p className="eyebrow">Driver workspace</p>
        <h1 className="page-title mt-2">
          My trip schedule
        </h1>
        <p className="mt-3 text-ink/65">
          Trips assigned to you, past and upcoming.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {fetching ? (
          <LoadingSpinner />
        ) : trips.length === 0 ? (
          <div className="mt-8"><EmptyState message="No trips assigned yet." /></div>
        ) : (
          <div className="mt-8 space-y-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="surface-panel px-5 py-4 transition hover:border-secondary/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  {/* TODO(BUG-071, backend): GET /trips/mine doesn't
                      `include: { route: true }` like the other trip endpoints do,
                      so trip.route is always undefined here and this always falls
                      back to "Trip #<id>". Once backend adds the include, this can
                      read trip.route.routeName the same as the other trip pages. */}
                  <h2 className="font-semibold text-primary">
                    {trip.route?.routeName || `Trip #${trip.id}`}
                  </h2>
                  <Badge status={trip.tripStatus} />
                </div>
                <p className="mt-1 text-sm text-ink/70">
                  {trip.scheduledDeparture
                    ? new Date(trip.scheduledDeparture).toLocaleString()
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

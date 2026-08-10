"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ArrowLeft, CalendarCheck, MapPin } from "lucide-react";
import { getHomeHref } from "@/lib/roleHome";
import { Badge, EmptyState, LoadingSpinner } from "@/components/ui";

export default function MemberBookingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      try {
        // TODO(BUG-035, backend): GET /bookings/mine doesn't exist yet.
        // Once implemented, it should include trip + route (same shape as
        // GET /trips/:id/bookings elsewhere) so this page can show a real
        // destination/date — see the fields this reads below.
        const result = await api.get("/bookings/mine");
        setBookings(result.data || []);
      } catch (err) {
        setError(err.message || "Could not load booking history.");
      } finally {
        setFetching(false);
      }
    };

    fetchBookings();
  }, [user]);

  if (loading || !user) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Member workspace</p>
            <h1 className="page-title mt-2">Booking history</h1>
          </div>
          <Link href={getHomeHref(user)} className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary hover:underline">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
        <p className="mt-3 text-ink/65">
          Trips you&apos;ve been booked on, past and upcoming.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {fetching ? (
          <LoadingSpinner />
        ) : bookings.length === 0 ? (
          <div className="mt-8">
            <EmptyState message="No bookings yet." />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking) => {
              // BUG-050/079/080: real Booking field is bookingStatus, not
              // status. tripName/date/destination don't exist on Booking at
              // all — deriving from the trip relation instead (once backend
              // includes it per the TODO above).
              const routeLabel = booking.trip?.route
                ? booking.trip.route.routeName ||
                  `${booking.trip.route.origin} → ${booking.trip.route.destination}`
                : `Trip #${booking.tripId}`;
              const departureLabel = booking.trip?.scheduledDeparture
                ? new Date(booking.trip.scheduledDeparture).toLocaleString()
                : "—";

              const stripColor =
                booking.bookingStatus === "CANCELLED" || booking.bookingStatus === "NO_SHOW"
                  ? "bg-danger"
                  : booking.bookingStatus === "COMPLETED" || booking.bookingStatus === "CONFIRMED"
                  ? "bg-success"
                  : "bg-warning";

              return (
                <div
                  key={booking.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm transition hover:border-secondary/30 hover:shadow-md"
                >
                  <div className={`h-1.5 ${stripColor}`} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <Badge status={booking.bookingStatus} />
                      {booking.seatNumber && (
                        <span className="rounded-md bg-accent px-2 py-1 text-xs font-bold text-primary">
                          Seat {booking.seatNumber}
                        </span>
                      )}
                    </div>
                    <h2 className="flex items-start gap-2 text-sm font-semibold leading-tight text-primary">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-secondary" />
                      {routeLabel}
                    </h2>
                    <div className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-ink/55">
                      <CalendarCheck size={13} />
                      {departureLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

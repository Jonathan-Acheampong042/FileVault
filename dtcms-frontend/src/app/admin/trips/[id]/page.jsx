"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Button, EmptyState, LoadingSpinner } from "@/components/ui";
import RoleGuard from "@/components/RoleGuard";

export default function TripDetailsPage() {
  return (
    <RoleGuard allow={['ADMIN', 'CLIENT_MANAGER']}>
      <TripDetailsContent />
    </RoleGuard>
  );
}

function TripDetailsContent() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestTrip = () =>
    // TODO(BUG-062, backend): GET /trips/:id does not exist yet in trips.js
    // (only /mine, /, and /:id/bookings are registered). Trip details will
    // 404/error until that route is added. Bookings fetch below is fixed and
    // correct independently of this — don't re-break the unwrap once BUG-062
    // lands, the fix is just `tripRes.data`, no double `.data.data`.
    Promise.all([api.get(`/trips/${id}`), api.get(`/trips/${id}/bookings`)]);

  const handleTripResponse = ([tripRes, bookingsRes]) => {
    setTrip(tripRes.data);
    setBookings(bookingsRes.data || []);
  };

  const handleTripError = (err) => {
    // Promise.all rejects together, so a missing GET /trips/:id (BUG-062)
    // will surface here even though the bookings call would have worked.
    setError(
      `${err.message} (if this is a 404 on the trip itself, see BUG-062 — backend route not implemented yet)`
    );
  };

  const loadTrip = () => {
    setLoading(true);
    setError(null);
    requestTrip()
      .then(handleTripResponse)
      .catch(handleTripError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    requestTrip()
      .then(handleTripResponse)
      .catch(handleTripError)
      .finally(() => setLoading(false));
    // Request helpers are intentionally local so retry and initial load share
    // the same flow without changing the existing API calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) {
    return (
      <div className="page-shell min-h-screen p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-danger/20 bg-danger/10 p-6">
          <p className="eyebrow text-danger">Trip unavailable</p>
          <h1 className="mt-2 text-xl font-bold text-primary">We couldn&apos;t load this trip</h1>
          <p className="mt-2 text-sm leading-6 text-danger">{error}</p>
          <Button onClick={loadTrip} className="mt-5">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // BUG-063/064: Trip.route is a relation object (routeName/origin/destination),
  // not a string — rendering it directly crashes the page. Trip.status doesn't
  // exist; the real field is `tripStatus`. Trip.date doesn't exist; the real
  // fields are `scheduledDeparture` / `scheduledArrival`.
  const routeLabel = trip?.route
    ? trip.route.routeName || `${trip.route.origin} → ${trip.route.destination}`
    : "—";
  const departureLabel = trip?.scheduledDeparture
    ? new Date(trip.scheduledDeparture).toLocaleString()
    : "—";

  return (
    <div className="page-shell min-h-screen p-6 sm:p-8 lg:p-10">
      <div className="surface-panel p-6 sm:p-8">
        <p className="eyebrow">Trip details</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="page-title">{routeLabel}</h1>
            <p className="mt-2 text-sm text-ink/60">{departureLabel}</p>
          </div>
          <Badge status={trip?.tripStatus} />
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <p className="eyebrow">Passenger requests</p>
          <h2 className="section-title mt-1">Bookings</h2>
        </div>
        {bookings.length === 0 ? (
          <EmptyState message="No bookings yet." />
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="surface-panel flex items-center justify-between gap-4 px-5 py-4">
                {/* BUG-066/067: real Booking fields are passengerName / bookingStatus,
                    not memberName / status */}
                <span className="font-semibold text-primary">{b.passengerName}</span>
                <Badge status={b.bookingStatus} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
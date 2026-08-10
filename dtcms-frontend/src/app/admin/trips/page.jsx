"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge, Button, EmptyState, LoadingSpinner, Table } from "@/components/ui";
import RoleGuard from "@/components/RoleGuard";

const STATUSES = ["ALL", "SCHEDULED", "DEPARTED", "COMPLETED", "CANCELLED"];

export default function TripsPage() {
  return (
    <RoleGuard allow={['ADMIN', 'CLIENT_MANAGER']}>
      <TripsList />
    </RoleGuard>
  );
}

function TripsList() {
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/trips")
      .then((res) => setTrips(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // BUG-064/070: real Trip field is `tripStatus`, not `status` — the filter
  // buttons silently returned an empty list for every option except "ALL".
  const filtered =
    status === "ALL" ? trips : trips.filter((t) => t.tripStatus === status);

  // BUG-063/064: Trip.route is a relation object (routeName/origin/destination),
  // not a string — rendering it directly crashes the page (same issue fixed on
  // the trip detail page). Trip.date doesn't exist; real fields are
  // scheduledDeparture / scheduledArrival.
  const routeLabel = (trip) =>
    trip.route
      ? trip.route.routeName || `${trip.route.origin} → ${trip.route.destination}`
      : "—";
  const departureLabel = (trip) =>
    trip.scheduledDeparture
      ? new Date(trip.scheduledDeparture).toLocaleString()
      : "—";

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Trips Schedule</h1>
          <p className="mt-1 text-xs text-muted-foreground">Manage routes and scheduled departures</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/trips/new"}>
          +&nbsp; Schedule Trip
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 rounded-xl border border-card-border bg-card p-3 shadow-sm">
        {STATUSES.map((s) => (
          <Button
            type="button"
            variant={status === s ? "primary" : "secondary"}
            key={s}
            onClick={() => setStatus(s)}
            className="rounded-md px-3 py-1.5 text-[0.65rem] shadow-none"
          >
            {s}
          </Button>
        ))}
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="mt-6 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {!loading && !error && (
        filtered.length === 0 ? (
          <div className="mt-4"><EmptyState message="No trips found." /></div>
        ) : (
          <div className="mt-4">
            <Table
              columns={[
                 { key: 'route', label: 'Route / ID', render: (row) => <div><p className="font-semibold text-primary">{routeLabel(row)}</p><p className="text-[0.62rem] text-muted-foreground">{row.route ? `${row.route.origin} → ${row.route.destination}` : `Trip #${row.id}`}</p></div> },
                 { key: 'scheduledDeparture', label: 'Departure', render: (row) => <div><p className="font-semibold text-ink">{row.scheduledDeparture ? new Date(row.scheduledDeparture).toLocaleDateString() : '—'}</p><p className="text-[0.62rem] text-muted-foreground">{departureLabel(row).split(',').slice(1).join(',').trim()}</p></div> },
                 { key: 'vehicleId', label: 'Vehicle & Driver', render: (row) => <div><p className="font-semibold text-ink">{row.vehicle?.plateNumber || row.vehicleId || '—'}</p><p className="text-[0.62rem] text-muted-foreground">{row.driver?.fullName || 'Unassigned'}</p></div> },
                 { key: 'bookings', label: 'Bookings', render: (row) => <span className="rounded bg-accent px-2 py-1 text-xs font-semibold text-ink">{row.bookingsCount ?? row.bookedSeats ?? 0} / {row.availableSeats ?? '—'}</span> },
                { key: 'tripStatus', label: 'Status', render: (row) => <Badge status={row.tripStatus} /> },
                {
                  key: 'id',
                  label: 'Action',
                  render: (row) => (
                   <Link href={`/admin/trips/${row.id}`} className="inline-flex rounded-md border border-primary/15 px-3 py-1.5 text-[0.65rem] font-semibold text-ink hover:border-primary hover:text-primary">
                       Manage
                    </Link>
                  ),
                },
              ]}
              data={filtered}
            />
          </div>
        )
      )}
    </div>
  );
}

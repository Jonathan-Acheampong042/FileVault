"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Button, EmptyState, LoadingSpinner, Table } from "@/components/ui";
import RoleGuard from "@/components/RoleGuard";

export default function BookingsPage() {
  return (
    <RoleGuard allow={['ADMIN', 'CLIENT_MANAGER']}>
      <BookingsList />
    </RoleGuard>
  );
}

function BookingsList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/bookings")
      .then((res) => setBookings(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">All Bookings</h1>
          <p className="mt-1 text-xs text-muted-foreground">Global view of all ticket reservations</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/bookings/new"}>
          +&nbsp; Create Booking
        </Button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="mt-6 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {!loading && !error && (
        bookings.length === 0 ? (
          <div className="mt-8"><EmptyState message="No bookings yet." /></div>
        ) : (
          <div className="mt-8">
            <Table
              columns={[
                { key: 'memberName', label: 'Passenger', render: (row) => <span className="font-semibold text-ink">{row.memberName || row.passengerName || '—'}</span> },
                { key: 'tripRoute', label: 'Trip Details', render: (row) => <div><p className="font-semibold text-primary">{row.tripRoute || row.tripId}</p><p className="text-[0.62rem] text-muted-foreground">{row.tripDate || 'Scheduled trip'}</p></div> },
                { key: 'seat', label: 'Seat', render: (row) => <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-ink">{row.seatNumber || row.seat || 1}</span> },
                { key: 'fare', label: 'Fare', render: (row) => row.fare != null ? `GHS ${Number(row.fare).toFixed(2)}` : '—' },
                { key: 'status', label: 'Status', render: (row) => <Badge status={row.status || row.bookingStatus} /> },
              ]}
              data={bookings}
            />
          </div>
        )
      )}
    </div>
  );
}

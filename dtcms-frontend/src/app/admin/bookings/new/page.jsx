"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { Button, Input } from "@/components/ui";

export default function NewBookingPage() {
  return (
    <RoleGuard allow={['ADMIN', 'CLIENT_MANAGER']}>
      <NewBookingForm />
    </RoleGuard>
  );
}

function NewBookingForm() {
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/trips").then((res) => setTrips(res.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // handleSubmit — api.post call
await api.post("/bookings", { tripId, passengerName: memberName, bookingStatus: "CONFIRMED" });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6">
        <p className="eyebrow">Client operations</p>
        <h1 className="page-title mt-2">Create Booking</h1>
        <p className="mt-1 text-xs text-muted-foreground">Reserve a passenger seat on a scheduled trip</p>
      </div>
      <div className="surface-panel max-w-2xl p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-ink">
          <span>Trip</span>
        <select
          className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
          value={tripId}
          onChange={(e) => setTripId(e.target.value)}
          required
        >
          <option value="" disabled>
            Select a trip
          </option>
         {trips.map((t) => (
  <option key={t.id} value={t.id}>
    {t.route?.routeName || `${t.route?.origin ?? "?"} → ${t.route?.destination ?? "?"}`}
    {" — "}
    {t.scheduledDeparture ? new Date(t.scheduledDeparture).toLocaleString() : "—"}
  </option>
))}
        </select>
        </label>
        <Input
          label="Member name"
          placeholder="Member name"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create booking"}
        </Button>
      </form>
      </div>
    </div>
  );
}
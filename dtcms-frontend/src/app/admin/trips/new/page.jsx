"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { Button, Input } from "@/components/ui";

// TODO(BUG-072, backend — blocking): There is no CRUD endpoint for the Route
// model anywhere in the backend, but Trip.routeId is a required FK to it, and
// Trip also requires vehicleId, driverId, scheduledDeparture, scheduledArrival,
// availableSeats, and tripCode — none of which this form currently collects.
// This form posts { route, date, status } today, none of which match the real
// Trip schema at all. Do not "fix" this by renaming fields — it needs:
//   1. Backend: a Route CRUD endpoint (list at minimum) — BUG-072
//   2. Backend: POST /trips implemented against the real required fields — BUG-025
//   3. Frontend: replace the two text inputs below with a Route picker, a
//      Vehicle picker (GET /vehicles already exists), a Driver picker (GET
//      /members filtered to DRIVER role/memberType — no dedicated endpoint
//      exists for this either, worth asking backend for one), and separate
//      departure/arrival datetime inputs plus an available-seats number input.
// Leaving the old (broken) implementation in place below rather than guessing
// at a redesign against endpoints that don't exist yet.

export default function NewTripPage() {
  return (
    <RoleGuard allow={['ADMIN', 'CLIENT_MANAGER']}>
      <NewTripForm />
    </RoleGuard>
  );
}

function NewTripForm() {
  const router = useRouter();
  const [route, setRoute] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/trips", { route, date, status: "SCHEDULED" });
      router.push(`/admin/trips/${res.data?.id ?? ""}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6">
        <p className="eyebrow">Network planning</p>
        <h1 className="page-title mt-2">Schedule Trip</h1>
        <p className="mt-1 text-xs text-muted-foreground">Create a scheduled journey for the cooperative</p>
      </div>
      <div className="surface-panel max-w-2xl p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Route"
          placeholder="Route (e.g. Accra - Kumasi)"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          required
        />
        <Input
          label="Departure date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create trip"}
        </Button>
      </form>
      </div>
    </div>
  );
}
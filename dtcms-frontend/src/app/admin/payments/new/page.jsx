"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { Button, Input } from "@/components/ui";

export default function NewPaymentPage() {
  return (
    <RoleGuard allow={['ADMIN', 'TREASURER']}>
      <NewPaymentForm />
    </RoleGuard>
  );
}

function NewPaymentForm() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MOMO");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
   // useEffect fetch
api.get("/bookings").then((res) => setBookings(res.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/payments", { bookingId, amount: Number(amount), method, status: "PAID" });
      router.push("/admin/payments");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6">
        <p className="eyebrow">Finance</p>
        <h1 className="page-title mt-2">Record Payment</h1>
        <p className="mt-1 text-xs text-muted-foreground">Add a payment to the cooperative ledger</p>
      </div>
      <div className="surface-panel max-w-2xl p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-ink">
          <span>Booking</span>
        <select
          className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          required
        >
          <option value="" disabled>
            Select booking
          </option>
        
{bookings.map((b) => (
  <option key={b.id} value={b.id}>
    {b.passengerName} — Trip #{b.tripId}
  </option>
))}
        </select>
        </label>
        <Input
          label="Amount"
          type="number"
          placeholder="Amount (GHS)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <label className="block text-sm font-semibold text-ink">
          <span>Payment method</span>
        <select className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="MOMO">Mobile Money</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card / Paystack</option>
        </select>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Recording…" : "Record payment"}
        </Button>
      </form>
      </div>
    </div>
  );
}
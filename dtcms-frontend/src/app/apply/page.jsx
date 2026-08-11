"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { BusFront, Car, User } from "lucide-react";

const VEHICLE_TYPES = ["TAXI", "MINIBUS", "BUS", "TRUCK"];

const initialForm = {
  applicantName: "",
  applicantPhone: "",
  applicantEmail: "",
  applicantAddress: "",
  nationalId: "",
  dateOfBirth: "",
  vehicleDetails: {
    plateNumber: "",
    type: "TAXI",
    make: "",
    model: "",
    year: new Date().getFullYear(),
  },
};

export default function ApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehicleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      vehicleDetails: { ...prev.vehicleDetails, [field]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post("/applications", {
        ...form,
        vehicleDetails: {
          ...form.vehicleDetails,
          year: form.vehicleDetails.year ? Number(form.vehicleDetails.year) : undefined,
        },
      });
      router.push("/apply/success");
    } catch (err) {
      setError(err.message || "Something went wrong submitting your application.");
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-3xl px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <BusFront size={26} className="text-primary" />
          </div>
          <p className="eyebrow">Join the cooperative</p>
          <h1 className="page-title mt-2">Membership application</h1>
          <p className="mt-3 text-ink/65">
            Complete the form below to apply to join the transport cooperative.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="surface-panel mt-8 space-y-8 p-6 sm:p-8">
          {/* Personal information */}
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-primary/10 pb-3">
              <User size={17} className="text-secondary" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
                Personal information
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Full name"
                value={form.applicantName}
                onChange={(e) => handleChange("applicantName", e.target.value)}
                required
              />
              <Input
                label="National ID"
                placeholder="GHA-123456789-0"
                value={form.nationalId}
                onChange={(e) => handleChange("nationalId", e.target.value)}
                required
              />
              <Input
                label="Email address"
                type="email"
                value={form.applicantEmail}
                onChange={(e) => handleChange("applicantEmail", e.target.value)}
                required
              />
              <Input
                label="Phone number"
                placeholder="024 123 4567"
                value={form.applicantPhone}
                onChange={(e) => handleChange("applicantPhone", e.target.value)}
                required
              />
              <Input
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                required
              />
              <Input
                label="Residential address"
                value={form.applicantAddress}
                onChange={(e) => handleChange("applicantAddress", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Vehicle details */}
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-primary/10 pb-3">
              <Car size={17} className="text-secondary" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
                Vehicle details
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="License plate number"
                placeholder="GR-1234-23"
                className="uppercase"
                value={form.vehicleDetails.plateNumber}
                onChange={(e) => handleVehicleChange("plateNumber", e.target.value)}
                required
              />
              <label className="block text-sm font-medium text-ink">
                <span>Vehicle type</span>
                <select
                  value={form.vehicleDetails.type}
                  onChange={(e) => handleVehicleChange("type", e.target.value)}
                  className="mt-2 block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-ink shadow-xs outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <Input
                label="Make"
                placeholder="Toyota"
                value={form.vehicleDetails.make}
                onChange={(e) => handleVehicleChange("make", e.target.value)}
                required
              />
              <Input
                label="Model"
                placeholder="Corolla"
                value={form.vehicleDetails.model}
                onChange={(e) => handleVehicleChange("model", e.target.value)}
                required
              />
              <Input
                label="Year"
                type="number"
                value={form.vehicleDetails.year}
                onChange={(e) => handleVehicleChange("year", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-primary/10 pt-6">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Submitting..." : "Submit application"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

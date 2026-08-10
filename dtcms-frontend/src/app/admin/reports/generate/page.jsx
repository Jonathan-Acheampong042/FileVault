"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { Button, Input } from "@/components/ui";

export default function GenerateReportPage() {
  return (
    <RoleGuard allow={['ADMIN','SECRETARY','TREASURER']}>
      <GenerateReportForm />
    </RoleGuard>
  );
}

function GenerateReportForm() {
  const router = useRouter();
  const [type, setType] = useState("TRIPS");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState("PDF");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("Start date must be before end date.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/reports/generate", { type, dateFrom, dateTo, format });
      router.push("/admin/reports");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6">
        <p className="eyebrow">Insights</p>
        <h1 className="page-title mt-2">Generate Report</h1>
        <p className="mt-1 text-xs text-muted-foreground">Create a downloadable activity summary</p>
      </div>
      <div className="surface-panel max-w-2xl p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-ink">
          <span>Report type</span>
        <select className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="TRIPS">Trips summary</option>
          <option value="BOOKINGS">Bookings summary</option>
          <option value="PAYMENTS">Payments / financial</option>
        </select>
        </label>
        <Input
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          required
        />
        <Input
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          required
        />
        <label className="block text-sm font-semibold text-ink">
          <span>Format</span>
        <select className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="PDF">PDF</option>
          <option value="CSV">CSV</option>
        </select>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Generating…" : "Generate report"}
        </Button>
      </form>
      </div>
    </div>
  );
}
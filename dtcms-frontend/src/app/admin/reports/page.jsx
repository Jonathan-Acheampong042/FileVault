"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Button, EmptyState, LoadingSpinner, Table } from "@/components/ui";
import RoleGuard from "@/components/RoleGuard";
import { formatDate } from '@/lib/formatDate';

export default function ReportsPage() {
  return (
    <RoleGuard allow={['ADMIN','SECRETARY','TREASURER','COMMITTEE']}>
      <ReportsList />
    </RoleGuard>
  );
}

function ReportsList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/reports")
      .then((res) => setReports(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/reports/${id}/download`);
      const url = res.data?.url || res.data?.data?.url;
      if (url) window.open(url, "_blank");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="mt-1 text-xs text-muted-foreground">Generated data extracts and summaries</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/reports/generate"}>
          +&nbsp; Generate Report
        </Button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="mt-6 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {!loading && !error && (
        reports.length === 0 ? (
          <div className="mt-8"><EmptyState message="No reports yet." /></div>
        ) : (
          <div className="mt-8">
            <Table
              columns={[
                { key: 'name', label: 'Report Name', sortable: true, render: (row) => <div><p className="font-semibold text-ink">{row.name || `${row.type} Report`}</p><p className="text-[0.62rem] text-muted-foreground">Format: {row.format || 'PDF'}</p></div> },
                { key: 'type', label: 'Type', sortable: true },
                { key: 'dateFrom', label: 'Date Range', render: (row) => `${formatDate(row.dateFrom)} → ${formatDate(row.dateTo)}` },
                { key: 'generatedAt', label: 'Generated', render: (row) => row.generatedAt ? new Date(row.generatedAt).toLocaleString() : '—' },
                { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
                {
                  key: 'id',
                  label: 'Action',
                  render: (row) => (
                    <Button
                      variant="secondary"
                      disabled={row.status !== "READY"}
                      onClick={() => handleDownload(row.id)}
                       className="px-3 py-1.5 text-[0.65rem] shadow-none"
                    >
                      Download
                    </Button>
                  ),
                },
              ]}
              data={reports}
            />
          </div>
        )
      )}
    </div>
  );
}

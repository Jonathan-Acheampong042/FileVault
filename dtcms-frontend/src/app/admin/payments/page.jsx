"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Button, EmptyState, LoadingSpinner, Table } from "@/components/ui";
import RoleGuard from "@/components/RoleGuard";

export default function PaymentsPage() {
  return (
    <RoleGuard allow={["ADMIN", "TREASURER"]}>
      <PaymentsList />
    </RoleGuard>
  );
}

function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/payments")
      .then((res) => setPayments(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Financial Ledger</h1>
          <p className="mt-1 text-xs text-muted-foreground">View all cooperative transactions and payments</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/payments/new"}>
          +&nbsp; Record Payment
        </Button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="mt-6 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {!loading && !error && (
        payments.length === 0 ? (
          <div className="mt-8"><EmptyState message="No payments recorded yet." /></div>
        ) : (
          <div className="mt-8">
            <Table
              columns={[
                { key: 'bookingId', label: 'Date', sortable: true, render: (row) => row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '—' },
                { key: 'memberName', label: 'Member', sortable: true, render: (row) => <span className="font-semibold text-primary">{row.memberName || row.passengerName || row.bookingId}</span> },
                { key: 'type', label: 'Type', render: (row) => <div><p className="font-semibold text-ink">{row.type || row.paymentType || 'PAYMENT'}</p><p className="text-[0.62rem] text-muted-foreground">{row.description || 'Cooperative transaction'}</p></div> },
                { key: 'method', label: 'Method', render: (row) => String(row.method || '—').replace('_', ' ') },
                { key: 'amount', label: 'Amount', sortable: true, render: (row) => row.amount != null ? `GHS ${Number(row.amount).toFixed(2)}` : '—' },
                { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
              ]}
              data={payments}
            />
          </div>
        )
      )}
    </div>
  );
}

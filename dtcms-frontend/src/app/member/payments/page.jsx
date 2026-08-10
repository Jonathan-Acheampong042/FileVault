"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { Badge, EmptyState, LoadingSpinner, Table } from "@/components/ui";

export default function MemberPaymentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [payments, setPayments] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchPayments = async () => {
      try {
        const memberId = user?.member?.id;
        if (!memberId) {
          throw new Error("No member profile linked to this account.");
        }

        const result = await api.get(`/payments/member/${memberId}`);
        setPayments(result.data || []);
      } catch (err) {
        setError(err.message || "Could not load payment history.");
      } finally {
        setFetching(false);
      }
    };

    fetchPayments();
  }, [user]);

  if (loading || !user) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-4xl px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Member workspace</p>
            <h1 className="page-title mt-2">Payment history</h1>
          </div>
          <Link href="/member/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary hover:underline">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
        <p className="mt-3 text-ink/65">
          Every due and payment recorded against your account.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {fetching ? (
          <LoadingSpinner />
        ) : payments.length === 0 ? (
          <div className="mt-8">
            <EmptyState message="No payments recorded yet." />
          </div>
        ) : (
          <div className="mt-8">
            <Table
              columns={[
                {
                  key: "paymentDate",
                  label: "Date",
                  render: (payment) =>
                    payment.paymentDate
                      ? new Date(payment.paymentDate).toLocaleDateString()
                      : "—",
                },
                {
                  key: "paymentCategory",
                  label: "Category",
                  render: (payment) => payment.paymentCategory || "—",
                },
                {
                  key: "amountPaid",
                  label: "Amount",
                  render: (payment) =>
                    payment.amountPaid != null
                      ? `GHS ${Number(payment.amountPaid).toLocaleString()}`
                      : "—",
                },
                {
                  key: "paymentStatus",
                  label: "Status",
                  render: (payment) => <Badge status={payment.paymentStatus} />,
                },
              ]}
              data={payments}
            />
          </div>
        )}
      </section>
    </main>
  );
}

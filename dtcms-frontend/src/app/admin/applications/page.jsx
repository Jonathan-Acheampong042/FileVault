'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge, Button, EmptyState, LoadingSpinner, Table } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';
import { Eye } from 'lucide-react';

export default function ApplicationsListPage() {
  return (
    <RoleGuard allow={['ADMIN','SECRETARY']}>
      <ApplicationsListContent />
    </RoleGuard>
  );
}

function ApplicationsListContent() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        // This hits the GET / route we added to your backend earlier
        const result = await api.get('/applications');
        setApplications(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="p-6 text-sm text-danger">{error}</p>;

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6">
        <h1 className="page-title">Pending Applications</h1>
        <p className="mt-1 text-xs text-muted-foreground">Review and process new membership requests</p>
      </div>

      {applications.length === 0 ? (
        <div className="mt-8"><EmptyState message="No applications found." /></div>
      ) : (
        <div className="mt-8">
            <Table
            columns={[
              { key: 'applicantName', label: 'Applicant', sortable: true, render: (row) => <div><p className="font-semibold text-ink">{row.applicantName}</p><p className="text-[0.62rem] text-muted-foreground">{row.nationalId || 'National ID not provided'}</p></div> },
              { key: 'applicantEmail', label: 'Contact', sortable: true, render: (row) => <div><p className="font-semibold text-ink">{row.applicantPhone || '—'}</p><p className="text-[0.62rem] text-muted-foreground">{row.applicantEmail}</p></div> },
              { key: 'vehicleDetails', label: 'Vehicle Offered', render: (row) => <div><p className="font-semibold text-ink">{row.vehicleDetails?.plateNumber || '—'}</p><p className="text-[0.62rem] text-muted-foreground">{row.vehicleDetails ? `${row.vehicleDetails.type || ''} · ${row.vehicleDetails.make || ''}` : 'No vehicle details'}</p></div> },
              { key: 'createdAt', label: 'Submitted', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—' },
              { key: 'status', label: 'Status', render: (row) => <Badge status={row.status || 'PENDING'} /> },
              {
                key: 'id',
                label: 'Action',
                render: (row) => (
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/admin/applications/${row.id}`)}
                    className="px-3 py-1.5 text-[0.65rem] shadow-none"
                  >
                    <Eye size={13} /> Review
                  </Button>
                ),
              },
            ]}
            data={applications}
          />
        </div>
      )}
    </div>
  );
}
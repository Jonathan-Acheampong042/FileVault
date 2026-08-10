'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge, Button, Modal, LoadingSpinner } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';
import { formatDate } from '@/lib/formatDate';

export default function ApplicationDetailPage() {
  return (
    <RoleGuard allow={['ADMIN','SECRETARY']}>
      <ApplicationDetailContent />
    </RoleGuard>
  );
}

function ApplicationDetailContent() {
  const router = useRouter();
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [action, setAction] = useState(null); // 'APPROVED' or 'REJECTED'
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const result = await api.get(`/applications/${id}`);
        setApplication(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  const openModal = (decision) => {
    setAction(decision);
    setRejectionReason('');
    setModalOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.post(`/applications/${id}/review`, {
        decision: action,
        rejectionReason: action === 'REJECTED' ? rejectionReason : undefined,
      });
      setModalOpen(false);
      router.push('/admin/applications');
    } catch (err) {
      setError(err.message);
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error && !application) {
    return <p className="p-6 text-sm text-danger">{error}</p>;
  }

  if (!application) return null;

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Member intake</p>
          <h1 className="page-title mt-2">Application Review</h1>
          <p className="mt-1 text-xs text-muted-foreground">Review applicant information before making a decision</p>
        </div>
        <Badge status={application.status || 'PENDING'} />
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
        <section className="surface-panel p-5 sm:p-6">
          <h2 className="text-sm font-bold text-ink">Applicant Information</h2>
          <div className="mt-5 space-y-4">
            <Field label="Name" value={application.applicantName} />
            <Field label="Email" value={application.applicantEmail} />
            <Field label="Phone" value={application.applicantPhone} />
            <Field label="Address" value={application.applicantAddress} />
            <Field label="National ID" value={application.nationalId} />
            <Field label="Date of Birth" value={formatDate(application.dateOfBirth)} />
          </div>
        </section>

        <section className="surface-panel p-5 sm:p-6">
          <h2 className="text-sm font-bold text-ink">Vehicle Information</h2>
          {application.vehicleDetails ? (
            <div className="mt-5 space-y-4">
              <Field label="Plate Number" value={application.vehicleDetails.plateNumber} />
              <Field label="Type" value={application.vehicleDetails.type} />
              <Field label="Make / Model" value={`${application.vehicleDetails.make} ${application.vehicleDetails.model}`} />
              <Field label="Year" value={application.vehicleDetails.year} />
            </div>
          ) : (
            <p className="mt-5 text-xs text-muted-foreground">No vehicle details submitted.</p>
          )}
        </section>
      </div>

      {(!application.status || application.status === 'PENDING') && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => openModal('APPROVED')}>
            Approve Application
          </Button>
          <Button variant="danger" onClick={() => openModal('REJECTED')}>
            Reject Application
          </Button>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        title={action === 'APPROVED' ? 'Approve this application?' : 'Reject this application?'}
        confirmLabel={submitting ? 'Submitting...' : action === 'APPROVED' ? 'Approve' : 'Reject'}
        confirmVariant={action === 'APPROVED' ? 'primary' : 'danger'}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      >
        {action === 'REJECTED' && (
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
             className="mt-2 w-full rounded-lg border border-primary/15 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
          />
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className="font-medium text-ink">{value || '—'}</span>
    </div>
  );
}
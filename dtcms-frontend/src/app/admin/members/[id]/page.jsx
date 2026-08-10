'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge, Button, Input, LoadingSpinner } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';

export default function MemberDetailPage() {
  return (
    <RoleGuard allow={['ADMIN','SECRETARY']}>
      <MemberDetailContent />
    </RoleGuard>
  );
}

function MemberDetailContent() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const result = await api.get(`/members/${id}`);
        setMember(result.data);
        setForm(result.data);
      } catch (err) {
        console.error('Failed to load member:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.put(`/members/${id}`, form);
      setMember(result.data);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to update member:', err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error && !member) {
    return (
      <div className="p-6">
        <p className="text-sm text-danger">Failed to load member: {error}</p>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <Button
        variant="secondary"
        onClick={() => router.push('/admin/members')}
        className="mb-5 border-0 bg-transparent px-0 py-0 text-secondary shadow-none hover:bg-transparent hover:text-primary hover:shadow-none"
      >
        ← Back to Members
      </Button>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">People</p>
          <h1 className="page-title mt-2">{member?.fullName || 'Member Details'}</h1>
          <p className="mt-1 text-xs text-muted-foreground">View and update member records</p>
        </div>
        {member?.status && <Badge status={member.status} />}
      </div>

      <div className="surface-panel max-w-3xl">
        <div className="border-b border-card-border px-4 py-4 sm:px-6">
          <h2 className="text-sm font-bold text-ink">Member Information</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <Field
            label="Full Name"
            value={form.fullName || ''}
            onChange={(v) => handleChange('fullName', v)}
          />
          <Field
            label="Email"
            value={form.email || ''}
            onChange={(v) => handleChange('email', v)}
            type="email"
          />
          <Field
            label="Phone"
            value={form.phone || ''}
            onChange={(v) => handleChange('phone', v)}
          />
          <Field
            label="Address"
            value={form.address || ''}
            onChange={(v) => handleChange('address', v)}
          />
          <Field
            label="National ID"
            value={form.nationalId || ''}
            onChange={(v) => handleChange('nationalId', v)}
          />

          <div>
            <label className="block text-sm font-semibold text-ink">
              Status
            </label>
            <select
              value={form.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
              className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="RETIRED">RETIRED</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {success && (
        <p className="mt-4 text-sm text-success">Member updated successfully.</p>
      )}

      <div className="mt-6 flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <Input label={label} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
  );
}
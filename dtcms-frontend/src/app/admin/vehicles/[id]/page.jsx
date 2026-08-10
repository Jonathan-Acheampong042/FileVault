'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge, Button, Input, LoadingSpinner } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';

const VEHICLE_TYPES = ['BUS', 'COACH', 'MINIBUS'];
const VEHICLE_STATUSES = ['ACTIVE', 'ON_TRIP', 'MAINTENANCE', 'RETIRED'];

export default function VehicleDetailPage() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <VehicleDetailContent />
    </RoleGuard>
  );
}

function VehicleDetailContent() {
  const { id } = useParams();
  const router = useRouter();

  const [vehicle, setVehicle] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const result = await api.get(`/vehicles/${id}`);
        setVehicle(result.data);
        setForm(result.data);
      } catch (err) {
        console.error('Failed to load vehicle:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // BUG-030/053: GET /vehicles/:id layers convenience aliases `type`/
      // `status` on top of the real `vehicleType`/`vehicleStatus` fields.
      // Strip them out before PUT — Vehicle has no `type`/`status` fields at
      // all, so sending them back crashes the update.
      const rest = { ...form };
      delete rest.type;
      delete rest.status;
      const result = await api.put(`/vehicles/${id}`, {
        ...rest,
        year: form.year ? Number(form.year) : undefined,
      });
      setVehicle(result.data);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to update vehicle:', err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deactivate this vehicle? This cannot be undone.')) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/vehicles/${id}`);
      router.push('/admin/vehicles');
    } catch (err) {
      console.error('Failed to deactivate vehicle:', err.message);
      setError(err.message);
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error && !vehicle) {
    return (
      <div className="p-6">
        <p className="text-sm text-danger">Failed to load vehicle: {error}</p>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <Button
        variant="secondary"
        onClick={() => router.push('/admin/vehicles')}
        className="mb-5 border-0 bg-transparent px-0 py-0 text-secondary shadow-none hover:bg-transparent hover:text-primary hover:shadow-none"
      >
        ← Back to Vehicles
      </Button>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Fleet</p>
          <h1 className="page-title mt-2">{vehicle?.plateNumber || 'Vehicle Details'}</h1>
          <p className="mt-1 text-xs text-muted-foreground">View and update vehicle records</p>
        </div>
        {vehicle?.vehicleStatus && <Badge status={vehicle.vehicleStatus} />}
      </div>

      <div className="surface-panel max-w-3xl">
        <div className="border-b border-card-border px-4 py-4 sm:px-6">
          <h2 className="text-sm font-bold text-ink">Vehicle Information</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <Field label="Plate Number" value={form.plateNumber || ''} onChange={(v) => handleChange('plateNumber', v)} />
          <Field label="Make" value={form.make || ''} onChange={(v) => handleChange('make', v)} />
          <Field label="Model" value={form.model || ''} onChange={(v) => handleChange('model', v)} />
          <Field label="Year" type="number" value={form.year || ''} onChange={(v) => handleChange('year', v)} />

          <div>
            <label className="block text-sm font-semibold text-ink">Type</label>
            <select
              value={form.vehicleType || ''}
              onChange={(e) => handleChange('vehicleType', e.target.value)}
              className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink">Status</label>
            <select
              value={form.vehicleStatus || ''}
              onChange={(e) => handleChange('vehicleStatus', e.target.value)}
              className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
            >
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {success && <p className="mt-4 text-sm text-success">Vehicle updated successfully.</p>}

      <div className="mt-6 flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deactivating...' : 'Deactivate Vehicle'}
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
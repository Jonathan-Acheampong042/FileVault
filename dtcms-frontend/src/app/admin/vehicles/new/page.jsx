'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';

// BUG-030/053/073: the old form sent `type`/`status` (real Prisma field
// names are `vehicleType`/`vehicleStatus`) with a free-text type and invalid
// status options (SUSPENDED/EXPIRED aren't in VehicleStatus), and never
// collected seatingCapacity, fuelType, chassisNumber, color, or dateAdded at
// all — all required, non-defaulted fields on Vehicle. Any submission with
// the old form would fail a Prisma validation error no matter what was
// typed in. This collects the real required fields with the real names and
// valid enum values.
const VEHICLE_TYPES = ['BUS', 'COACH', 'MINIBUS'];
const FUEL_TYPES = ['DIESEL', 'PETROL', 'CNG'];
const VEHICLE_STATUSES = ['ACTIVE', 'ON_TRIP', 'MAINTENANCE', 'RETIRED'];
const OWNERSHIP_TYPES = ['COOPERATIVE', 'MEMBER_OWNED'];

const initialForm = {
  plateNumber: '',
  make: '',
  model: '',
  year: '',
  vehicleType: 'BUS',
  seatingCapacity: '',
  fuelType: 'DIESEL',
  chassisNumber: '',
  color: '',
  ownershipType: 'COOPERATIVE',
  vehicleStatus: 'ACTIVE',
  dateAdded: '',
};

export default function NewVehiclePage() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <NewVehicleForm />
    </RoleGuard>
  );
}

function NewVehicleForm() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post('/vehicles', {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        seatingCapacity: form.seatingCapacity ? Number(form.seatingCapacity) : undefined,
        dateAdded: form.dateAdded ? new Date(form.dateAdded).toISOString() : undefined,
      });
      router.push('/admin/vehicles');
    } catch (err) {
      console.error('Failed to register vehicle:', err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <Button
        variant="secondary"
        onClick={() => router.push('/admin/vehicles')}
        className="mb-5 border-0 bg-transparent px-0 py-0 text-secondary shadow-none hover:bg-transparent hover:text-primary hover:shadow-none"
      >
        ← Back to Vehicles
      </Button>

      <div className="mb-6">
        <p className="eyebrow">Fleet</p>
        <h1 className="page-title mt-2">Register New Vehicle</h1>
        <p className="mt-1 text-xs text-muted-foreground">Add a vehicle to the cooperative fleet</p>
      </div>

      <form onSubmit={handleSubmit} className="surface-panel max-w-3xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plate Number" value={form.plateNumber} onChange={(v) => handleChange('plateNumber', v)} required />
        <Field label="Make" value={form.make} onChange={(v) => handleChange('make', v)} required />
        <Field label="Model" value={form.model} onChange={(v) => handleChange('model', v)} required />
        <Field label="Year" type="number" value={form.year} onChange={(v) => handleChange('year', v)} required />
        <Field label="Chassis Number" value={form.chassisNumber} onChange={(v) => handleChange('chassisNumber', v)} required />
        <Field label="Color" value={form.color} onChange={(v) => handleChange('color', v)} required />
        <Field label="Seating Capacity" type="number" value={form.seatingCapacity} onChange={(v) => handleChange('seatingCapacity', v)} required />
        <Field label="Date Added" type="date" value={form.dateAdded} onChange={(v) => handleChange('dateAdded', v)} required />

        <SelectField label="Vehicle Type" value={form.vehicleType} onChange={(v) => handleChange('vehicleType', v)} options={VEHICLE_TYPES} />
        <SelectField label="Fuel Type" value={form.fuelType} onChange={(v) => handleChange('fuelType', v)} options={FUEL_TYPES} />
        <SelectField label="Ownership" value={form.ownershipType} onChange={(v) => handleChange('ownershipType', v)} options={OWNERSHIP_TYPES} />
        <SelectField label="Status" value={form.vehicleStatus} onChange={(v) => handleChange('vehicleStatus', v)} options={VEHICLE_STATUSES} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Registering...' : 'Register Vehicle'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <Input
      label={label}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    />
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}
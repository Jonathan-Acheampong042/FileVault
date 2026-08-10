'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Table, LoadingSpinner, EmptyState, Badge, Button, Input } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';

export default function VehiclesPage() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <VehiclesList />
    </RoleGuard>
  );
}

function VehiclesList() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const result = await api.get('/vehicles');
        setVehicles(result.data);
      } catch (err) {
        console.error('Failed to load vehicles:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // BUG-045: GET /vehicles (list) returns raw Prisma rows — real fields are
  // vehicleType/vehicleStatus, not type/status.
  const types = ['ALL', ...new Set(vehicles.map((v) => v.vehicleType).filter(Boolean))];
  const statuses = ['ALL', ...new Set(vehicles.map((v) => v.vehicleStatus).filter(Boolean))];

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      v.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || v.vehicleType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || v.vehicleStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const columns = [
    { key: 'plateNumber', label: 'Plate Number', sortable: true },
    { key: 'make', label: 'Make', sortable: true },
    { key: 'model', label: 'Model', sortable: true },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'vehicleType', label: 'Type', sortable: true },
    {
      key: 'vehicleStatus',
      label: 'Status',
      sortable: true,
      render: (row) => <Badge status={row.vehicleStatus} />,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Fleet Management</h1>
          <p className="mt-1 text-xs text-muted-foreground">Manage all registered cooperative vehicles</p>
        </div>
        <Button onClick={() => router.push('/admin/vehicles/new')}>
          +&nbsp; Add Vehicle
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-card-border bg-card p-4 shadow-sm">
        <div className="w-full max-w-xs">
          <Input
            label="Search vehicles"
            type="text"
            placeholder="Search by plate, make, or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-primary/15 bg-white px-3.5 py-2 text-xs text-ink shadow-xs outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
        >
          {types.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-primary/15 bg-white px-3.5 py-2 text-xs text-ink shadow-xs outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 text-sm text-danger">
          Failed to load vehicles: {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="No vehicles found" />
      ) : (
        <Table
          columns={columns}
          data={filtered}
          onRowClick={(row) => router.push(`/admin/vehicles/${row.id}`)}
        />
      )}
    </div>
  );
}

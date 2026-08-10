'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Table, LoadingSpinner, EmptyState, Badge, Input } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';
import { UserRound } from 'lucide-react';

export default function MembersPage() {
  return (
    <RoleGuard allow={['ADMIN','SECRETARY']}>
      <MembersList />
    </RoleGuard>
  );
}

function MembersList() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const result = await api.get('/members');
        setMembers(result.data);
      } catch (err) {
        console.error('Failed to load members:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const filtered = members.filter((m) =>
    m.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  );

  const columns = [
    { key: 'fullName', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <Badge status={row.status} />,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-shell min-h-screen p-5 sm:p-7 lg:p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="mt-1 text-xs text-muted-foreground">Manage cooperative member records</p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><UserRound size={14} /> Directory</div>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          label="Search members"
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-danger">
          Failed to load members: {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="No members found" />
      ) : (
      <Table
          columns={columns}
          data={filtered}
          onRowClick={(row) => router.push(`/admin/members/${row.id}`)}
        />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'wouter';
import { useGetMembers } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Search, Loader2, Eye } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export default function AdminMembers() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  
  const debouncedSearch = useDebounce(search, 500);

  const { data: membersRes, isLoading } = useGetMembers(
    {
      search: debouncedSearch || undefined,
      status: status !== 'all' ? status : undefined,
    },
    {
      query: {
        queryKey: ['members', debouncedSearch, status],
      },
    }
  );

  const members = membersRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Members Directory</h1>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border mb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, ID, phone..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-members"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No members found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Member Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>National ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/10" data-testid={`row-member-${member.id}`}>
                      <TableCell className="font-mono text-xs">{member.memberNumber || '-'}</TableCell>
                      <TableCell className="font-medium">{member.fullName}</TableCell>
                      <TableCell>
                        <div className="text-sm">{member.phone}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{member.nationalId}</TableCell>
                      <TableCell>
                        <StatusBadge status={member.membershipStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/members/${member.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`btn-view-member-${member.id}`}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
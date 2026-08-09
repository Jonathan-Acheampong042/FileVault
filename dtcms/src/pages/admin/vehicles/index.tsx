import React, { useState } from 'react';
import { Link } from 'wouter';
import { useGetVehicles } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { CarFront, Loader2, Plus, Eye } from 'lucide-react';

export default function AdminVehicles() {
  const [status, setStatus] = useState<string>('all');
  const [type, setType] = useState<string>('all');

  const { data: vehiclesRes, isLoading } = useGetVehicles(
    {
      status: status !== 'all' ? status : undefined,
      type: type !== 'all' ? type : undefined,
    },
    { query: { queryKey: ['vehicles', status, type] } }
  );

  const vehicles = vehiclesRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
          <p className="text-sm text-muted-foreground">Manage all registered cooperative vehicles</p>
        </div>
        <Link href="/admin/vehicles/new">
          <Button data-testid="btn-new-vehicle">
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border mb-4 bg-muted/20">
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-48">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-filter-v-status">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="select-filter-v-type">
                  <SelectValue placeholder="Filter Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="TAXI">Taxi</SelectItem>
                  <SelectItem value="MINIBUS">Mini Bus</SelectItem>
                  <SelectItem value="BUS">Bus</SelectItem>
                  <SelectItem value="TRUCK">Truck</SelectItem>
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
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <CarFront className="w-12 h-12 mb-3 opacity-20" />
              <p>No vehicles found matching criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Plate Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>Owner/Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="hover:bg-muted/10" data-testid={`row-vehicle-${vehicle.id}`}>
                      <TableCell className="font-bold tracking-wider">{vehicle.plateNumber}</TableCell>
                      <TableCell>{vehicle.type}</TableCell>
                      <TableCell>
                        {vehicle.make} {vehicle.model} <span className="text-muted-foreground text-xs">({vehicle.year})</span>
                      </TableCell>
                      <TableCell>
                        {vehicle.memberId ? (
                          <Link href={`/admin/members/${vehicle.memberId}`} className="text-primary hover:underline">
                            {vehicle.memberName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={vehicle.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/vehicles/${vehicle.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`btn-view-vehicle-${vehicle.id}`}>
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
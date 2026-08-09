import React, { useState } from 'react';
import { Link } from 'wouter';
import { useGetTrips } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { MapPin, Plus, Loader2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminTrips() {
  const [status, setStatus] = useState<string>('all');

  const { data: tripsRes, isLoading } = useGetTrips(
    { status: status !== 'all' ? status : undefined },
    { query: { queryKey: ['trips', status] } }
  );

  const trips = tripsRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trips Schedule</h1>
          <p className="text-sm text-muted-foreground">Manage routes and scheduled departures</p>
        </div>
        <Link href="/admin/trips/new">
          <Button data-testid="btn-new-trip">
            <Plus className="w-4 h-4 mr-2" /> Schedule Trip
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border mb-4">
          <div className="w-full md:w-64">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-filter-t-status">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center border-b border-border">
              <MapPin className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg">No trips found</p>
              <p className="text-sm">Try changing your filters or schedule a new trip.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Route / ID</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Vehicle & Driver</TableHead>
                    <TableHead className="text-center">Bookings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id} className="hover:bg-muted/10" data-testid={`row-trip-${trip.id}`}>
                      <TableCell>
                        <div className="font-bold text-primary">{trip.routeName}</div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <span className="truncate max-w-[80px]" title={trip.origin}>{trip.origin}</span>
                          <span className="mx-1">&rarr;</span>
                          <span className="truncate max-w-[80px]" title={trip.destination}>{trip.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {trip.departureTime ? (
                          <>
                            <div className="text-sm font-medium flex items-center">
                              <Calendar className="w-3 h-3 mr-1" /> {format(new Date(trip.departureTime), 'MMM d, yy')}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                              <Clock className="w-3 h-3 mr-1" /> {format(new Date(trip.departureTime), 'h:mm a')}
                            </div>
                          </>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{trip.vehicle?.plateNumber || 'TBD'}</div>
                        <div className="text-xs text-muted-foreground">{trip.driverName || 'Unassigned'}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center px-2 py-1 rounded bg-accent text-accent-foreground text-xs font-bold">
                          {trip.bookedSeats || 0} / {trip.capacity || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={trip.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/trips/${trip.id}`}>
                          <Button variant="outline" size="sm" data-testid={`btn-manage-trip-${trip.id}`}>
                            Manage
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
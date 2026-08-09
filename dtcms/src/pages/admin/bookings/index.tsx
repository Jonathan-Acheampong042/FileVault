import React from 'react';
import { Link } from 'wouter';
import { useGetBookings } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { CalendarCheck, Loader2, Plus, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminBookings() {
  const { data: bookingsRes, isLoading } = useGetBookings({
    query: {
      queryKey: ['bookings'],
    }
  });

  const bookings = bookingsRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Bookings</h1>
          <p className="text-sm text-muted-foreground">Global view of all ticket reservations</p>
        </div>
        <Link href="/admin/bookings/new">
          <Button data-testid="btn-new-booking">
            <Plus className="w-4 h-4 mr-2" /> Create Booking
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
              <CalendarCheck className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg">No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Trip Details</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead className="text-right">Fare</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/10" data-testid={`row-booking-${booking.id}`}>
                      <TableCell className="text-sm">
                        {booking.createdAt ? format(new Date(booking.createdAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{booking.memberName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-primary hover:underline">
                          <Link href={`/admin/trips/${booking.tripId}`}>
                            {booking.trip?.routeName || 'View Trip'}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {booking.trip?.departureTime ? format(new Date(booking.trip.departureTime), 'MMM d, h:mm a') : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-block px-2 py-1 bg-accent rounded text-xs font-bold">
                          {booking.seatNumber || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₵{booking.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
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
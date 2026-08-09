import React from 'react';
import { useLocation } from 'wouter';
import { useGetTrip, useGetTripBookings, useUpdateTrip } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft, Loader2, MapPin, Users, Calendar, Navigation, Bus, User, Edit, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function AdminTripDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: tripRes, isLoading: isLoadingTrip } = useGetTrip(id, {
    query: { enabled: !!id, queryKey: ['trip', id] }
  });
  
  const { data: bookingsRes, isLoading: isLoadingBookings } = useGetTripBookings(id, {
    query: { enabled: !!id, queryKey: ['trip', id, 'bookings'] }
  });
  
  const updateMutation = useUpdateTrip();
  
  const trip = tripRes?.data;
  const bookings = bookingsRes?.data || [];

  const handleStatusChange = (newStatus: string) => {
    if (!trip) return;
    
    // We construct a valid TripInput by using the required fields from the fetched trip
    const tripInput = {
      routeName: trip.routeName || '',
      origin: trip.origin || '',
      destination: trip.destination || '',
      departureTime: trip.departureTime || '',
      arrivalTime: trip.arrivalTime,
      vehicleId: trip.vehicleId || '',
      driverId: trip.driverId,
      fare: trip.fare || 0,
      capacity: trip.capacity,
      // Adding status manually as it might not be in TripInput strictly but API probably handles it
      status: newStatus as any
    };

    updateMutation.mutate({ id, data: tripInput as any }, {
      onSuccess: () => {
        toast({ title: "Status Updated", description: `Trip is now ${newStatus}` });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Update Failed", description: err.message });
      }
    });
  };

  if (isLoadingTrip) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!trip) return <div className="text-center py-20">Trip not found</div>;

  const occupancyRate = trip.capacity ? Math.round(((trip.bookedSeats || 0) / trip.capacity) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation('/admin/trips')} data-testid="btn-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{trip.routeName}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              ID: {trip.id?.substring(0, 8)} <span className="text-border">•</span> 
              <StatusBadge status={trip.status} />
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={trip.status} 
            onValueChange={handleStatusChange}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="w-[160px]" data-testid="select-trip-status">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trip Overview Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4 border-b border-border bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" /> Journey Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8 relative">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 transform -translate-y-1/2 mx-16"></div>
              
              <div className="bg-card pr-4 relative z-10">
                <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Origin</p>
                <p className="text-2xl font-bold text-foreground">{trip.origin}</p>
                <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {trip.departureTime ? format(new Date(trip.departureTime), 'MMM d, h:mm a') : 'TBD'}
                </div>
              </div>

              <div className="bg-card pl-4 relative z-10 text-left md:text-right w-full md:w-auto mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-border">
                <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Destination</p>
                <p className="text-2xl font-bold text-primary">{trip.destination}</p>
                <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1 md:justify-end">
                  <Calendar className="w-3 h-3" />
                  {trip.arrivalTime ? format(new Date(trip.arrivalTime), 'MMM d, h:mm a') : 'Est. pending'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-accent/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ticket Fare</p>
                <p className="font-bold text-lg">₵{trip.fare?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Capacity</p>
                <p className="font-bold text-lg">{trip.capacity || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Seats Booked</p>
                <p className="font-bold text-lg">{trip.bookedSeats || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Occupancy</p>
                <p className={`font-bold text-lg ${occupancyRate > 80 ? 'text-success' : occupancyRate < 30 ? 'text-warning' : ''}`}>
                  {occupancyRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Specs */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Bus className="w-4 h-4 text-primary" /> Vehicle Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {trip.vehicle ? (
                <div>
                  <p className="text-2xl font-bold tracking-widest uppercase mb-1">{trip.vehicle.plateNumber}</p>
                  <p className="text-sm text-muted-foreground">{trip.vehicle.type} • {trip.vehicle.make} {trip.vehicle.model}</p>
                  <Link href={`/admin/vehicles/${trip.vehicleId}`}>
                    <Button variant="link" className="p-0 h-auto mt-2 text-xs">View Vehicle &rarr;</Button>
                  </Link>
                </div>
              ) : (
                <div className="text-muted-foreground italic text-sm">No vehicle assigned</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Driver Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {trip.driverId ? (
                <div>
                  <p className="font-medium text-lg mb-1">{trip.driverName}</p>
                  <Link href={`/admin/members/${trip.driverId}`}>
                    <Button variant="link" className="p-0 h-auto mt-1 text-xs">View Profile &rarr;</Button>
                  </Link>
                </div>
              ) : (
                <div className="text-muted-foreground italic text-sm">No driver assigned</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bookings List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Passenger Manifest
            </CardTitle>
            <CardDescription>All confirmed and pending bookings for this trip</CardDescription>
          </div>
          <Link href={`/admin/bookings/new?tripId=${trip.id}`}>
            <Button size="sm" variant="outline" data-testid="btn-add-passenger">Add Passenger</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingBookings ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-t border-border">
              <p>No seats have been booked yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-20 text-center">Seat</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                      <TableCell className="text-center font-bold">{booking.seatNumber || '-'}</TableCell>
                      <TableCell className="font-medium">
                        {booking.memberId ? (
                          <Link href={`/admin/members/${booking.memberId}`} className="text-primary hover:underline">
                            {booking.memberName}
                          </Link>
                        ) : (
                          booking.memberName
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {booking.createdAt ? format(new Date(booking.createdAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium">₵{booking.amount?.toFixed(2)}</TableCell>
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
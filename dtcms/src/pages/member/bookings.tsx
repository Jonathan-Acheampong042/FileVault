import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGetBookings } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, CheckCircle } from 'lucide-react';

export default function MemberBookings() {
  const { user } = useAuth();
  
  const { data: bookingsRes, isLoading } = useGetBookings({
    query: {
      enabled: !!user,
      queryKey: ['bookings']
    }
  });

  // Filter bookings manually if API doesn't support filtering by member
  const myBookings = bookingsRes?.data?.filter(b => b.memberId === user?.id) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Trips & Bookings</h1>
          <p className="text-muted-foreground text-sm">View your scheduled trips and past travel history</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground animate-pulse">Loading bookings...</div>
      ) : myBookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No bookings found</p>
            <p className="text-sm">You haven't been assigned to any trips yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myBookings.map(booking => (
            <Card key={booking.id} className="overflow-hidden flex flex-col hover-elevate transition-all" data-testid={`card-booking-${booking.id}`}>
              <div className={`h-2 ${
                booking.status === 'COMPLETED' ? 'bg-success' : 
                booking.status === 'CANCELLED' ? 'bg-destructive' : 'bg-warning'
              }`} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <StatusBadge status={booking.status} />
                  <span className="text-sm font-bold bg-accent text-accent-foreground px-2 py-1 rounded-md">
                    Seat {booking.seatNumber}
                  </span>
                </div>
                <CardTitle className="text-lg leading-tight line-clamp-2">
                  {booking.trip?.routeName || 'Unknown Route'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">From</p>
                      <p className="font-medium text-foreground">{booking.trip?.origin || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">To</p>
                      <p className="font-medium text-foreground">{booking.trip?.destination || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border grid grid-cols-2 gap-2 text-sm bg-accent/10 rounded-md p-3">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> Date</p>
                    <p className="font-medium">
                      {booking.trip?.departureTime ? format(new Date(booking.trip.departureTime), 'MMM d, yy') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Time</p>
                    <p className="font-medium">
                      {booking.trip?.departureTime ? format(new Date(booking.trip.departureTime), 'h:mm a') : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
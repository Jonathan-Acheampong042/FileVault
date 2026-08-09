import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateBooking, useGetTrips, useGetMembers } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const bookingSchema = z.object({
  tripId: z.string().min(1, 'Trip is required'),
  memberId: z.string().min(1, 'Passenger is required'),
  seatNumber: z.coerce.number().min(1, 'Seat number must be positive').optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function AdminBookingNew() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract tripId from URL if provided (e.g. /admin/bookings/new?tripId=123)
  const queryParams = new URLSearchParams(window.location.search);
  const initialTripId = queryParams.get('tripId') || '';
  
  const createMutation = useCreateBooking();
  
  // Fetch active trips and members
  const { data: tripsRes } = useGetTrips({ status: 'SCHEDULED' }, { query: { queryKey: ['trips', 'SCHEDULED'] } });
  const trips = tripsRes?.data || [];
  
  const { data: membersRes } = useGetMembers({ status: 'ACTIVE' }, { query: { queryKey: ['members', 'active'] } });
  const members = membersRes?.data || [];

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      tripId: initialTripId,
      memberId: '',
      seatNumber: undefined,
    }
  });

  const onSubmit = (data: BookingFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Booking Created", description: "Ticket reservation successful." });
        if (data.tripId) {
          setLocation(`/admin/trips/${data.tripId}`);
        } else {
          setLocation('/admin/bookings');
        }
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Booking Failed", description: err.message });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(initialTripId ? `/admin/trips/${initialTripId}` : '/admin/bookings')} data-testid="btn-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Reservation</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" /> Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="tripId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Trip</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-trip">
                          <SelectValue placeholder="Choose an upcoming trip" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trips.length === 0 ? (
                          <SelectItem value="empty" disabled>No scheduled trips available</SelectItem>
                        ) : (
                          trips.map(t => (
                            <SelectItem key={t.id} value={t.id || ''}>
                              {t.routeName} - {t.departureTime ? format(new Date(t.departureTime), 'MMM d, h:mm a') : 'TBD'} (₵{t.fare})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passenger (Member)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-passenger">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map(m => (
                          <SelectItem key={m.id} value={m.id || ''}>
                            {m.fullName} ({m.memberNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seat Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} data-testid="input-seat" />
                    </FormControl>
                    <FormDescription>Leave blank for auto-assignment.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-6 border-t border-border">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={createMutation.isPending}
                  data-testid="btn-submit-booking"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Confirm Booking</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
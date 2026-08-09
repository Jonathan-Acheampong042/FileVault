import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateTrip, useGetVehicles, useGetMembers } from '@workspace/api-client-react';
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
import { ArrowLeft, Loader2, MapPin, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const tripSchema = z.object({
  routeName: z.string().min(2, 'Route name is required'),
  origin: z.string().min(2, 'Origin is required'),
  destination: z.string().min(2, 'Destination is required'),
  departureTime: z.string().min(1, 'Departure time is required'),
  arrivalTime: z.string().optional(),
  vehicleId: z.string().min(1, 'Vehicle assignment is required'),
  driverId: z.string().optional(),
  fare: z.coerce.number().min(0, 'Fare must be positive'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1').optional(),
});

type TripFormValues = z.infer<typeof tripSchema>;

export default function AdminTripNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const createMutation = useCreateTrip();
  
  // Fetch data for dropdowns
  const { data: vehiclesRes } = useGetVehicles({ status: 'ACTIVE' }, { query: { queryKey: ['vehicles', 'ACTIVE'] } });
  const vehicles = vehiclesRes?.data || [];
  
  // We approximate drivers by getting all active members. In a real app we'd filter by role.
  const { data: membersRes } = useGetMembers({ status: 'ACTIVE' }, { query: { queryKey: ['members', 'active'] } });
  const drivers = membersRes?.data || [];

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      routeName: '',
      origin: '',
      destination: '',
      departureTime: '',
      arrivalTime: '',
      vehicleId: '',
      driverId: undefined,
      fare: 0,
      capacity: 15,
    }
  });

  // Auto-fill route name based on origin and destination
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if ((name === 'origin' || name === 'destination') && value.origin && value.destination) {
        if (!form.formState.dirtyFields.routeName) {
          form.setValue('routeName', `${value.origin} to ${value.destination}`);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Auto-set capacity based on vehicle selection
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'vehicleId' && value.vehicleId) {
        const vehicle = vehicles.find(v => v.id === value.vehicleId);
        if (vehicle && vehicle.capacity) {
          form.setValue('capacity', vehicle.capacity);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, vehicles]);

  const onSubmit = (data: TripFormValues) => {
    const submitData = { 
      ...data, 
      driverId: data.driverId === 'none' ? undefined : data.driverId 
    };
    
    // Convert datetime-local string to proper ISO string if needed by backend
    if (submitData.departureTime && !submitData.departureTime.includes('Z')) {
      submitData.departureTime = new Date(submitData.departureTime).toISOString();
    }
    if (submitData.arrivalTime && !submitData.arrivalTime.includes('Z')) {
      submitData.arrivalTime = new Date(submitData.arrivalTime).toISOString();
    }
    
    createMutation.mutate({ data: submitData }, {
      onSuccess: (res) => {
        toast({ title: "Trip Scheduled", description: "The trip has been successfully scheduled." });
        if (res.data?.id) {
          setLocation(`/admin/trips/${res.data.id}`);
        } else {
          setLocation('/admin/trips');
        }
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Scheduling Failed", description: err.message });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation('/admin/trips')} data-testid="btn-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule New Trip</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Route & Schedule Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid md:grid-cols-2 gap-6 p-4 bg-accent/20 rounded-lg border border-border">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Accra" {...field} data-testid="input-origin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kumasi" {...field} data-testid="input-destination" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="routeName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Route Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Accra to Kumasi Express" {...field} data-testid="input-route-name" />
                      </FormControl>
                      <FormDescription>Auto-generated from origin/destination but can be customized.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-departure" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Arrival (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-arrival" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Vehicle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vehicle">
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles.length === 0 ? (
                            <SelectItem value="empty" disabled>No active vehicles available</SelectItem>
                          ) : (
                            vehicles.map(v => (
                              <SelectItem key={v.id} value={v.id || ''}>
                                {v.plateNumber} ({v.type})
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
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Driver</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-driver">
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Unassigned --</SelectItem>
                          {drivers.map(d => (
                            <SelectItem key={d.id} value={d.id || ''}>
                              {d.fullName}
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
                  name="fare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Fare (₵)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} data-testid="input-fare" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Seats Available</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-trip-capacity" />
                      </FormControl>
                      <FormDescription>Defaults to vehicle capacity.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={createMutation.isPending}
                  data-testid="btn-submit-trip"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Schedule Trip</>
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
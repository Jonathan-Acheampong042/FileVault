import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateVehicle, useGetMembers } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Car, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const vehicleSchema = z.object({
  plateNumber: z.string().min(2, 'Plate number is required'),
  type: z.enum(['BUS', 'MINIBUS', 'TAXI', 'TRUCK']),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(2, 'Model is required'),
  year: z.coerce.number().min(1980).max(new Date().getFullYear() + 1),
  capacity: z.coerce.number().min(1).optional(),
  memberId: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export default function AdminVehicleNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const createMutation = useCreateVehicle();
  
  // Fetch active members to assign as owner
  const { data: membersRes } = useGetMembers({ status: 'ACTIVE' }, { query: { queryKey: ['members', 'active'] } });
  const members = membersRes?.data || [];

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: '',
      type: 'MINIBUS',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      capacity: 15,
      memberId: undefined,
    }
  });

  const onSubmit = (data: VehicleFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: (res) => {
        toast({ title: "Vehicle Registered", description: "Vehicle added successfully." });
        if (res.data?.id) {
          setLocation(`/admin/vehicles/${res.data.id}`);
        } else {
          setLocation('/admin/vehicles');
        }
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Registration Failed", description: err.message });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation('/admin/vehicles')} data-testid="btn-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Register New Vehicle</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" /> Vehicle Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="plateNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate Number</FormLabel>
                      <FormControl>
                        <Input placeholder="GR-1234-23" className="uppercase font-bold tracking-wider" {...field} data-testid="input-plate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TAXI">Taxi</SelectItem>
                          <SelectItem value="MINIBUS">Mini Bus (Trotro)</SelectItem>
                          <SelectItem value="BUS">Bus</SelectItem>
                          <SelectItem value="TRUCK">Truck</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make (Brand)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Toyota" {...field} data-testid="input-make" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Hiace" {...field} data-testid="input-model" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacture Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-year" />
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
                      <FormLabel>Passenger Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-capacity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Assign to Member (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-member">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Do not assign yet --</SelectItem>
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
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={createMutation.isPending}
                  data-testid="btn-submit-vehicle"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Register Vehicle</>
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
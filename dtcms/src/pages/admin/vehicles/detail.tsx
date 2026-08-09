import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGetVehicle, useUpdateVehicle, useDeleteVehicle, useGetMembers } from '@workspace/api-client-react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft, Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const vehicleSchema = z.object({
  plateNumber: z.string().min(2, 'Plate number is required'),
  type: z.enum(['BUS', 'MINIBUS', 'TAXI', 'TRUCK']),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(2, 'Model is required'),
  year: z.coerce.number().min(1980).max(new Date().getFullYear() + 1),
  capacity: z.coerce.number().min(1).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']),
  memberId: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export default function AdminVehicleDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: vehicleRes, isLoading } = useGetVehicle(id, {
    query: {
      enabled: !!id,
      queryKey: ['vehicle', id]
    }
  });
  
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();
  
  // Fetch active members
  const { data: membersRes } = useGetMembers({ status: 'ACTIVE' }, { query: { queryKey: ['members', 'active'] } });
  const members = membersRes?.data || [];

  const vehicle = vehicleRes?.data;

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: '',
      type: 'MINIBUS',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      capacity: 15,
      status: 'ACTIVE',
      memberId: undefined,
    }
  });

  React.useEffect(() => {
    if (vehicle) {
      form.reset({
        plateNumber: vehicle.plateNumber || '',
        type: (vehicle.type as any) || 'MINIBUS',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        capacity: vehicle.capacity,
        status: (vehicle.status as any) || 'ACTIVE',
        memberId: vehicle.memberId || undefined,
      });
    }
  }, [vehicle, form]);

  const onSubmit = (data: VehicleFormValues) => {
    // If 'none' selected, transform to undefined
    const submitData = { ...data, memberId: data.memberId === 'none' ? undefined : data.memberId };
    
    updateMutation.mutate({ id, data: submitData }, {
      onSuccess: () => {
        toast({ title: "Vehicle Updated", description: "Changes saved successfully." });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Update Failed", description: err.message });
      }
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Vehicle Deleted", description: "The record has been permanently removed." });
        setLocation('/admin/vehicles');
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Delete Failed", description: err.message });
      }
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!vehicle) return <div className="text-center py-20">Vehicle not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation('/admin/vehicles')} data-testid="btn-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              {vehicle.plateNumber}
              <StatusBadge status={vehicle.status} />
            </h1>
            <p className="text-sm text-muted-foreground">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
          </div>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" data-testid="btn-delete-trigger">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Vehicle
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-destructive">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete vehicle <strong>{vehicle.plateNumber}</strong>? This action cannot be undone and will remove all associated records from the active system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                data-testid="btn-confirm-delete"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Vehicle Details</CardTitle>
          <CardDescription>Update vehicle specifications, ownership, and current status.</CardDescription>
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
                        <Input className="uppercase font-bold tracking-wider" {...field} data-testid="input-edit-plate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operational Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="MAINTENANCE">In Maintenance</SelectItem>
                          <SelectItem value="INACTIVE">Inactive / Out of Service</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-type">
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
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passenger Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-edit-capacity" />
                      </FormControl>
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
                        <Input {...field} data-testid="input-edit-make" />
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
                        <Input {...field} data-testid="input-edit-model" />
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
                        <Input type="number" {...field} data-testid="input-edit-year" />
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
                      <FormLabel>Assigned Member / Owner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-member">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Unassigned --</SelectItem>
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
                  disabled={updateMutation.isPending || (!form.formState.isDirty && form.getValues('memberId') === vehicle.memberId)}
                  data-testid="btn-save-vehicle"
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Changes</>
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
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSubmitApplication } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusFront, User, Car, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const applicationSchema = z.object({
  applicantName: z.string().min(2, 'Name is required'),
  applicantPhone: z.string().min(10, 'Valid phone number is required'),
  applicantEmail: z.string().email('Valid email is required'),
  applicantAddress: z.string().min(5, 'Address is required'),
  nationalId: z.string().min(5, 'National ID is required'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Valid date is required' }),
  vehicleDetails: z.object({
    plateNumber: z.string().min(2, 'Plate number is required'),
    type: z.string().min(2, 'Vehicle type is required'),
    make: z.string().min(2, 'Make is required'),
    model: z.string().min(2, 'Model is required'),
    year: z.coerce.number().min(1980, 'Valid year required').max(new Date().getFullYear() + 1, 'Valid year required'),
  })
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export default function Apply() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const submitApplication = useSubmitApplication();

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      applicantName: '',
      applicantPhone: '',
      applicantEmail: '',
      applicantAddress: '',
      nationalId: '',
      dateOfBirth: '',
      vehicleDetails: {
        plateNumber: '',
        type: 'TAXI',
        make: '',
        model: '',
        year: new Date().getFullYear(),
      }
    }
  });

  const onSubmit = (data: ApplicationFormValues) => {
    submitApplication.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Application Submitted",
          description: "Your membership application has been received successfully.",
        });
        setLocation('/apply/success');
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: error.message || "An error occurred while submitting your application.",
        });
      }
    });
  };

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Membership Application</h1>
        <p className="text-muted-foreground">Complete the form below to apply to join the transport cooperative.</p>
      </div>

      <Card className="border-border shadow-md">
        <CardContent className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Personal Info Section */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="applicantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="nationalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National ID</FormLabel>
                        <FormControl>
                          <Input placeholder="GHA-123456789-0" {...field} data-testid="input-national-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="024 123 4567" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-dob" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantAddress"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Residential Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="123 Main St, Accra" {...field} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Vehicle Info Section */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border mt-8">
                  <Car className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Vehicle Details</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="vehicleDetails.plateNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Plate Number</FormLabel>
                        <FormControl>
                          <Input placeholder="GR-1234-23" {...field} data-testid="input-vehicle-plate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="vehicleDetails.type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vehicle-type">
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
                    name="vehicleDetails.make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input placeholder="Toyota" {...field} data-testid="input-vehicle-make" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicleDetails.model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="Corolla" {...field} data-testid="input-vehicle-model" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicleDetails.year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-vehicle-year" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-border flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full md:w-auto"
                  disabled={submitApplication.isPending}
                  data-testid="btn-submit-application"
                >
                  {submitApplication.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>
                  ) : (
                    'Submit Application'
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
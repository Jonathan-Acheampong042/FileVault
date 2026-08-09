import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGetMember, useUpdateMember } from '@workspace/api-client-react';
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
import { Loader2, ArrowLeft, Save, User, FileText, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const memberSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  membershipStatus: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export default function AdminMemberDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: memberRes, isLoading: isLoadingGet } = useGetMember(id, {
    query: {
      enabled: !!id,
      queryKey: ['member', id]
    }
  });
  
  const updateMutation = useUpdateMember();
  
  const member = memberRes?.data;

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      address: '',
      membershipStatus: 'ACTIVE',
    }
  });

  // Init form with data
  React.useEffect(() => {
    if (member) {
      form.reset({
        fullName: member.fullName || '',
        phone: member.phone || '',
        address: member.address || '',
        membershipStatus: (member.membershipStatus as any) || 'ACTIVE',
      });
    }
  }, [member, form]);

  const onSubmit = (data: MemberFormValues) => {
    updateMutation.mutate({ id, data }, {
      onSuccess: () => {
        toast({ title: "Member Updated", description: "Changes saved successfully." });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Update Failed", description: err.message });
      }
    });
  };

  if (isLoadingGet) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!member) {
    return <div className="text-center py-20">Member not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation('/admin/members')} data-testid="btn-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              {member.fullName} 
              <StatusBadge status={member.membershipStatus} />
            </h1>
            <p className="text-sm text-muted-foreground font-mono">{member.memberNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Read-only details panel */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Profile Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Email</p>
                <p className="font-medium break-all">{member.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">National ID</p>
                <p className="font-medium">{member.nationalId}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Date of Birth</p>
                <p className="font-medium">
                  {member.dateOfBirth ? format(new Date(member.dateOfBirth), 'MMMM d, yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Join Date</p>
                <p className="font-medium">
                  {member.joinDate ? format(new Date(member.joinDate), 'MMMM d, yyyy') : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {member.vehicle && (
            <Card>
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-base">Registered Vehicle</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Plate:</span> <span className="font-bold">{member.vehicle.plateNumber}</span></p>
                <p><span className="text-muted-foreground">Type:</span> {member.vehicle.type}</p>
                <p><span className="text-muted-foreground">Make/Model:</span> {member.vehicle.make} {member.vehicle.model} ({member.vehicle.year})</p>
                <div className="pt-2 mt-2 border-t border-border">
                  <Button variant="link" className="p-0 h-auto" onClick={() => setLocation(`/admin/vehicles/${member.vehicle?.id}`)}>
                    View Vehicle Record &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Information</CardTitle>
            <CardDescription>Update member contact details and status</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" {...field} data-testid="input-edit-name" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" {...field} data-testid="input-edit-phone" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="membershipStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="SUSPENDED">Suspended</SelectItem>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" {...field} data-testid="input-edit-address" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending || !form.formState.isDirty}
                    data-testid="btn-save-member"
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
    </div>
  );
}
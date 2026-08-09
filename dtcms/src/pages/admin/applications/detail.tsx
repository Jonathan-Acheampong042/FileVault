import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetApplication, useReviewApplication } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, User, Car, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminApplicationDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { data: appRes, isLoading } = useGetApplication(id, {
    query: {
      enabled: !!id,
      queryKey: ['application', id]
    }
  });
  
  const reviewMutation = useReviewApplication();
  
  const app = appRes?.data;

  const handleApprove = () => {
    reviewMutation.mutate({ id, data: { decision: 'APPROVED' } }, {
      onSuccess: () => {
        toast({ title: "Application Approved", description: "Applicant has been converted to an active member." });
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        setLocation('/admin/applications');
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Action Failed", description: err.message });
      }
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({ variant: "destructive", title: "Reason Required", description: "Please provide a reason for rejection." });
      return;
    }
    
    reviewMutation.mutate({ id, data: { decision: 'REJECTED', rejectionReason } }, {
      onSuccess: () => {
        toast({ title: "Application Rejected", description: "Applicant has been notified." });
        setRejectModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        setLocation('/admin/applications');
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Action Failed", description: err.message });
      }
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!app) return <div className="text-center py-20">Application not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation('/admin/applications')} data-testid="btn-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Review Application</h1>
            <p className="text-sm text-muted-foreground">Submitted {app.createdAt ? format(new Date(app.createdAt), 'MMMM d, yyyy') : 'Unknown'}</p>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {app.status === 'PENDING' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm">
              <strong>Action Required:</strong> Review the applicant's details below and decide whether to approve or reject their membership request.
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                variant="destructive" 
                className="flex-1 sm:flex-none"
                onClick={() => setRejectModalOpen(true)}
                disabled={reviewMutation.isPending}
                data-testid="btn-trigger-reject"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button 
                className="bg-success hover:bg-success/90 text-success-foreground flex-1 sm:flex-none"
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
                data-testid="btn-approve"
              >
                {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Applicant Details */}
        <Card>
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Full Name</p>
              <p className="font-medium text-base">{app.applicantName}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">National ID</p>
                <p className="font-medium font-mono text-sm">{app.nationalId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {app.dateOfBirth ? format(new Date(app.dateOfBirth), 'MMM d, yyyy') : '-'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                <p className="font-medium text-sm">{app.applicantPhone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium text-sm truncate" title={app.applicantEmail}>{app.applicantEmail}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Residential Address
              </p>
              <p className="font-medium text-sm">{app.applicantAddress}</p>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details */}
        <Card>
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5 text-primary" /> Vehicle Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {app.vehicleDetails ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">License Plate</p>
                    <p className="text-xl font-bold tracking-widest">{app.vehicleDetails.plateNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Type</p>
                    <p className="font-medium">{app.vehicleDetails.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Make / Brand</p>
                    <p className="font-medium">{app.vehicleDetails.make}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Model</p>
                    <p className="font-medium">{app.vehicleDetails.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Manufacture Year</p>
                    <p className="font-medium">{app.vehicleDetails.year}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-primary/5 text-sm text-primary rounded-md mt-6">
                  <p><strong>Note:</strong> Approving this application will automatically create a member profile and register this vehicle in the fleet system.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground italic">
                No vehicle details provided with this application.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {app.applicantName}'s application. This will be recorded and may be shared with the applicant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea 
              placeholder="e.g. Invalid vehicle documentation, incomplete address..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-rejection-reason"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={reviewMutation.isPending || !rejectionReason.trim()}
              data-testid="btn-confirm-reject"
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
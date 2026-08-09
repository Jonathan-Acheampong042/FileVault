import React from 'react';
import { Link } from 'wouter';
import { useGetPendingApplications } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminApplications() {
  const { data: appsRes, isLoading } = useGetPendingApplications({
    query: {
      queryKey: ['applications', 'pending']
    }
  });

  const applications = appsRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pending Applications</h1>
          <p className="text-sm text-muted-foreground">Review and process new membership requests</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-primary opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground">No pending applications</p>
              <p>All membership requests have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle Offered</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-muted/10" data-testid={`row-app-${app.id}`}>
                      <TableCell>
                        <div className="font-medium">{app.applicantName}</div>
                        <div className="text-xs text-muted-foreground">{app.nationalId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{app.applicantPhone}</div>
                        <div className="text-xs text-muted-foreground">{app.applicantEmail}</div>
                      </TableCell>
                      <TableCell>
                        {app.vehicleDetails ? (
                          <>
                            <div className="font-medium text-sm">{app.vehicleDetails.plateNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {app.vehicleDetails.type} • {app.vehicleDetails.make}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">No vehicle</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {app.createdAt ? format(new Date(app.createdAt), 'MMM d, yyyy') : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/applications/${app.id}`}>
                          <Button size="sm" data-testid={`btn-review-app-${app.id}`}>
                            Review Request
                          </Button>
                        </Link>
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
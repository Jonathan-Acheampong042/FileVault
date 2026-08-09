import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGetMemberPayments } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function MemberPayments() {
  const { user } = useAuth();
  
  const { data: paymentsRes, isLoading } = useGetMemberPayments(user?.id ?? '', {
    query: { enabled: !!user?.id, queryKey: ['payments', 'member', user?.id ?? ''] },
  });

  const payments = paymentsRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Payments</h1>
          <p className="text-muted-foreground text-sm">View your payment history and financial records</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
              No payments found in your history.
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="whitespace-nowrap">
                        {payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.type?.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {payment.description || '-'}
                      </TableCell>
                      <TableCell>{payment.method?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₵{payment.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
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
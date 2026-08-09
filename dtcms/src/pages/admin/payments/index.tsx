import React from 'react';
import { Link } from 'wouter';
import { useGetPayments } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreditCard, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPayments() {
  const { data: paymentsRes, isLoading } = useGetPayments({
    query: {
      queryKey: ['payments'],
    }
  });

  const payments = paymentsRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Ledger</h1>
          <p className="text-sm text-muted-foreground">View all cooperative transactions and payments</p>
        </div>
        <Link href="/admin/payments/new">
          <Button data-testid="btn-new-payment">
            <Plus className="w-4 h-4 mr-2" /> Record Payment
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
              <CreditCard className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg">No payments recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/10" data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-primary hover:underline">
                          <Link href={`/admin/members/${payment.memberId}`}>
                            {payment.memberName}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{payment.type?.replace('_', ' ')}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={payment.description}>
                          {payment.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.method?.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
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
import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useGetDashboardSummary, useGetMemberPayments, useGetBookings } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { UserCircle, CreditCard, CalendarCheck, ArrowRight, Bus } from 'lucide-react';
import { format } from 'date-fns';

export default function MemberDashboard() {
  const { user } = useAuth();
  
  const { data: summaryRes, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { enabled: !!user, queryKey: ['dashboard', 'summary'] },
  });

  const { data: paymentsRes } = useGetMemberPayments(user?.id ?? '', {
    query: { enabled: !!user?.id, queryKey: ['payments', 'member', user?.id ?? ''] },
  });

  const { data: bookingsRes } = useGetBookings({
    query: { enabled: !!user, queryKey: ['bookings'] },
  });

  const summary = summaryRes?.data;
  const recentPayments = paymentsRes?.data?.slice(0, 3) || [];
  // Filter bookings manually if API doesn't support filtering by member
  const myBookings = bookingsRes?.data?.filter(b => b.memberId === user?.id) || [];
  const upcomingBookings = myBookings.filter(b => ['CONFIRMED', 'PENDING'].includes(b.status || '')).slice(0, 3);

  if (isLoadingSummary) {
    return <div className="animate-pulse space-y-6">
      <div className="h-32 bg-card rounded-xl"></div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-64 bg-card rounded-xl"></div>
        <div className="h-64 bg-card rounded-xl"></div>
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Bus className="w-64 h-64" />
        </div>
        <CardContent className="p-8 relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.fullName}</h1>
          <p className="text-primary-foreground/80 mb-6 max-w-xl">
            Manage your cooperative membership, view your payment history, and track your scheduled trips from your dashboard.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/member/profile">
              <Button variant="secondary" className="bg-white text-primary hover:bg-white/90" data-testid="btn-dash-profile">
                <UserCircle className="w-4 h-4 mr-2" /> View Profile
              </Button>
            </Link>
            {summary?.unreadNotifications ? (
              <Link href="/notifications">
                <Button variant="outline" className="border-white text-white hover:bg-white/10" data-testid="btn-dash-notifications">
                  You have {summary.unreadNotifications} unread notifications
                </Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Recent Payments
              </CardTitle>
              <CardDescription>Your latest financial transactions</CardDescription>
            </div>
            <Link href="/member/payments">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="link-view-all-payments">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPayments.length > 0 ? (
              <div className="space-y-4">
                {recentPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-accent/20">
                    <div>
                      <p className="font-medium text-sm">{payment.type?.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM d, yyyy') : 'Unknown Date'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold text-sm">₵{payment.amount?.toFixed(2)}</span>
                      <StatusBadge status={payment.status} className="text-[10px] px-1.5 py-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No recent payments found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" /> Upcoming Trips
              </CardTitle>
              <CardDescription>Your scheduled assignments and bookings</CardDescription>
            </div>
            <Link href="/member/bookings">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="link-view-all-bookings">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map(booking => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-accent/20">
                    <div>
                      <p className="font-medium text-sm">{booking.trip?.routeName || 'Unknown Route'}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.trip?.departureTime ? format(new Date(booking.trip.departureTime), 'MMM d, h:mm a') : 'Unscheduled'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium">Seat {booking.seatNumber}</span>
                      <StatusBadge status={booking.status} className="text-[10px] px-1.5 py-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No upcoming trips scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
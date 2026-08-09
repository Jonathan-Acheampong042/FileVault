import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import PublicLayout from '@/layouts/public-layout';
import AdminLayout from '@/layouts/admin-layout';
import MemberLayout from '@/layouts/member-layout';

import Home from '@/pages/public/home';
import Apply from '@/pages/public/apply';
import ApplySuccess from '@/pages/public/apply-success';
import Login from '@/pages/public/login';

import MemberDashboard from '@/pages/member/dashboard';
import MemberProfile from '@/pages/member/profile';
import MemberPayments from '@/pages/member/payments';
import MemberBookings from '@/pages/member/bookings';

import AdminDashboard from '@/pages/admin/dashboard';
import AdminMembers from '@/pages/admin/members/index';
import AdminMemberDetail from '@/pages/admin/members/detail';
import AdminVehicles from '@/pages/admin/vehicles/index';
import AdminVehicleNew from '@/pages/admin/vehicles/new';
import AdminVehicleDetail from '@/pages/admin/vehicles/detail';
import AdminApplications from '@/pages/admin/applications/index';
import AdminApplicationDetail from '@/pages/admin/applications/detail';
import AdminTrips from '@/pages/admin/trips/index';
import AdminTripNew from '@/pages/admin/trips/new';
import AdminTripDetail from '@/pages/admin/trips/detail';
import AdminBookings from '@/pages/admin/bookings/index';
import AdminBookingNew from '@/pages/admin/bookings/new';
import AdminPayments from '@/pages/admin/payments/index';
import AdminPaymentNew from '@/pages/admin/payments/new';
import AdminReports from '@/pages/admin/reports/index';
import AdminReportGenerate from '@/pages/admin/reports/generate';

import Notifications from '@/pages/notifications';

// Set up the API client token injection
setAuthTokenGetter(() => localStorage.getItem('dtcms_token'));

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicLayout><Home /></PublicLayout>
      </Route>
      <Route path="/apply">
        <PublicLayout><Apply /></PublicLayout>
      </Route>
      <Route path="/apply/success">
        <PublicLayout><ApplySuccess /></PublicLayout>
      </Route>
      <Route path="/login">
        <PublicLayout><Login /></PublicLayout>
      </Route>

      <Route path="/member/dashboard">
        <MemberLayout><MemberDashboard /></MemberLayout>
      </Route>
      <Route path="/member/profile">
        <MemberLayout><MemberProfile /></MemberLayout>
      </Route>
      <Route path="/member/payments">
        <MemberLayout><MemberPayments /></MemberLayout>
      </Route>
      <Route path="/member/bookings">
        <MemberLayout><MemberBookings /></MemberLayout>
      </Route>

      <Route path="/admin/dashboard">
        <AdminLayout><AdminDashboard /></AdminLayout>
      </Route>
      <Route path="/admin/members">
        <AdminLayout><AdminMembers /></AdminLayout>
      </Route>
      <Route path="/admin/members/:id">
        {params => <AdminLayout><AdminMemberDetail id={params.id} /></AdminLayout>}
      </Route>
      <Route path="/admin/vehicles">
        <AdminLayout><AdminVehicles /></AdminLayout>
      </Route>
      <Route path="/admin/vehicles/new">
        <AdminLayout><AdminVehicleNew /></AdminLayout>
      </Route>
      <Route path="/admin/vehicles/:id">
        {params => <AdminLayout><AdminVehicleDetail id={params.id} /></AdminLayout>}
      </Route>
      <Route path="/admin/applications">
        <AdminLayout><AdminApplications /></AdminLayout>
      </Route>
      <Route path="/admin/applications/:id">
        {params => <AdminLayout><AdminApplicationDetail id={params.id} /></AdminLayout>}
      </Route>
      <Route path="/admin/trips">
        <AdminLayout><AdminTrips /></AdminLayout>
      </Route>
      <Route path="/admin/trips/new">
        <AdminLayout><AdminTripNew /></AdminLayout>
      </Route>
      <Route path="/admin/trips/:id">
        {params => <AdminLayout><AdminTripDetail id={params.id} /></AdminLayout>}
      </Route>
      <Route path="/admin/bookings">
        <AdminLayout><AdminBookings /></AdminLayout>
      </Route>
      <Route path="/admin/bookings/new">
        <AdminLayout><AdminBookingNew /></AdminLayout>
      </Route>
      <Route path="/admin/payments">
        <AdminLayout><AdminPayments /></AdminLayout>
      </Route>
      <Route path="/admin/payments/new">
        <AdminLayout><AdminPaymentNew /></AdminLayout>
      </Route>
      <Route path="/admin/reports">
        <AdminLayout><AdminReports /></AdminLayout>
      </Route>
      <Route path="/admin/reports/generate">
        <AdminLayout><AdminReportGenerate /></AdminLayout>
      </Route>

      <Route path="/notifications">
        <MemberLayout><Notifications /></MemberLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

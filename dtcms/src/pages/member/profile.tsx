import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGetMe } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { UserCircle, Mail, Phone, MapPin, Calendar, CreditCard, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function MemberProfile() {
  const { user } = useAuth();
  
  const { data: meRes, isLoading } = useGetMe({
    query: {
      enabled: !!user,
      queryKey: ['me']
    }
  });

  const profile = meRes?.data;

  if (isLoading) {
    return <div className="p-8 animate-pulse text-center text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - ID Card Style */}
        <Card className="md:col-span-1 bg-gradient-to-b from-primary to-secondary text-primary-foreground border-none shadow-lg overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-4 border-4 border-white/30 backdrop-blur-sm">
              <UserCircle className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1" data-testid="profile-name">{profile?.fullName}</h2>
            <p className="text-white/80 text-sm mb-4" data-testid="profile-role">{profile?.role}</p>
            
            <div className="w-full bg-white/10 rounded-lg p-3 backdrop-blur-sm mb-4">
              <p className="text-xs text-white/70 uppercase tracking-wider font-semibold mb-1">Account Status</p>
              <div className="flex justify-center">
                <StatusBadge status={profile?.accountStatus} className="bg-white text-primary hover:bg-white border-none" />
              </div>
            </div>
            
            <p className="text-xs text-white/50 mt-auto pt-4 border-t border-white/10 w-full">
              ID: {profile?.id?.substring(0, 8).toUpperCase()}
            </p>
          </CardContent>
        </Card>

        {/* Right Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email Address</p>
                  <p className="text-sm text-muted-foreground" data-testid="profile-email">{profile?.email}</p>
                </div>
              </div>
              {/* In a real app we'd have phone and address on the user model, displaying placeholders */}
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Phone Number</p>
                  <p className="text-sm text-muted-foreground italic">Add via administration</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Address</p>
                  <p className="text-sm text-muted-foreground italic">Add via administration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Password</p>
                    <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
                  </div>
                </div>
                {/* Disabled placeholder for realism */}
                <button className="text-sm text-primary font-medium hover:underline disabled:opacity-50" disabled>Change</button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
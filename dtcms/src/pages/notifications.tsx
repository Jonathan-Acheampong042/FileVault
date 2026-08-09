import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyNotifications, useMarkNotificationRead } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: notifRes, isLoading } = useGetMyNotifications({
    query: {
      enabled: !!user,
      queryKey: ['notifications', 'my']
    }
  });

  const markReadMutation = useMarkNotificationRead();

  const notifications = notifRes?.data || [];

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate({ data: { id } } as any, { // API type might be weird, coercing to fit standard mutation
      onSuccess: () => {
        // Optimistically update cache or invalidate
        queryClient.invalidateQueries({ queryKey: ['notifications', 'my'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      }
    });
  };

  const getIcon = (type?: string) => {
    switch(type) {
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'ERROR': return <XCircle className="w-5 h-5 text-destructive" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground text-sm">Updates and alerts for your account</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg">You're all caught up!</p>
              <p className="text-sm">No new notifications at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 sm:p-6 flex gap-4 transition-colors ${!notif.isRead ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                  data-testid={`notif-item-${notif.id}`}
                >
                  <div className="shrink-0 mt-1">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                      <h4 className={`text-sm font-semibold ${!notif.isRead ? 'text-foreground' : 'text-foreground/80'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {notif.createdAt ? format(new Date(notif.createdAt), 'MMM d, h:mm a') : ''}
                      </span>
                    </div>
                    <p className={`text-sm ${!notif.isRead ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="shrink-0 flex items-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-primary"
                        onClick={() => handleMarkRead(notif.id as string)}
                        disabled={markReadMutation.isPending}
                        data-testid={`btn-mark-read-${notif.id}`}
                      >
                        Mark read
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
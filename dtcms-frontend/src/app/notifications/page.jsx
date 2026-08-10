'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { Bell, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const result = await api.get('/notifications/me');
        setNotifications(result.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  // BUG-036/092: isRead is now a real field — the is_read/read_at migration
  // has been confirmed applied to the live database — so this reflects
  // real state instead of always being undefined.
  const handleMarkRead = async (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );

    try {
      await api.put(`/notifications/${notif.id}/read`);
    } catch (err) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: false } : n))
      );
      setError(err.message);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="page-shell min-h-[calc(100vh-65px)] p-4 sm:p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-shell min-h-[calc(100vh-65px)] p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="page-title">Notifications</h1>
        <p className="mt-1 text-xs text-muted-foreground">Updates and alerts for your account</p>
      </div>

      {loading && <LoadingSpinner />}
      {!loading && error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {!loading && !error && notifications.length === 0 && (
        <EmptyState message="No notifications yet" />
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="surface-panel overflow-hidden">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.isRead && handleMarkRead(notif)}
              className={`flex cursor-pointer items-start gap-3 border-b border-card-border px-4 py-4 last:border-b-0 transition-colors hover:bg-accent ${
                notif.isRead
                  ? 'text-muted-foreground'
                  : 'text-ink'
              }`}
            >
              <NotificationIcon type={notif.type} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{notif.title || 'Notification'}</p>
                <p className="mt-1 text-[0.68rem]">{notif.message}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {notif.createdAt && <p className="hidden text-[0.6rem] text-muted-foreground sm:block">{new Date(notif.createdAt).toLocaleString()}</p>}
                {!notif.isRead && <button type="button" onClick={(event) => { event.stopPropagation(); handleMarkRead(notif); }} className="text-[0.6rem] font-semibold text-primary hover:underline">Mark read</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationIcon({ type }) {
  const normalized = String(type || '').toLowerCase();
  const Icon = normalized.includes('warning') ? TriangleAlert : normalized.includes('success') ? CheckCircle2 : normalized.includes('info') ? Info : Bell;
  const color = normalized.includes('warning') ? 'text-warning' : normalized.includes('success') ? 'text-success' : 'text-primary';
  return <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent ${color}`}><Icon size={14} /></span>;
}
import type { AppNotification } from '../../types'
import { useNotifications } from '../../hooks/useNotifications'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import NotificationItem from './NotificationItem'

interface NotificationsDrawerProps {
  open: boolean
  onClose: () => void
  onNotificationNav?: (n: AppNotification) => void
}

export default function NotificationsDrawer({ open, onClose, onNotificationNav }: NotificationsDrawerProps) {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } = useNotifications()
  const { supported, subscribed, busy, toggle } = usePushSubscription()

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id, true)
    onNotificationNav?.(n)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[1100] bg-slate-950/55 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-[1101] flex h-full w-full max-w-[380px] flex-col border-l border-white/10 bg-[#0b1220] shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-[18px] py-[18px] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-blue-400">mark_email_unread</span>
            <span className="text-sm font-extrabold uppercase tracking-wider text-slate-100">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full border border-primary/30 bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-blue-200">
                {unreadCount} new
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-slate-200" aria-label="Close notifications">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {supported && (
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 18 }}>
                  {subscribed ? 'notifications_active' : 'notifications'}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-200">Push notifications</p>
                  <p className="text-[10.5px] text-slate-500">
                    {subscribed ? 'Enabled on this device' : 'Get alerts even when FileVault is closed'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggle}
                disabled={busy}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                  subscribed
                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-primary/30 bg-primary/15 text-blue-200'
                }`}
              >
                {subscribed ? 'Enabled' : 'Enable'}
              </button>
            </div>
          )}

          <div className="mb-2 flex justify-end">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-bold text-primary">
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-slate-500">Loading…</p>
          ) : !notifications.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
                <span className="material-symbols-outlined text-slate-600">notifications</span>
              </div>
              <p className="text-[13px] font-bold text-slate-400">No notifications yet</p>
              <p className="text-[11px] text-slate-600">
                Approvals, expiry reminders, and announcements will show up here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={handleClick}
                onToggleRead={markRead}
                onDelete={remove}
              />
            ))
          )}
        </div>
      </aside>
    </>
  )
}

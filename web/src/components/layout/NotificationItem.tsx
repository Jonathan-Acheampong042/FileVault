import type { AppNotification, NotificationType } from '../../types'

const ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  request_approved: { icon: 'check_circle', color: '#34d399', bg: 'rgba(16,185,129,0.15)' },
  request_dismissed: { icon: 'cancel', color: '#94a3b8', bg: 'rgba(100,116,139,0.15)' },
  file_expiring: { icon: 'schedule', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
  announcement: { icon: 'campaign', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  new_file: { icon: 'note_add', color: '#a78bfa', bg: 'rgba(139,92,246,0.15)' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface NotificationItemProps {
  notification: AppNotification
  onClick: (n: AppNotification) => void
  onToggleRead: (id: string, read: boolean) => void
  onDelete: (id: string) => void
}

export default function NotificationItem({ notification, onClick, onToggleRead, onDelete }: NotificationItemProps) {
  const meta = ICON_MAP[notification.type as NotificationType] || {
    icon: 'notifications',
    color: '#94a3b8',
    bg: 'rgba(100,116,139,0.15)',
  }
  const unread = !notification.read

  return (
    <div
      onClick={() => onClick(notification)}
      className={`relative mb-2 flex cursor-pointer items-start gap-2.5 rounded-2xl border px-3 py-2.5 transition-colors ${
        unread ? 'border-primary/25 bg-primary/[0.06]' : 'border-white/[0.04] bg-white/[0.015] opacity-70'
      }`}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: meta.bg }}
      >
        <span className="material-symbols-outlined text-base" style={{ color: meta.color }}>
          {meta.icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold ${unread ? 'text-slate-200' : 'text-slate-400'}`}>{notification.title}</p>
        {notification.body && (
          <p className={`mt-0.5 text-[11px] leading-relaxed ${unread ? 'text-slate-500' : 'text-slate-600'}`}>
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-[10px] text-slate-600">{timeAgo(notification.createdAt)}</p>
      </div>
      {unread && <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />}
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleRead(notification.id, unread)
          }}
          title={unread ? 'Mark as read' : 'Mark as unread'}
          className="rounded-md p-1 text-slate-600 hover:text-slate-300"
        >
          <span className="material-symbols-outlined text-[13px]">
            {unread ? 'mark_email_read' : 'mark_email_unread'}
          </span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          title="Delete"
          className="rounded-md p-1 text-slate-600 hover:text-red-400"
        >
          <span className="material-symbols-outlined text-[13px]">delete</span>
        </button>
      </div>
    </div>
  )
}

import React from 'react'

interface Props {
  loading: boolean
  downloads: number
  requests: number
  daysActive: number
  reactionsLeft: number
  filesLiked: number
}

export default function StatsCards({
  loading,
  downloads,
  requests,
  daysActive,
  reactionsLeft,
  filesLiked,
}: Props) {
  return (
    <div className="mt-4">
      {/* Row 1: activity numbers */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCell loading={loading} value={downloads} label="Downloads" />
        <StatCell loading={loading} value={requests} label="Requests" />
        <StatCell loading={loading} value={daysActive} label="Days Active" />
      </div>

      {/* Row 2: engagement personality stats */}
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <StatCell
          loading={loading}
          value={reactionsLeft}
          label="Reactions Left"
          emoji="😊"
        />
        <StatCell
          loading={loading}
          value={filesLiked}
          label="Files Liked"
          emoji="👍"
        />
      </div>
    </div>
  )
}

function StatCell({ loading, value, label, emoji }: { loading: boolean; value: number | string; label: string; emoji?: string }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-white/[0.04] p-3 text-center transition-colors ${loading ? 'loading' : ''}`}>
      {emoji && <p className="mb-0.5 text-[13px] leading-none">{emoji}</p>}
      <p
        className={`text-[22px] font-extrabold leading-none text-slate-100 ${
          loading
            ? 'inline-block min-w-[28px] animate-[shimmer_1.4s_ease-in-out_infinite] select-none rounded-md text-transparent'
            : ''
        }`}
        style={
          loading
            ? {
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.06) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.06) 75%)',
                backgroundSize: '200% 100%',
              }
            : undefined
        }
      >
        {loading ? '0' : value}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  )
}

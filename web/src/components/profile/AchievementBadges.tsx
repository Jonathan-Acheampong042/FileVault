export interface Badge {
  id: string
  name: string
  desc: string
  icon: string
  colorClass: string
  unlocked: boolean
}

interface Props {
  badges: Badge[]
}

export default function AchievementBadges({ badges }: Props) {
  if (badges.length === 0) return null

  return (
    <div className="mt-5 rounded-[1.1rem] border border-white/[0.07] bg-white/[0.03] p-5">
      <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
        <span className="material-symbols-outlined text-[18px] text-blue-400">military_tech</span>
        Achievements
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`flex items-start gap-2.5 rounded-[14px] border p-3 transition-colors ${
              badge.unlocked
                ? 'border-white/[0.07] bg-white/[0.05]'
                : 'border-transparent bg-white/[0.02] opacity-50 grayscale'
            }`}
            title={badge.unlocked ? 'Unlocked' : 'Locked'}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${badge.colorClass}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {badge.icon}
              </span>
            </div>
            <div>
              <p className="text-[12px] font-extrabold leading-tight text-slate-100">
                {badge.name}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                {badge.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

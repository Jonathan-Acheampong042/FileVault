import { useState } from 'react'
import { REACTION_EMOJI_GROUPS } from '../../types'
import type { ReactionMap } from '../../types'

interface ReactionBarProps {
  reactions: ReactionMap
  onToggle: (emoji: string) => void
}

export default function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const activeEmojis = Object.entries(reactions).filter(([, r]) => r.count > 0 || r.mine)

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {activeEmojis.map(([emoji, r]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          title={`${emoji} · ${r.count}`}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] transition-all ${
            r.mine ? 'border-primary/50 bg-primary/20' : 'border-white/10 bg-white/5'
          }`}
        >
          {emoji}
          <span className={`text-[10px] font-bold ${r.mine ? 'text-blue-200' : 'text-slate-500'}`}>{r.count}</span>
        </button>
      ))}

      <button
        onClick={() => setPickerOpen((o) => !o)}
        title="Add reaction"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-sm font-bold text-slate-400"
      >
        +
      </button>

      {pickerOpen && (
        <>
          {/* Click-outside catcher */}
          <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border border-white/10 bg-slate-900/97 p-3.5 shadow-2xl backdrop-blur-xl">
            {REACTION_EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="mb-2.5 last:mb-0">
                <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {group.emojis.map((emoji) => {
                    const r = reactions[emoji]
                    return (
                      <button
                        key={emoji}
                        onClick={() => {
                          onToggle(emoji)
                        }}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all ${
                          r?.mine ? 'border-primary/45 bg-primary/15' : 'border-white/[0.06] bg-white/[0.03]'
                        }`}
                        title={r?.count ? `${emoji} · ${r.count}` : emoji}
                      >
                        {emoji}
                        {r?.count > 0 && (
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] font-extrabold text-slate-400">
                            {r.count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

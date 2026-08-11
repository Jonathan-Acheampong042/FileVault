import { type PwdStrength, checkPwdStrength } from '../../hooks/useAuthHelpers'

interface Props {
  password: string
  visible: boolean
}

const BAR_COLORS: Record<string, string> = {
  weak: 'bg-red-500',
  fair: 'bg-amber-500',
  good: 'bg-blue-500',
  strong: 'bg-emerald-500',
}

const LABEL_COLORS: Record<string, string> = {
  weak: 'text-red-500',
  fair: 'text-amber-500',
  good: 'text-blue-500',
  strong: 'text-emerald-500',
}

const REQUIREMENTS = [
  { key: 'len', label: 'At least 8 characters' },
  { key: 'upper', label: 'At least one uppercase letter (A–Z)' },
  { key: 'lower', label: 'At least one lowercase letter (a–z)' },
  { key: 'num', label: 'At least one number (0–9)' },
  { key: 'special', label: 'At least one special character (!@#$%^&*)' },
]

export default function PasswordStrengthMeter({ password, visible }: Props) {
  if (!visible) return null
  const strength: PwdStrength = checkPwdStrength(password)
  const barClass = strength.level ? BAR_COLORS[strength.level] : ''

  return (
    <div className="mt-2.5 animate-[fadeIn_0.25s_ease]">
      {/* Strength bars */}
      <div className="mb-2 flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              password.length > 0 && i < strength.score ? barClass : 'bg-white/[0.08]'
            }`}
          />
        ))}
      </div>

      {/* Strength label */}
      {strength.label && (
        <p className={`mb-2 text-[11px] font-bold ${LABEL_COLORS[strength.level] || 'text-slate-500'}`}>
          {strength.label}
        </p>
      )}

      {/* Requirements checklist */}
      <ul className="flex flex-col gap-1">
        {REQUIREMENTS.map(({ key, label }) => {
          const met = strength.rules[key]
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
                met ? 'text-emerald-500' : 'text-slate-500'
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 text-[8px] font-black ${
                  met
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-600 bg-transparent'
                }`}
              >
                {met ? '✓' : ''}
              </span>
              {label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

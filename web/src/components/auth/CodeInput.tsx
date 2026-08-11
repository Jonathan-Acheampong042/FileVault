import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react'

interface Props {
  length?: number
  onComplete: (code: string) => void
  disabled?: boolean
}

/**
 * Reusable 6-digit OTP/MFA code input with auto-advance, backspace nav, and paste support.
 * Used by both email OTP and TOTP MFA flows.
 */
export default function CodeInput({ length = 6, onComplete, disabled }: Props) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setRef = useCallback(
    (idx: number) => (el: HTMLInputElement | null) => {
      refs.current[idx] = el
    },
    []
  )

  function handleInput(idx: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...values]
    next[idx] = digit
    setValues(next)

    if (digit && idx < length - 1) {
      refs.current[idx + 1]?.focus()
    }

    // Auto-submit when all digits filled
    if (digit && idx === length - 1 && next.every((v) => v)) {
      onComplete(next.join(''))
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Backspace' && !values[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length)
    const next = [...values]
    paste.split('').forEach((ch, i) => {
      if (i < length) next[i] = ch
    })
    setValues(next)
    if (paste.length === length) {
      refs.current[length - 1]?.focus()
      onComplete(next.join(''))
    } else if (paste.length > 0) {
      refs.current[Math.min(paste.length, length - 1)]?.focus()
    }
  }

  function reset() {
    setValues(Array(length).fill(''))
    refs.current[0]?.focus()
  }

  return (
    <div className="flex justify-center gap-2">
      {values.map((val, i) => (
        <input
          key={i}
          ref={setRef(i)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`h-[52px] w-12 rounded-[10px] border-[1.5px] text-center text-xl font-extrabold text-white caret-transparent outline-none transition-colors duration-200 disabled:opacity-50 ${
            val
              ? 'border-blue-500/45 bg-blue-500/10'
              : 'border-white/[0.12] bg-white/[0.07]'
          } focus:border-blue-500/60 focus:bg-blue-500/[0.08]`}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

export type CodeInputRef = { reset: () => void }

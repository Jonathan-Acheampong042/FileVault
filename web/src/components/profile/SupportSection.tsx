import { useState } from 'react'

const FAQ_ITEMS = [
  {
    q: 'How do I download a file?',
    a: 'Click on any file card to open the preview, then tap the "Download" button. You can also click the download icon directly on the file card (desktop only).'
  },
  {
    q: 'How do I request a file upload?',
    a: 'Navigate to the Request page from the sidebar or bottom navigation. Fill in the file details and submit — the manager will review your request.'
  },
  {
    q: 'What does pinning a file do?',
    a: 'Pinning saves a file for offline access. You can view pinned files even without an internet connection from the "Pinned Files" section.'
  },
  {
    q: 'How do I enable push notifications?',
    a: 'Go to your Profile page → Notification Preferences → toggle "Push Notifications" on. You\'ll be notified about new uploads, request updates, and expiring files.'
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. Scroll to the bottom of your Profile page and use the "Delete Account" option in the Danger Zone section. This action is irreversible.'
  },
  {
    q: 'What is the AI assistant?',
    a: 'The AI assistant (bottom-right chat bubble) can answer questions about your files, explain topics, and even quiz you. It\'s powered by Groq and your conversations are not stored after the session.'
  },
  {
    q: 'Why do files expire?',
    a: 'Managers can set expiry dates on files to keep the vault clean. You\'ll receive a notification before files expire if you have push notifications enabled.'
  }
]

export default function SupportSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
      <div className="mb-4 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
        <span className="material-symbols-outlined text-[18px] text-blue-400">help</span>
        Help & Support
      </div>

      {/* FAQ Accordion */}
      <div className="mb-5 space-y-1.5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Frequently Asked Questions
        </p>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[12.5px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.04]"
            >
              <span className="flex-1">{item.q}</span>
              <span className={`material-symbols-outlined text-[16px] text-slate-500 transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {openIdx === i && (
              <div className="border-t border-white/5 px-4 py-3 text-[12px] leading-relaxed text-slate-400 animate-[fadeIn_0.2s_ease]">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact & Bug Report */}
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="mailto:nharnharblay21@gmail.com"
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-[12px] font-semibold text-slate-300 transition-colors hover:border-blue-500/20 hover:bg-blue-500/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10">
            <span className="material-symbols-outlined text-[18px] text-blue-400">mail</span>
          </span>
          <div>
            <p className="text-[12px] font-bold text-slate-200">Contact Us</p>
            <p className="text-[10px] text-slate-500">nharnharblay21@gmail.com</p>
          </div>
        </a>

        <a
          href="mailto:nharnharblay21@gmail.com?subject=FileVault%20Bug%20Report&body=Please%20describe%20the%20issue%20you%20encountered%3A%0A%0ASteps%20to%20reproduce%3A%0A1.%20%0A2.%20%0A3.%20%0A%0AExpected%20behavior%3A%0A%0AActual%20behavior%3A%0A%0ADevice%2FBrowser%3A"
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-[12px] font-semibold text-slate-300 transition-colors hover:border-amber-500/20 hover:bg-amber-500/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
            <span className="material-symbols-outlined text-[18px] text-amber-400">bug_report</span>
          </span>
          <div>
            <p className="text-[12px] font-bold text-slate-200">Report a Bug</p>
            <p className="text-[10px] text-slate-500">Help us improve FileVault</p>
          </div>
        </a>
      </div>

      {/* App Version */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-[10px] text-slate-600">
        <span className="material-symbols-outlined text-[12px]">info</span>
        FileVault v2.1.0 · Built with ❤️ by Jonathan Acheampong
      </div>
    </div>
  )
}

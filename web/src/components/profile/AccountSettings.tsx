import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import PasswordStrengthMeter from '../auth/PasswordStrengthMeter'
import { friendlyError } from '../../hooks/useAuthHelpers'

export default function AccountSettings() {
  const { user } = useAuth()
  const showToast = useToast()
  
  const meta = user?.user_metadata || {}
  
  // Display name
  const [displayName, setDisplayName] = useState(meta.display_name || meta.full_name || meta.name || '')
  const [nameLoading, setNameLoading] = useState(false)

  // Student Info
  const [bio, setBio] = useState(meta.bio || '')
  const [course, setCourse] = useState(meta.course || '')
  const [yearOfStudy, setYearOfStudy] = useState(meta.year_of_study || '')
  const [studentId, setStudentId] = useState(meta.student_id || '')
  const [studentLoading, setStudentLoading] = useState(false)

  // Change Password
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [showPwdNew, setShowPwdNew] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)

  async function saveDisplayName() {
    setNameLoading(true)
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() }
    })
    setNameLoading(false)
    if (error) {
      showToast(friendlyError(error), 'error')
    } else {
      showToast('Display name updated', 'success')
    }
  }

  async function saveStudentInfo() {
    setStudentLoading(true)
    const { error } = await supabase.auth.updateUser({
      data: {
        bio: bio.trim(),
        course: course.trim(),
        year_of_study: yearOfStudy,
        student_id: studentId.trim()
      }
    })
    setStudentLoading(false)
    if (error) {
      showToast(friendlyError(error), 'error')
    } else {
      showToast('Student info updated', 'success')
    }
  }

  async function changePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) {
      showToast('Please fill in all password fields', 'error')
      return
    }
    if (newPwd !== confirmPwd) {
      showToast('New passwords do not match', 'error')
      return
    }
    
    setPwdLoading(true)
    // Supabase JS doesn't natively support verifying the old password when updating
    // to a new one via updateUser unless you re-authenticate.
    // As in the vanilla app, we might need to signInWithPassword first.
    if (user?.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd
      })
      if (signInError) {
        showToast('Current password incorrect', 'error')
        setPwdLoading(false)
        return
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdLoading(false)
    if (error) {
      showToast(friendlyError(error), 'error')
    } else {
      showToast('Password changed successfully', 'success')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    }
  }

  return (
    <div className="space-y-5">
      {/* Display Name */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">badge</span>
          Display Name
        </div>
        <p className="mb-3 text-[12px] text-slate-500">This is the name shown across FileVault.</p>
        
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </span>
          <input
            type="text"
            placeholder="Your display name"
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-[13px] border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50 focus:bg-white/10"
          />
        </div>
        <button
          onClick={saveDisplayName}
          disabled={nameLoading}
          className="mt-3 flex w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 py-3 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {nameLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Student Info */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">school</span>
          Student Info
        </div>
        <p className="mb-3 text-[12px] text-slate-500">Help the manager identify your requests faster by sharing a bit about yourself. This is optional.</p>
        
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Bio</p>
            <div className="relative">
              <textarea
                placeholder="A short note about yourself..."
                maxLength={200}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-[80px] w-full resize-y rounded-[13px] border border-white/10 bg-white/5 p-3 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50 focus:bg-white/10"
              />
              <p className="absolute bottom-2 right-2 text-[10px] text-slate-500">{bio.length}/200</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Course / Program</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                </span>
                <input
                  type="text"
                  placeholder="e.g. BSc Computer Science"
                  maxLength={60}
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full rounded-[13px] border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50 focus:bg-white/10"
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Year of Study</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                </span>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full appearance-none rounded-[13px] border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50"
                >
                  <option value="">Select...</option>
                  <option value="Year 1">Year 1</option>
                  <option value="Year 2">Year 2</option>
                  <option value="Year 3">Year 3</option>
                  <option value="Year 4">Year 4</option>
                  <option value="Year 5+">Year 5+</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Student ID / Number</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <span className="material-symbols-outlined text-[18px]">badge</span>
              </span>
              <input
                type="text"
                placeholder="e.g. UG/2023/0451"
                maxLength={40}
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-[13px] border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50 focus:bg-white/10"
              />
            </div>
          </div>
        </div>

        <button
          onClick={saveStudentInfo}
          disabled={studentLoading}
          className="mt-3 flex w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 py-3 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {studentLoading ? 'Saving...' : 'Save Student Info'}
        </button>
      </div>

      {/* Change Password */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">lock_reset</span>
          Change Password
        </div>
        <p className="mb-3 text-[12px] text-slate-500">Choose a new password for your account. You'll stay signed in.</p>
        
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">lock_person</span>
            </span>
            <input
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full rounded-[13px] border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50 focus:bg-white/10"
            />
          </div>
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </span>
            <input
              type={showPwdNew ? "text" : "password"}
              placeholder="New password"
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full rounded-[13px] border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50 focus:bg-white/10"
            />
            <button
              onClick={() => setShowPwdNew(!showPwdNew)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          </div>
          
          {newPwd && <PasswordStrengthMeter password={newPwd} visible={!!newPwd} />}
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">lock_open</span>
            </span>
            <input
              type={showPwdConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full rounded-[13px] border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-[13px] text-white outline-none transition-colors focus:border-blue-500/50 focus:bg-white/10"
            />
            <button
              onClick={() => setShowPwdConfirm(!showPwdConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          </div>
          
          {confirmPwd && confirmPwd !== newPwd && (
            <p className="text-[11px] text-red-400">Passwords do not match</p>
          )}

          <button
            onClick={changePassword}
            disabled={pwdLoading}
            className="mt-3 flex w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 py-3 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pwdLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

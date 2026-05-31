'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Settings as SettingsIcon,
  User,
  Shield,
  GraduationCap,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase
} from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // Tab State: 'profile' | 'security'
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')

  // Profile data state
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [major, setMajor] = useState('')
  const [graduationYear, setGraduationYear] = useState('')

  // Password state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [loading, setLoading] = useState(true)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null)
  const [securityError, setSecurityError] = useState<string | null>(null)

  // Load profile data on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (!error && data) {
            setFullName(data.full_name || '')
            setUniversity(data.university || '')
            setMajor(data.major || '')
            setGraduationYear(data.graduation_year?.toString() || '')
          }
        }
      } catch (err) {
        console.error('Failed to load profile details:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle profile metadata updates
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setProfileSuccess(null)
    setProfileError(null)

    if (!fullName.trim() || !university.trim() || !major.trim()) {
      setProfileError('Name, University, and Major are required.')
      return
    }

    startTransition(async () => {
      try {
        const gradYearNum = graduationYear ? parseInt(graduationYear, 10) : null
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            university,
            major,
            graduation_year: gradYearNum
          })
          .eq('id', userId)

        if (error) {
          setProfileError(error.message)
        } else {
          setProfileSuccess('Profile metadata updated successfully!')
        }
      } catch {
        setProfileError('Failed to save profile modifications.')
      }
    })
  }

  // Handle password change updates
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setSecuritySuccess(null)
    setSecurityError(null)

    if (!password) {
      setSecurityError('Password is required.')
      return
    }

    if (password !== confirmPassword) {
      setSecurityError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.updateUser({
          password
        })

        if (error) {
          setSecurityError(error.message)
        } else {
          setSecuritySuccess('Your password has been changed successfully!')
          setPassword('')
          setConfirmPassword('')
        }
      } catch {
        setSecurityError('Password update failed. Please try again.')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse select-none">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2 w-1/3">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>

        {/* 2 column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          {/* Account Profile Card */}
          <GlassCard className="p-6 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
            <Skeleton className="h-5 w-1/3 rounded" />
            <div className="flex flex-col gap-4 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-1/4 rounded" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
              <Skeleton className="h-10 w-28 rounded-xl mt-2 animate-pulse" />
            </div>
          </GlassCard>

          {/* Security Card */}
          <GlassCard className="p-6 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
            <Skeleton className="h-5 w-1/3 rounded" />
            <div className="flex flex-col gap-4 mt-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-1/4 rounded" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
              <Skeleton className="h-10 w-28 rounded-xl mt-2 animate-pulse" />
            </div>
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in-entry flex flex-col gap-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent flex items-center gap-2">
          <SettingsIcon className="text-[var(--accent-blue)] shrink-0" size={28} />
          Settings
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Customize your CampusOS dashboard layouts, school details, and profile parameters.
        </p>
      </div>

      {/* Settings layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Navigation Sidebar panel */}
        <div className="lg:col-span-1 flex flex-col gap-2 select-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'profile'
                ? 'bg-white/5 border-white/10 text-[var(--accent-blue)] shadow-md'
                : 'border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <User size={15} />
            Profile Settings
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'security'
                ? 'bg-white/5 border-white/10 text-[var(--accent-blue)] shadow-md'
                : 'border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <Shield size={15} />
            Security & Login
          </button>
        </div>

        {/* Form contents panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="select-text"
              >
                <GlassCard className="p-6 flex flex-col gap-5 border-white/5 bg-[#12131A]/60">
                  <div className="flex items-center gap-2 select-none pb-2 border-b border-white/5">
                    <User size={16} className="text-[var(--accent-blue)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Update Academic Metadata</span>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Full name input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="fullName" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 text-[var(--text-muted)] pointer-events-none" size={14} />
                          <input
                            id="fullName"
                            type="text"
                            placeholder="e.g. Rahil Sharma"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-10 pr-4 py-3 text-xs text-[var(--text-primary)] outline-none transition-all"
                            required
                          />
                        </div>
                      </div>

                      {/* University input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="university" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">University / College</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3.5 top-3.5 text-[var(--text-muted)] pointer-events-none" size={15} />
                          <input
                            id="university"
                            type="text"
                            placeholder="e.g. Stanford University"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-10 pr-4 py-3 text-xs text-[var(--text-primary)] outline-none transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Major input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="major" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Field of Study / Major</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3.5 top-3.5 text-[var(--text-muted)] pointer-events-none" size={14} />
                          <input
                            id="major"
                            type="text"
                            placeholder="e.g. Computer Science"
                            value={major}
                            onChange={(e) => setMajor(e.target.value)}
                            className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-10 pr-4 py-3 text-xs text-[var(--text-primary)] outline-none transition-all"
                            required
                          />
                        </div>
                      </div>

                      {/* Graduation Year input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="gradYear" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Graduation Year</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-3.5 text-[var(--text-muted)] pointer-events-none" size={14} />
                          <input
                            id="gradYear"
                            type="number"
                            placeholder="e.g. 2027"
                            value={graduationYear}
                            onChange={(e) => setGraduationYear(e.target.value)}
                            className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-10 pr-4 py-3 text-xs text-[var(--text-primary)] outline-none transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {profileError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                        <AlertCircle size={15} />
                        <span>{profileError}</span>
                      </div>
                    )}

                    {profileSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={15} />
                        <span>{profileSuccess}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 font-bold text-xs py-3 shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer rounded-xl select-none self-start px-6 h-10"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={13} className="animate-spin" />
                          <span>Saving Profile...</span>
                        </span>
                      ) : (
                        'Save Profile Details'
                      )}
                    </Button>
                  </form>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="select-text"
              >
                <GlassCard className="p-6 flex flex-col gap-5 border-white/5 bg-[#12131A]/60">
                  <div className="flex items-center gap-2 select-none pb-2 border-b border-white/5">
                    <Shield size={16} className="text-[var(--accent-blue)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Update Account Security</span>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Password input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="pass" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 text-[var(--text-muted)] pointer-events-none" size={14} />
                          <input
                            id="pass"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-10 pr-4 py-3 text-xs text-[var(--text-primary)] outline-none transition-all font-mono"
                            required
                          />
                        </div>
                      </div>

                      {/* Confirm Password input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="confirmPass" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Confirm New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 text-[var(--text-muted)] pointer-events-none" size={14} />
                          <input
                            id="confirmPass"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-10 pr-4 py-3 text-xs text-[var(--text-primary)] outline-none transition-all font-mono"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {securityError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                        <AlertCircle size={15} />
                        <span>{securityError}</span>
                      </div>
                    )}

                    {securitySuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={15} />
                        <span>{securitySuccess}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 font-bold text-xs py-3 shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer rounded-xl select-none self-start px-6 h-10"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={13} className="animate-spin" />
                          <span>Updating Password...</span>
                        </span>
                      ) : (
                        'Change Password'
                      )}
                    </Button>
                  </form>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}

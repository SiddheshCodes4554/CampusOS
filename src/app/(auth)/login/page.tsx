'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loginAction, signupAction, resetPasswordAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Lock,
  User,
  GraduationCap,
  Calendar,
  School,
  XCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react'

type Tab = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>('signin')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleAction = async (e: React.FormEvent<HTMLFormElement>, actionType: Tab) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      let res
      if (actionType === 'signin') {
        res = await loginAction(formData)
      } else if (actionType === 'signup') {
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        res = await signupAction(formData)
      } else if (actionType === 'forgot') {
        res = await resetPasswordAction(formData)
      }

      if (res) {
        if ('error' in res && res.error) {
          setError(res.error)
        } else if ('success' in res && res.success) {
          setSuccess(res.success)
          // Reset the form if recovery email was sent successfully
          if (actionType === 'forgot') {
            ;(e.target as HTMLFormElement).reset()
          }
        }
      }
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0C10] p-6 relative overflow-hidden select-none">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[var(--accent-purple)] opacity-10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent-blue)] opacity-10 rounded-full blur-[100px] pointer-events-none" />

      <div className="glass-card max-w-md w-full p-8 relative z-10 flex flex-col gap-6 border-white/5 shadow-2xl">
        <div className="text-center flex flex-col items-center gap-1.5">
          <img src="/CampusOSLogo.png" alt="CampusOS Logo" className="w-8 h-8 object-contain mb-1 shrink-0 select-none" />
          <h1 className="text-2xl font-bold tracking-tight text-white select-none">
            CampusOS
          </h1>
          <p className="text-[var(--text-secondary)] text-xs">
            The AI-powered command center for college students
          </p>
        </div>

        {/* Tab selection headers */}
        {activeTab !== 'forgot' && (
          <div className="grid grid-cols-2 bg-black/40 border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab('signin')
                setError(null)
                setSuccess(null)
              }}
              disabled={isPending}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup')
                setError(null)
                setSuccess(null)
              }}
              disabled={isPending}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'signin' && (
            <motion.form
              key="signin"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              onSubmit={(e) => handleAction(e, 'signin')}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="signin-email" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                  <input
                    id="signin-email"
                    type="email"
                    name="email"
                    placeholder="student@university.edu"
                    disabled={isPending}
                    className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="signin-password" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forgot')
                      setError(null)
                      setSuccess(null)
                    }}
                    disabled={isPending}
                    className="text-[10px] text-[var(--accent-blue)] hover:underline cursor-pointer font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                  <input
                    id="signin-password"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    disabled={isPending}
                    className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed flex items-center gap-2 mt-1">
                  <XCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-bold h-10 mt-2 cursor-pointer disabled:opacity-75 shadow-lg shadow-[var(--accent-blue-glow)] border-transparent"
              >
                {isPending ? 'Signing In...' : 'Sign In'}
              </Button>
            </motion.form>
          )}

          {activeTab === 'signup' && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              onSubmit={(e) => handleAction(e, 'signup')}
              className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-fullName" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                  <input
                    id="signup-fullName"
                    type="text"
                    name="fullName"
                    placeholder="Alex Morgan"
                    disabled={isPending}
                    className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-email" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    placeholder="alex.morgan@university.edu"
                    disabled={isPending}
                    className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-university" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    University
                  </label>
                  <div className="relative flex items-center">
                    <School size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                    <input
                      id="signup-university"
                      type="text"
                      name="university"
                      placeholder="Stanford"
                      disabled={isPending}
                      className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-major" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Major / Course
                  </label>
                  <div className="relative flex items-center">
                    <GraduationCap size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                    <input
                      id="signup-major"
                      type="text"
                      name="major"
                      placeholder="Computer Science"
                      disabled={isPending}
                      className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-gradYear" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Graduation Year
                </label>
                <div className="relative flex items-center">
                  <Calendar size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                  <input
                    id="signup-gradYear"
                    type="number"
                    name="graduationYear"
                    min="2026"
                    max="2035"
                    placeholder="2028"
                    disabled={isPending}
                    className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-password" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                    <input
                      id="signup-password"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      disabled={isPending}
                      className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-confirmPassword" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                    <input
                      id="signup-confirmPassword"
                      type="password"
                      name="confirmPassword"
                      placeholder="••••••••"
                      disabled={isPending}
                      className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed flex items-center gap-2 mt-1">
                  <XCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-lg leading-relaxed flex items-center gap-2 mt-1">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-bold h-10 mt-2 cursor-pointer disabled:opacity-75 shadow-lg shadow-[var(--accent-blue-glow)] border-transparent"
              >
                {isPending ? 'Creating Account...' : 'Register'}
              </Button>
            </motion.form>
          )}

          {activeTab === 'forgot' && (
            <motion.form
              key="forgot"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              onSubmit={(e) => handleAction(e, 'forgot')}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="forgot-email" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3 text-[var(--text-secondary)]" />
                  <input
                    id="forgot-email"
                    type="email"
                    name="email"
                    placeholder="student@university.edu"
                    disabled={isPending}
                    className="w-full bg-black/40 border border-white/5 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed flex items-center gap-2">
                  <XCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-lg leading-relaxed flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin')
                    setError(null)
                    setSuccess(null)
                  }}
                  disabled={isPending}
                  className="flex-1 border border-white/10 hover:bg-white/5 rounded-xl text-xs text-white font-semibold h-10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  Back
                </button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-bold h-10 cursor-pointer disabled:opacity-75 shadow-lg shadow-[var(--accent-blue-glow)] border-transparent"
                >
                  {isPending ? 'Sending...' : 'Send Recovery'}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

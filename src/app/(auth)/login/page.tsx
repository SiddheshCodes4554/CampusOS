'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loginAction, signupAction, resetPasswordAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden select-none">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[var(--accent-purple)] opacity-10 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--accent-blue)] opacity-10 rounded-full blur-[90px]" />

      <div className="glass-card max-w-lg w-full p-8 relative z-10 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
            CampusOS
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-2">
            The AI-powered command center for college students
          </p>
        </div>

        {/* Tab selection headers */}
        {activeTab !== 'forgot' && (
          <div className="grid grid-cols-2 bg-black/40 border border-[var(--border-glass)] p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab('signin')
                setError(null)
                setSuccess(null)
              }}
              disabled={isPending}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white/10 text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                  ? 'bg-white/10 text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              onSubmit={(e) => handleAction(e, 'signin')}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="student@university.edu"
                  disabled={isPending}
                  className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
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
                    className="text-xs text-[var(--accent-blue)] hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold h-10 mt-2 cursor-pointer disabled:opacity-75"
              >
                {isPending ? 'Signing In...' : 'Sign In'}
              </Button>
            </motion.form>
          )}

          {activeTab === 'signup' && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={(e) => handleAction(e, 'signup')}
              className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Alex Morgan"
                  disabled={isPending}
                  className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="alex.morgan@university.edu"
                  disabled={isPending}
                  className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    University
                  </label>
                  <input
                    type="text"
                    name="university"
                    placeholder="Stanford University"
                    disabled={isPending}
                    className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Major / Course
                  </label>
                  <input
                    type="text"
                    name="major"
                    placeholder="Computer Science"
                    disabled={isPending}
                    className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Graduation Year
                </label>
                <input
                  type="number"
                  name="graduationYear"
                  min="2026"
                  max="2035"
                  placeholder="2028"
                  disabled={isPending}
                  className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    disabled={isPending}
                    className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    disabled={isPending}
                    className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-lg leading-relaxed">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold h-10 mt-2 cursor-pointer disabled:opacity-75"
              >
                {isPending ? 'Creating Account...' : 'Register'}
              </Button>
            </motion.form>
          )}

          {activeTab === 'forgot' && (
            <motion.form
              key="forgot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={(e) => handleAction(e, 'forgot')}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="student@university.edu"
                  disabled={isPending}
                  className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all disabled:opacity-50"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-lg leading-relaxed">
                  {success}
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
                  className="flex-1 border border-[var(--border-glass)] hover:bg-white/5 rounded-lg text-sm text-[var(--text-primary)] font-semibold h-10 transition-all cursor-pointer"
                >
                  Back to Login
                </button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold h-10 cursor-pointer disabled:opacity-75"
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

'use client'

import React, { useTransition } from 'react'
import { updatePasswordAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Lock, XCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (!password) {
      setError('Password is required.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      const res = await updatePasswordAction(formData)
      if (res?.error) {
        setError(res.error)
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
            Reset Password
          </h1>
          <p className="text-[var(--text-secondary)] text-xs">
            Enter your new secure account password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 select-text">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-password" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              New Password
            </label>
            <div className="relative flex items-center">
              <Lock size={14} className="absolute left-3 text-[var(--text-secondary)]" />
              <input
                id="reset-password"
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
            <label htmlFor="reset-confirm" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <Lock size={14} className="absolute left-3 text-[var(--text-secondary)]" />
              <input
                id="reset-confirm"
                type="password"
                name="confirm"
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
            className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-bold h-10 mt-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent-blue-glow)] border-transparent"
          >
            {isPending ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

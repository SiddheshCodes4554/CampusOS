'use client'

import React, { useTransition } from 'react'
import { updatePasswordAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in-entry select-none">
      <div className="glass-card max-w-md w-full p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-2">
            Enter your new secure password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              New Password
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
              name="confirm"
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
            className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold h-10 mt-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

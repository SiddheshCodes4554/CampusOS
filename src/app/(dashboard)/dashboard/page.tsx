import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { signoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch student profile details from the database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in-entry">
      <div className="glass-card max-w-lg w-full p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
            Welcome, {profile?.full_name || 'Student'}!
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-2">
            You have successfully authenticated with CampusOS.
          </p>
        </div>

        <div className="border-t border-[var(--border-glass)] pt-6 flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">University:</span>
            <span className="text-[var(--text-primary)] font-medium">{profile?.university || 'Loading...'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Major:</span>
            <span className="text-[var(--text-primary)] font-medium">{profile?.major || 'Loading...'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Graduation Year:</span>
            <span className="text-[var(--text-primary)] font-medium">{profile?.graduation_year || 'Loading...'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Email:</span>
            <span className="text-[var(--text-primary)] font-medium">{user?.email}</span>
          </div>
        </div>

        <form action={signoutAction} className="mt-4">
          <Button
            type="submit"
            className="w-full border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold h-10 cursor-pointer transition-all"
          >
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  )
}

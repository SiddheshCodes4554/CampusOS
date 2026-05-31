import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { OnboardingWrapper } from '@/components/dashboard/OnboardingWrapper'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch student profile details from the database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id || '')
    .single()

  const onboardingCompleted = profile?.onboarding_completed ?? false

  return (
    <OnboardingWrapper initialCompleted={onboardingCompleted}>
      <DashboardShell
        userEmail={user?.email || 'student@campus.edu'}
        userName={profile?.full_name || 'Student'}
        university={profile?.university || 'Stanford University'}
        major={profile?.major || 'Computer Science'}
      >
        {children}
      </DashboardShell>
    </OnboardingWrapper>
  )
}

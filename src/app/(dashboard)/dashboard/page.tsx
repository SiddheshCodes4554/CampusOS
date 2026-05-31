import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch student profile details from the database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id || '')
    .single()

  return (
    <DashboardGrid userName={profile?.full_name || 'Student'} />
  )
}

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="fade-in-entry flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Customize your CampusOS dashboard layouts, school details, and profile parameters.
        </p>
      </div>

      <GlassCard className="p-8 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[var(--accent-blue)]">
          <Settings size={24} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--text-primary)]">User Configurations</span>
          <span className="text-xs text-[var(--text-muted)] max-w-sm">
            Theme variables, notifications frequencies, Gemini API configurations, and Supabase profile settings will live here.
          </span>
        </div>
      </GlassCard>
    </div>
  )
}

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Briefcase } from 'lucide-react'

export default function InternshipsPage() {
  return (
    <div className="fade-in-entry flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
          Internship Tracker
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Organize, check status, and apply for college internships and summer fellowships.
        </p>
      </div>

      <GlassCard className="p-8 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[var(--accent-purple)]">
          <Briefcase size={24} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Application Kanban Board</span>
          <span className="text-xs text-[var(--text-muted)] max-w-sm">
            Track interview invitations, assessment stages, deadlines, and offer tracking lists.
          </span>
        </div>
      </GlassCard>
    </div>
  )
}

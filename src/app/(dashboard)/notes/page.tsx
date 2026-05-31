import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { BookOpen } from 'lucide-react'

export default function NotesPage() {
  return (
    <div className="fade-in-entry flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
          Smart Notes
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Write lecture notes, generate AI summaries, and build spacing-repetition study decks.
        </p>
      </div>

      <GlassCard className="p-8 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[var(--accent-blue)]">
          <BookOpen size={24} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Document Folders & Audio</span>
          <span className="text-xs text-[var(--text-muted)] max-w-sm">
            Interactive markdown notepad, audio recordings transcription, and flashcard generation utilities will live here.
          </span>
        </div>
      </GlassCard>
    </div>
  )
}

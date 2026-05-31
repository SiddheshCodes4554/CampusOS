'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Navbar } from '@/components/dashboard/Navbar'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  children: React.ReactNode
  userEmail?: string
  userName?: string
  university?: string
  major?: string
}

export function DashboardShell({
  children,
  userEmail,
  userName,
  university,
  major
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isCopilotOpen, setCopilotOpen } = useDashboardStore()

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased font-sans relative">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar
          userEmail={userEmail}
          userName={userName}
          university={university}
          major={major}
          onToggleMobile={() => setMobileOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-canvas-bg relative">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* AI Copilot Backdrop Overlay for Mobile viewports */}
      {isCopilotOpen && (
        <div
          onClick={() => setCopilotOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-all duration-300"
        />
      )}

      {/* Slide-out AI Copilot Drawer */}
      <aside
        className={cn(
          "fixed md:sticky top-0 right-0 z-40 h-screen border-l border-white/5 bg-[#12131A]/80 backdrop-blur-xl transition-all duration-300 w-80",
          isCopilotOpen ? "translate-x-0" : "translate-x-full hidden md:translate-x-full md:hidden"
        )}
      >
        <div className="flex flex-col h-full p-4 relative">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5 select-none">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Copilot</span>
            </div>
            <button
              onClick={() => setCopilotOpen(false)}
              aria-label="Close AI Copilot"
              className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>

          {/* Chat Assistant Dialog */}
          <div className="flex-1 flex flex-col gap-3 py-4 overflow-y-auto pr-1 select-text">
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-[var(--accent-blue)]">CampusOS Assistant</span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Hello! I am your AI Copilot. I can help summarize notes, build checkable flashcard decks, brainstorm project PRDs, or prepare you for technical placements.
              </p>
            </div>

            <div className="p-3 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-1 text-center select-none py-6 mt-2">
              <span className="text-xs font-semibold text-white">Need exam prep?</span>
              <span className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-3">Check note sources in the Smart Notes page to generate quizzes!</span>
              <Link
                href="/notes"
                onClick={() => setCopilotOpen(false)}
                className="w-full h-8 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold text-xs rounded-lg cursor-pointer hover:opacity-95 flex items-center justify-center select-none"
              >
                Open Notes Hub
              </Link>
            </div>
          </div>

          {/* Simulated Input field */}
          <div className="border-t border-white/5 pt-3 select-none">
            <div className="relative flex items-center bg-black/40 border border-white/5 rounded-xl px-3 py-2">
              <input
                type="text"
                placeholder="Ask me a question..."
                className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-[var(--text-muted)] font-medium pr-8"
              />
              <button
                aria-label="Send message"
                className="absolute right-2 text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4 fill-current transform rotate-90" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

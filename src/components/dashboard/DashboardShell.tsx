'use client'

import React, { useState } from 'react'
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
    <div className="min-h-screen flex bg-background text-foreground antialiased font-sans">
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

      {/* Slide-out AI Copilot Drawer */}
      <aside
        className={cn(
          "fixed md:sticky top-0 right-0 z-40 h-screen border-l border-[var(--border-glass)] bg-[rgba(22,23,30,0.7)] backdrop-blur-xl transition-all duration-300 w-80",
          isCopilotOpen ? "translate-x-0" : "translate-x-full hidden md:translate-x-full md:hidden"
        )}
      >
        {/* Placeholder AI Panel */}
        <div className="flex flex-col h-full p-4 relative">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-glass)]">
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">AI Copilot</span>
            <button
              onClick={() => setCopilotOpen(false)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)] text-center p-4">
            Copilot drawer placeholder. Chat assistant, flashcard deck builder, and lecture analyzer will live here.
          </div>
        </div>
      </aside>
    </div>
  )
}

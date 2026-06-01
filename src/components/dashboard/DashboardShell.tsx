'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Navbar } from '@/components/dashboard/Navbar'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'
import { Sparkles, MessageSquare, Send, X, ArrowUpRight } from 'lucide-react'

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
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased font-sans relative overflow-hidden">
      {/* Background neon ambient glows */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[var(--accent-purple-glow)] rounded-full blur-[160px] opacity-20 pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--accent-blue-glow)] rounded-full blur-[160px] opacity-25 pointer-events-none -z-10" />

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
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-canvas-bg/25 relative scrollbar-thin">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* AI Copilot Backdrop Overlay for Mobile viewports */}
      <AnimatePresence>
        {isCopilotOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCopilotOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Slide-out AI Copilot Drawer powered by Framer Motion */}
      <AnimatePresence>
        {isCopilotOpen && (
          <motion.aside
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed top-0 right-0 z-40 h-screen border-l border-[var(--border-glass)] bg-[#0b0c10]/95 backdrop-blur-3xl w-80 shadow-2xl flex flex-col"
          >
            <div className="flex flex-col h-full p-4 relative">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-glass)] select-none">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse shadow-[0_0_8px_var(--accent-blue)]" />
                  <span className="text-[9.5px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={11} className="text-[var(--accent-blue)]" />
                    Academic Companion
                  </span>
                </div>
                <button
                  onClick={() => setCopilotOpen(false)}
                  aria-label="Close AI Copilot"
                  className="p-1.5 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Chat Assistant Dialog */}
              <div className="flex-1 flex flex-col gap-4 py-4 overflow-y-auto pr-1 select-text scrollbar-none">
                <div className="p-3 bg-[var(--surface-bg)] border border-[var(--border-glass)] rounded-2xl flex flex-col gap-2 shadow-sm">
                  <span className="text-[10px] font-extrabold text-[var(--accent-blue)] uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare size={10} /> Copilot Core
                  </span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Hello! I am your AI Copilot. I can help summarize notes, build checkable flashcard decks, brainstorm project PRDs, or prepare you for technical placements.
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-[#0c0e14] to-[#161720] border border-[var(--border-glass)] rounded-2xl flex flex-col gap-2 text-center select-none py-6 mt-1 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-blue-glow)] rounded-full blur-xl opacity-20 group-hover:scale-125 transition-transform" />
                  
                  <span className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" /> Need exam prep?
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-3">Check note sources in the Smart Notes page to generate quizzes!</span>
                  <Link
                    href="/notes"
                    onClick={() => setCopilotOpen(false)}
                    className="w-full h-9 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-extrabold text-xs rounded-xl cursor-pointer hover:opacity-95 flex items-center justify-center gap-1 select-none shadow-[0_4px_12px_rgba(0,210,255,0.15)] active:scale-98 transition-all"
                  >
                    <span>Open Notes Hub</span>
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>

              {/* Simulated Input field */}
              <div className="border-t border-[var(--border-glass)] pt-3 select-none">
                <div className="relative flex items-center bg-black/40 border border-[var(--border-glass)] hover:border-[var(--border-glass-active)] transition-colors rounded-xl px-3 py-2.5">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask your digital twin copilot..."
                    className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-[var(--text-muted)] font-medium pr-8 focus:ring-0"
                  />
                  <button
                    aria-label="Send message"
                    className="absolute right-2.5 p-1 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

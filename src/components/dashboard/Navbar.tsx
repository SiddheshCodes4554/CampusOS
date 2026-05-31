'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, LogOut, Sparkles } from 'lucide-react'
import { signoutAction } from '@/app/actions/auth'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

interface NavbarProps {
  userEmail?: string
  userName?: string
  university?: string
  major?: string
  onToggleMobile: () => void
}

export function Navbar({
  userEmail = 'student@campus.edu',
  userName = 'Student',
  university = 'Stanford University',
  major = 'Computer Science',
  onToggleMobile
}: NavbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { isCopilotOpen, setCopilotOpen } = useDashboardStore()

  const notificationsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Mock student notifications
  const mockNotifications = [
    { id: '1', title: 'Upcoming Quiz', body: 'CS301 Midterm Quiz scheduled for tomorrow at 10 AM.', read: false, time: '2h ago' },
    { id: '2', title: 'Resume Review', body: 'AI analysis completed: Resume score is 88/100.', read: true, time: '5h ago' },
    { id: '3', title: 'Study Group Invite', body: 'Sarah invited you to CS301 Study Lounge.', read: false, time: '1d ago' },
  ]

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-glass)] bg-[rgba(13,14,18,0.7)] backdrop-blur-xl px-4 md:px-6 h-16 flex items-center justify-between">
      
      {/* Left section: mobile toggle and page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="md:hidden p-2 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-2 bg-black/40 border border-[var(--border-glass)] px-3 py-1.5 rounded-lg w-64">
          <Search size={16} className="text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search notes, schedules, settings..."
            className="bg-transparent border-none text-xs text-[var(--text-primary)] outline-none w-full placeholder-[var(--text-muted)]"
          />
        </div>
      </div>

      {/* Right section: notifications, profile, copilot toggle */}
      <div className="flex items-center gap-4">
        {/* AI Companion Toggle */}
        <button
          onClick={() => setCopilotOpen(!isCopilotOpen)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all select-none",
            isCopilotOpen
              ? "bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black border-transparent shadow-[var(--shadow-accent-glow)] animate-pulse"
              : "border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
          )}
        >
          <Sparkles size={14} />
          <span>AI Copilot</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] relative cursor-pointer"
          >
            <Bell size={18} />
            {mockNotifications.some((n) => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--accent-blue)] rounded-full ring-2 ring-[var(--canvas-bg)]" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[var(--border-glass)] bg-[rgba(22,23,30,0.95)] backdrop-blur-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-glass)]">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Alerts</span>
                <span className="text-[10px] text-[var(--accent-blue)] cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                {mockNotifications.map((notif) => (
                  <div key={notif.id} className="flex gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", notif.read ? "bg-transparent" : "bg-[var(--accent-blue)]")} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{notif.title}</span>
                      <span className="text-[11px] text-[var(--text-secondary)] leading-normal">{notif.body}</span>
                      <span className="text-[9px] text-[var(--text-muted)] mt-0.5">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full border border-[var(--border-glass)] bg-white/5 flex items-center justify-center text-[var(--text-primary)] font-bold text-sm cursor-pointer select-none hover:bg-white/10"
          >
            {userName.charAt(0)}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border-glass)] bg-[rgba(22,23,30,0.95)] backdrop-blur-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-glass)]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center text-black font-bold text-md select-none">
                  {userName.charAt(0)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{userName}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] truncate">{userEmail}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--text-secondary)] py-1">
                <div className="flex justify-between">
                  <span>Major:</span>
                  <span className="text-[var(--text-primary)] truncate font-medium">{major}</span>
                </div>
                <div className="flex justify-between">
                  <span>School:</span>
                  <span className="text-[var(--text-primary)] truncate font-medium">{university}</span>
                </div>
              </div>
              <form action={signoutAction} className="border-t border-[var(--border-glass)] pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 cursor-pointer transition-colors"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

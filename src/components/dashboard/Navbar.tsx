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
          aria-label="Open sidebar menu"
          className="md:hidden p-2 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-2.5 bg-black/40 border border-white/5 px-4 py-2 rounded-full w-72 transition-all focus-within:border-[var(--accent-blue)]/50 focus-within:shadow-[0_0_0_3px_var(--accent-blue-glow)]">
          <Search size={14} className="text-[var(--text-muted)]" />
          <input
            type="text"
            aria-label="Search content"
            placeholder="Search notes, schedules, settings..."
            className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-[var(--text-muted)] font-medium"
          />
        </div>
      </div>

      {/* Right section: notifications, profile, copilot toggle */}
      <div className="flex items-center gap-4">
        {/* AI Companion Toggle */}
        <button
          onClick={() => setCopilotOpen(!isCopilotOpen)}
          aria-label="Toggle AI Copilot Companion"
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all select-none duration-200",
            isCopilotOpen
              ? "bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black border-transparent shadow-[0_4px_12px_rgba(0,210,255,0.25)]"
              : "border-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
          )}
        >
          <Sparkles size={13} />
          <span>AI Copilot</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            className="p-2 hover:bg-white/5 rounded-xl text-[var(--text-secondary)] hover:text-white relative cursor-pointer transition-all"
          >
            <Bell size={16} />
            {mockNotifications.some((n) => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--accent-blue)] rounded-full ring-2 ring-[#0B0C10]" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/5 bg-[#12131A]/95 backdrop-blur-2xl p-4 shadow-2xl flex flex-col gap-3 z-50">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Alerts</span>
                <span className="text-[9px] text-[var(--accent-blue)] cursor-pointer hover:underline font-bold">Mark all read</span>
              </div>
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                {mockNotifications.map((notif) => (
                  <div key={notif.id} className="flex gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", notif.read ? "bg-transparent" : "bg-[var(--accent-blue)]")} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-white">{notif.title}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] leading-normal">{notif.body}</span>
                      <span className="text-[8px] text-[var(--text-muted)] mt-0.5 font-mono">{notif.time}</span>
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
            aria-label="User Profile menu"
            className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-white font-bold text-xs cursor-pointer select-none hover:bg-white/10 transition-all"
          >
            {userName.charAt(0)}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/5 bg-[#12131A]/95 backdrop-blur-2xl p-4 shadow-2xl flex flex-col gap-3.5 z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center text-black font-bold text-sm select-none shrink-0 shadow-lg shadow-[var(--accent-blue-glow)]">
                  {userName.charAt(0)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold text-white truncate">{userName}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] truncate font-mono">{userEmail}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-[10px] text-[var(--text-secondary)] py-0.5">
                <div className="flex justify-between items-center">
                  <span>Major:</span>
                  <span className="text-white truncate font-semibold max-w-[120px]">{major}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>University:</span>
                  <span className="text-white truncate font-semibold max-w-[120px]">{university}</span>
                </div>
              </div>
              <form action={signoutAction} className="border-t border-white/5 pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/15 cursor-pointer transition-colors"
                >
                  <LogOut size={13} />
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

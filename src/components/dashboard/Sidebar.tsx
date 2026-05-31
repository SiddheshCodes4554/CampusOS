'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Brain,
  Calendar,
  FileText,
  Cpu,
  Briefcase,
  BookOpen,
  GraduationCap,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Compass,
  MessageSquare
} from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'
import { signoutAction } from '@/app/actions/auth'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
  className?: string
}

export function Sidebar({ mobileOpen, onCloseMobile, className }: SidebarProps) {
  const pathname = usePathname()
  const { isSidebarCollapsed, setSidebarCollapsed } = useDashboardStore()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Academic Brain', href: '/brain', icon: Brain },
    { name: 'Academic Chat', href: '/chat', icon: MessageSquare },
    { name: 'Semester Copilot', href: '/semester', icon: Compass },
    { name: 'Study Planner', href: '/planner', icon: Calendar },
    { name: 'Resume Analyzer', href: '/resume', icon: FileText },
    { name: 'Project Builder', href: '/projects', icon: Cpu },
    { name: 'Internship Tracker', href: '/internships', icon: Briefcase },
    { name: 'Smart Notes', href: '/notes', icon: BookOpen },
    { name: 'Placement Prep', href: '/placement', icon: GraduationCap },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full relative p-3">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-2 py-3 mb-6 border-b border-[var(--border-glass)]/50">
        <div className="flex items-center gap-2.5">
          {/* Logo brand icon matching reference styling */}
          <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[var(--accent-blue)] mix-blend-screen opacity-90" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-purple)] mix-blend-screen opacity-90" />
            <div className="z-10 w-5 h-5 rounded-full bg-emerald-400 mix-blend-screen opacity-95" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-bold font-heading text-base tracking-wide text-[var(--text-primary)] select-none">
              CampusOS
            </span>
          )}
        </div>

        {/* Desktop Collapse Trigger */}
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="hidden md:flex p-1 hover:bg-white/5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Mobile Close Trigger */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="md:hidden p-1 hover:bg-white/5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 flex flex-col gap-1.5 px-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all select-none group',
                isActive
                  ? 'bg-[var(--accent-blue)] text-black shadow-[0_4px_12px_rgba(0,210,255,0.22)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]'
              )}
            >
              <Icon
                size={16}
                className={cn(
                  'shrink-0 transition-transform group-hover:scale-105 duration-200',
                  isActive ? 'text-black' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                )}
              />
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer / Logout action */}
      <div className="border-t border-[var(--border-glass)]/50 pt-3 mt-auto">
        <form action={signoutAction}>
          <button
            type="submit"
            aria-label="Logout"
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-red-400 hover:text-red-300 hover:bg-red-500/5 cursor-pointer transition-all select-none",
              isSidebarCollapsed ? "justify-center" : ""
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Actual Sidebar Shell */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 h-screen transition-all duration-300 border-r border-[var(--border-glass)]/70 bg-[#0B0C10]/80 backdrop-blur-xl',
          isSidebarCollapsed ? 'w-16' : 'w-56',
          mobileOpen ? 'translate-x-0 w-56' : '-translate-x-full md:translate-x-0',
          className
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

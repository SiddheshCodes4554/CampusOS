'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Cpu,
  Briefcase,
  BookOpen,
  GraduationCap,
  Settings,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

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
    { name: 'Study Planner', href: '/planner', icon: Calendar },
    { name: 'Resume Analyzer', href: '/resume', icon: FileText },
    { name: 'Project Builder', href: '/projects', icon: Cpu },
    { name: 'Internship Tracker', href: '/internships', icon: Briefcase },
    { name: 'Smart Notes', href: '/notes', icon: BookOpen },
    { name: 'Placement Prep', href: '/placement', icon: GraduationCap },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full relative">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-4 mb-4 border-b border-[var(--border-glass)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center font-bold text-black font-heading select-none">
            C
          </div>
          {!isSidebarCollapsed && (
            <span className="font-bold font-heading text-lg bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent select-none">
              CampusOS
            </span>
          )}
        </div>

        {/* Desktop Collapse Trigger */}
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden md:flex p-1 hover:bg-white/5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Mobile Close Trigger */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 hover:bg-white/5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all select-none group',
                isActive
                  ? 'bg-white/10 text-[var(--text-primary)] border-l-2 border-[var(--accent-blue)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]'
              )}
            >
              <Icon
                size={18}
                className={cn(
                  'shrink-0 transition-transform group-hover:scale-105',
                  isActive ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                )}
              />
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer Meta */}
      {!isSidebarCollapsed && (
        <div className="px-4 py-3 border-t border-[var(--border-glass)] text-[10px] text-[var(--text-muted)] select-none">
          CampusOS v1.0.0
        </div>
      )}
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
          'fixed md:sticky top-0 left-0 z-50 h-screen transition-all duration-300 border-r border-[var(--border-glass)] bg-[rgba(13,14,18,0.7)] backdrop-blur-xl',
          isSidebarCollapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0 w-60' : '-translate-x-full md:translate-x-0',
          className
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

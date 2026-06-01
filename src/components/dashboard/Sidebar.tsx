'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  MessageSquare,
  Flame,
  RefreshCw,
  LineChart,
  Database
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

  // Grouped nav items for high-fidelity SaaS layout
  const navSections = [
    {
      title: 'Core Telemetry',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Academic Brain', href: '/brain', icon: Database },
        { name: 'Memory Profile', href: '/memory', icon: Brain },
        { name: 'Academic Chat', href: '/chat', icon: MessageSquare },
      ]
    },
    {
      title: 'Academics',
      items: [
        { name: 'Semester Copilot', href: '/semester', icon: Compass },
        { name: 'Exam Prep', href: '/exam', icon: Flame },
        { name: 'Study Planner', href: '/planner', icon: Calendar },
        { name: 'Revision Mode', href: '/revision', icon: RefreshCw },
        { name: 'Analytics', href: '/analytics', icon: LineChart },
        { name: 'Smart Notes', href: '/notes', icon: BookOpen },
      ]
    },
    {
      title: 'Career & Projects',
      items: [
        { name: 'Resume Analyzer', href: '/resume', icon: FileText },
        { name: 'Project Builder', href: '/projects', icon: Cpu },
        { name: 'Internship Tracker', href: '/internships', icon: Briefcase },
        { name: 'Placement Prep', href: '/placement', icon: GraduationCap },
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
    }
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full relative p-3">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-2 py-3 mb-5 border-b border-[var(--border-glass)]/40">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img
            src="/CampusOSLogo.png"
            alt="CampusOS Logo"
            className="w-7 h-7 object-contain shrink-0 select-none"
          />
          {!isSidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold font-heading text-sm tracking-widest bg-gradient-to-r from-white via-slate-200 to-[var(--text-secondary)] bg-clip-text text-transparent select-none whitespace-nowrap"
            >
              CAMPUS<span className="text-[var(--accent-blue)]">OS</span>
            </motion.span>
          )}
        </div>

        {/* Desktop Collapse Trigger */}
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="hidden md:flex p-1 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors border border-transparent hover:border-white/5 shadow-inner"
        >
          {isSidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Mobile Close Trigger */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="md:hidden p-1 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Nav List with custom SaaS sections */}
      <nav className="flex-1 flex flex-col gap-5 px-0.5 overflow-y-auto scrollbar-none pr-1">
        {navSections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {/* Section Title */}
            {!isSidebarCollapsed && (
              <span className="px-3 text-[8.5px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-1 select-none">
                {section.title}
              </span>
            )}
            
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all select-none group relative border',
                      isActive
                        ? 'bg-[var(--surface-bg)] text-[var(--accent-blue)] border-[var(--border-glass-active)] shadow-[0_0_15px_rgba(0,210,255,0.05)]'
                        : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.02] border-transparent'
                    )}
                  >
                    {/* Active highlight side vertical line */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 w-0.5 h-4 rounded-r bg-[var(--accent-blue)] shadow-[0_0_8px_var(--accent-blue)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    <Icon
                      size={15}
                      className={cn(
                        'shrink-0 transition-all duration-300',
                        isActive ? 'text-[var(--accent-blue)] scale-105' : 'text-[var(--text-secondary)] group-hover:text-white group-hover:scale-105'
                      )}
                    />
                    
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}

                    {/* Collapsed Tooltip fallback */}
                    {isSidebarCollapsed && (
                      <div className="absolute left-14 opacity-0 group-hover:opacity-100 bg-[#0d0e12]/95 border border-[var(--border-glass-active)] text-[10px] px-2.5 py-1.5 rounded-lg text-white pointer-events-none select-none transition-all duration-200 z-50 whitespace-nowrap shadow-2xl translate-x-2 group-hover:translate-x-0">
                        {item.name}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Logout action */}
      <div className="border-t border-[var(--border-glass)]/40 pt-3 mt-auto">
        <form action={signoutAction}>
          <button
            type="submit"
            aria-label="Logout"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 cursor-pointer transition-all select-none",
              isSidebarCollapsed ? "justify-center" : ""
            )}
          >
            <LogOut size={15} className="shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
            {isSidebarCollapsed && (
              <div className="absolute left-14 opacity-0 group-hover:opacity-100 bg-rose-950/95 border border-rose-500/20 text-[10px] px-2.5 py-1.5 rounded-lg text-rose-300 pointer-events-none select-none transition-all duration-200 z-50 whitespace-nowrap shadow-2xl translate-x-2 group-hover:translate-x-0">
                Sign Out
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="md:hidden fixed inset-0 z-45 bg-black/70 backdrop-blur-sm transition-opacity"
          />
        )}
      </AnimatePresence>

      {/* Actual Sidebar Shell with Framer Motion spring stiffness */}
      <motion.aside
        animate={{
          width: isSidebarCollapsed ? 64 : 220,
        }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 h-screen border-r border-[var(--border-glass)]/60 bg-[rgba(11,12,16,0.85)] backdrop-blur-2xl flex-shrink-0',
          mobileOpen ? 'translate-x-0 w-[220px]' : '-translate-x-full md:translate-x-0',
          className
        )}
      >
        {sidebarContent}
      </motion.aside>
    </>
  )
}

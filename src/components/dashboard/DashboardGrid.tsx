'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  ArrowRight,
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardGridProps {
  userName?: string
}

export function DashboardGrid({ userName = 'Student' }: DashboardGridProps) {
  const supabase = createClient()

  // User stats
  const [stats, setStats] = useState({
    activePlanner: 'Advanced Operating Systems',
    plannerProgress: 64,
    activeProject: 'Fintech SaaS Dashboard',
    projectProgress: 75,
    studyHoursTarget: 10,
    studyHoursAchieved: 8.2,
    streak: 14
  })

  // Notes list state
  const [notes, setNotes] = useState([
    { id: '1', title: 'Indian Art and Culture', category: 'By Nitin Singhania', progress: 40 },
    { id: '2', title: 'Indian Polity', category: 'By M Laxmikanth', progress: 28 },
    { id: '3', title: 'Geography of India', category: 'By Majid Husain', progress: 12 }
  ])

  // To-Do list state
  const [todos, setTodos] = useState([
    { id: '1', title: 'Aptitude Assignment', time: '8:00 AM - 9:00 AM', done: false, color: '#10B981', category: 'aptitude' },
    { id: '2', title: 'Complete 12 History Sessions', time: '9:00 AM - 2:00 PM', done: true, color: '#F59E0B', category: 'planner' },
    { id: '3', title: 'Aptitude Live Session', time: '3:00 PM - 6:00 PM', done: false, color: '#00D2FF', category: 'aptitude' },
    { id: '4', title: 'Read Current Affairs', time: '6:00 PM - 7:30 PM', done: false, color: '#9D4EDD', category: 'notes' },
    { id: '5', title: 'Prepare Notes of Statistics', time: '8:30 PM - 10:00 PM', done: false, color: '#10B981', category: 'notes' },
    { id: '6', title: 'Maths Practice', time: '10:00 PM - 12:00 AM', done: false, color: '#00D2FF', category: 'aptitude' }
  ])

  // Load from local storage or database on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Fetch notes count & update first note details if any
          const { data: notesData } = await supabase
            .from('notes')
            .select('id, title, created_at')
            .limit(3)
          
          if (notesData && notesData.length > 0) {
            const parsedNotes = notesData.map((n, i) => ({
              id: n.id,
              title: n.title,
              category: 'Student Notebook',
              progress: i === 0 ? 68 : i === 1 ? 42 : 18
            }))
            setNotes(parsedNotes)
          }

          // Fetch study planner status
          const { data: planData } = await supabase
            .from('study_plans')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

          if (planData && planData.length > 0) {
            const plan = planData[0]
            const storageKey = `campusos-progress-${plan.id}`
            const savedProgress = localStorage.getItem(storageKey)
            let percent = 45
            if (savedProgress) {
              try {
                const checked = JSON.parse(savedProgress)
                const totalTasks = plan.roadmap.milestones.reduce((acc: number, m: { tasks: unknown[] }) => acc + m.tasks.length, 0)
                const completed = Object.values(checked).filter(Boolean).length
                percent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 45
              } catch {
                // error ignored
              }
            }
            setStats(prev => ({
              ...prev,
              activePlanner: plan.subject,
              plannerProgress: percent
            }))
          }

          // Fetch project status
          const { data: projectData } = await supabase
            .from('student_projects')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

          if (projectData && projectData.length > 0) {
            setStats(prev => ({
              ...prev,
              activeProject: projectData[0].title,
              projectProgress: 80
            }))
          }
        }
      } catch (e) {
        console.error('Error fetching dashboard states:', e)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 xl:grid-cols-3 gap-6 select-none"
    >
      {/* LEFT & CENTER MAIN PANEL (lg:col-span-2) */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        
        {/* Welcome & Streak Banner */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
              Welcome Back, {userName}
            </h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1">
              Your academic preparation hub. Here is your dashboard overview for today.
            </p>
          </div>
          <div className="flex gap-2 mt-3 sm:mt-0">
            <div className="glass-card px-3.5 py-1.5 flex items-center gap-2 border-[var(--border-glass)]">
              <Flame className="text-amber-500 fill-amber-500 animate-pulse" size={14} />
              <span className="text-[11px] font-bold text-[var(--text-primary)]">{stats.streak} Day Streak</span>
            </div>
          </div>
        </div>

        {/* 1. PROMIMEMT AI BANNER (Maths Reasoning Style) */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00A3FF] to-[#0066FF] p-6 text-white shadow-xl flex flex-col justify-between min-h-[160px] border border-white/10 group">
            {/* Mathematical / Coding equations background */}
            <div className="absolute inset-0 opacity-15 font-mono text-[9px] pointer-events-none select-none overflow-hidden leading-tight p-4">
              {`∫ (sin(x) / cos(x)) dx = -ln|cos(x)| + C\n`}
              {`f(n) = f(n-1) + f(n-2) // Fibonacci Sequence\n`}
              {`for (let i = 0; i < n; i++) { dp[i] = Math.max(dp[i-1] + arr[i], arr[i]) }\n`}
              {`const binarySearch = (arr, t) => { let l = 0, r = arr.length - 1; ... }\n`}
              {`A = πr² | lim(x→∞) (1 + 1/n)ⁿ = e | ▽ × E = -∂B/∂t\n`}
              {`O(log n) < O(n) < O(n log n) < O(n²)`}
            </div>

            {/* Glowing ambient light */}
            <span className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-400/20 blur-3xl group-hover:scale-110 transition-transform duration-700" />

            <div className="flex flex-col gap-1.5 relative z-10">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-200">
                HELLO ASPIRANTS !!!
              </span>
              <h2 className="text-2xl font-bold tracking-tight leading-none text-white font-heading">
                AI Copilot & Smart Builder
              </h2>
              <p className="text-xs text-white/80 max-w-sm mt-1 leading-relaxed">
                Generate study plans, audit resume ATS compatibility, run mock interview coding sessions, and organize note guides in seconds.
              </p>
            </div>

            <div className="mt-4 relative z-10 self-start">
              <Link
                href="/projects"
                className="inline-flex bg-black text-white hover:bg-black/80 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 items-center gap-1.5 cursor-pointer select-none"
              >
                <span>Start AI Builder</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 2. CONTINUE LEARNING SECTION (Progress Cards Block) */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Continue Learning
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Study Planner */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-4 flex flex-col justify-between min-h-[140px] hover:border-amber-400/30 transition-all border-white/5 bg-[#171821]/45">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {stats.activePlanner}
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)]">Study Planner Target</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-semibold text-amber-400 uppercase tracking-wider">
                      Active Plan
                    </span>
                  </div>

                  {/* Custom Progress Bar */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-[var(--text-secondary)]">Completion Progress</span>
                      <span className="text-amber-400">{stats.plannerProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${stats.plannerProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                  <span className="text-[9px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                    <Clock size={11} /> 12 days left
                  </span>
                  <Link
                    href="/planner"
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-[var(--text-primary)] transition-all cursor-pointer select-none"
                  >
                    Continue
                  </Link>
                </div>
              </GlassCard>
            </motion.div>

            {/* Card 2: AI Project Builder */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-4 flex flex-col justify-between min-h-[140px] hover:border-emerald-400/30 transition-all border-white/5 bg-[#171821]/45">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {stats.activeProject}
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)]">Portfolio Project</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Building
                    </span>
                  </div>

                  {/* Custom Progress Bar */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-[var(--text-secondary)]">Tasks Completed</span>
                      <span className="text-emerald-400">{stats.projectProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${stats.projectProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                  <span className="text-[9px] text-[var(--text-muted)] font-medium">
                    15/20 modules completed
                  </span>
                  <Link
                    href="/projects"
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-[var(--text-primary)] transition-all cursor-pointer select-none"
                  >
                    Continue
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>

        {/* 3. CONTINUE READING SECTION (Note cards with progress dials) */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Continue Reading
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notes.map((note) => (
              <motion.div key={note.id} variants={itemVariants}>
                <GlassCard className="p-4 flex flex-col justify-between min-h-[120px] border-white/5 bg-[#12131A]/60 hover:bg-[#12131A]/80 transition-colors">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate" title={note.title}>
                      {note.title}
                    </h4>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {note.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2">
                    {/* Small progress dial */}
                    <div className="flex items-center gap-2 select-none">
                      <div className="relative w-8 h-8 shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="16" cy="16" r="13" className="stroke-white/5 fill-transparent" strokeWidth="2.5" />
                          <circle
                            cx="16"
                            cy="16"
                            r="13"
                            className="fill-transparent stroke-[var(--accent-blue)]"
                            strokeWidth="2.5"
                            strokeDasharray={2 * Math.PI * 13}
                            strokeDashoffset={(2 * Math.PI * 13) * (1 - note.progress / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-[var(--text-primary)]">{note.progress}%</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/notes"
                      className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-primary)] transition-all cursor-pointer select-none"
                    >
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 4. COUNSELING SCHEDULE / PLACEMENT STRIP (Wide Strip at Bottom) */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-3.5 border-white/5 bg-[#12131A]/60 hover:bg-[#12131A]/80 transition-colors flex flex-col sm:flex-row justify-between items-center gap-3.5 rounded-2xl w-full">
            <div className="flex items-center gap-3">
              {/* Profile Avatar icon */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center text-black font-extrabold text-xs">
                AI
              </div>
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Stripe Recruiting Bot (Virtual Interviewer)
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  AI Recruiter Simulator • Behavioral & Technical Coding Assessment
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                Scheduled Today
              </span>
              <Link
                href="/placement"
                className="px-3 py-1.5 bg-[var(--accent-blue)] text-black hover:bg-[var(--accent-blue)]/90 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer select-none"
              >
                Start Session
              </Link>
            </div>
          </div>
        </motion.div>

      </div>

      {/* RIGHT SIDEBAR PANEL (Weekly Activities & To-Do List) */}
      <div className="xl:col-span-1 flex flex-col gap-6">
        
        {/* A. WEEKLY ACTIVITIES: Donut Chart & Legend */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
            <div className="border-b border-[var(--border-glass)] pb-2 select-none">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Weekly Activities
              </h3>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-36 h-36 shrink-0">
                {/* SVG Donut Circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="56" className="stroke-white/5 fill-transparent" strokeWidth="12" />
                  <circle
                    cx="72"
                    cy="72"
                    r="56"
                    className="fill-transparent stroke-[var(--accent-blue)]"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={(2 * Math.PI * 56) * (1 - 82 / 100)}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="56"
                    className="fill-transparent stroke-emerald-500/40"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={(2 * Math.PI * 56) * (1 - 65 / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">10</span>
                  <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mt-1">HRS/DAY</span>
                </div>
              </div>
            </div>

            {/* Legend checklist */}
            <div className="flex items-center justify-center gap-6 text-[10px] font-semibold text-[var(--text-secondary)] select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-white/20" />
                <span>Targeted (10h)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-[var(--accent-blue)]" />
                <span>Achieved (8.2h)</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* B. YOUR TO-DO LIST (Pill list with colored circular icons) */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
            <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 select-none">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Your To-Do List
              </h3>
              <span className="text-[10px] text-[var(--accent-blue)] font-bold">
                {todos.filter(t => !t.done).length} Pending
              </span>
            </div>

            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.02] border transition-colors cursor-pointer select-none",
                    todo.done ? "border-transparent opacity-45" : "border-white/5"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-1">
                    {/* Circle icon with background color */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${todo.color}15`, border: `1px solid ${todo.color}25` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: todo.color }} />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "text-xs font-bold text-[var(--text-primary)] truncate",
                        todo.done && "line-through text-[var(--text-muted)]"
                      )}>
                        {todo.title}
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                        {todo.time}
                      </span>
                    </div>
                  </div>

                  <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer shrink-0">
                    {todo.done ? (
                      <CheckCircle2 size={15} className="text-emerald-400" />
                    ) : (
                      <Circle size={15} className="text-white/20 hover:text-white/40" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <Link
              href="/planner"
              className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 border border-dashed border-white/5 hover:border-[var(--accent-blue)] rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer select-none"
            >
              <Plus size={14} />
              <span>Go to Study Planner</span>
            </Link>
          </GlassCard>
        </motion.div>

      </div>
    </motion.div>
  )
}

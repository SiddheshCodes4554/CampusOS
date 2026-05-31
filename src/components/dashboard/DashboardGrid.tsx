'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  Award,
  Sparkles,
  Flame,
  Plus,
  Briefcase,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardGridProps {
  userName?: string
}

export function DashboardGrid({ userName = 'Student' }: DashboardGridProps) {
  // Widget state: Tasks checklist
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Upload CS302 Syllabus PDF', due: 'Today', priority: 'high', done: false },
    { id: '2', title: 'Complete Leetcode Daily Challenge', due: 'Today', priority: 'medium', done: true },
    { id: '3', title: 'Revise resume alignment for software internships', due: 'Tomorrow', priority: 'high', done: false },
    { id: '4', title: 'Organize study planner schedule block', due: 'In 3 days', priority: 'low', done: false },
  ])

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  // Widget state: Goals
  const goals = [
    { id: '1', name: 'Master Tree Algorithms', progress: 85, color: 'var(--accent-blue)' },
    { id: '2', name: 'Complete 3 Project Modules', progress: 60, color: 'var(--accent-purple)' },
    { id: '3', name: 'Apply to 10 Summer Roles', progress: 40, color: '#10B981' },
  ]

  // Custom Chart Data: Study Hours
  const studyHoursData = [
    { day: 'Mon', hours: 4.5 },
    { day: 'Tue', hours: 6.0 },
    { day: 'Wed', hours: 3.5 },
    { day: 'Thu', hours: 8.0 },
    { day: 'Fri', hours: 5.5 },
    { day: 'Sat', hours: 7.0 },
    { day: 'Sun', hours: 9.0 }
  ]
  const chartHeight = 140
  const chartWidth = 420

  // Custom Chart Data: Course Progress
  const coursesProgress = [
    { code: 'CS301', progress: 88, name: 'Data Structures' },
    { code: 'ECE102', progress: 74, name: 'Digital Logic' },
    { code: 'MATH201', progress: 62, name: 'Linear Algebra' },
    { code: 'COMP404', progress: 95, name: 'AI Models' }
  ]

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
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
      className="flex flex-col gap-6 select-none"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col gap-1.5 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
            Welcome Back, {userName}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Here is your academic and internship overview for today.
          </p>
        </div>
        <div className="flex gap-2.5 mt-3 md:mt-0">
          <div className="glass-card px-4 py-2 flex items-center gap-2 border-[var(--border-glass)]">
            <Flame className="text-amber-500 fill-amber-500 animate-pulse" size={16} />
            <span className="text-xs font-semibold text-[var(--text-primary)]">14 Day Streak</span>
          </div>
        </div>
      </div>

      {/* Grid Layout Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 1: Tasks Due */}
        <motion.div variants={itemVariants}>
          <GlassCard className="h-full flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-glass)]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Tasks Due</h3>
                <span className="text-[10px] text-[var(--accent-blue)] font-semibold">{tasks.filter(t => !t.done).length} pending</span>
              </div>
              <div className="flex flex-col gap-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer border border-transparent",
                      task.done ? "opacity-50" : "hover:border-[var(--border-glass)]"
                    )}
                  >
                    <button className="text-[var(--text-secondary)] shrink-0 mt-0.5">
                      {task.done ? (
                        <CheckCircle2 size={16} className="text-[var(--success)]" />
                      ) : (
                        <Circle size={16} />
                      )}
                    </button>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={cn("text-xs font-medium text-[var(--text-primary)] truncate", task.done && "line-through text-[var(--text-muted)]")}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 text-[9px]">
                        <span className="text-[var(--text-muted)]">{task.due}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full border",
                          task.priority === 'high' ? "border-red-500/20 bg-red-500/10 text-red-400" :
                          task.priority === 'medium' ? "border-amber-500/20 bg-amber-500/10 text-amber-400" :
                          "border-blue-500/20 bg-blue-500/10 text-blue-400"
                        )}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-1.5 py-2 mt-4 border border-dashed border-[var(--border-glass)] hover:border-[var(--accent-blue)] rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
              <Plus size={14} />
              <span>Add custom task</span>
            </button>
          </GlassCard>
        </motion.div>

        {/* WIDGET 2: Resume Score & Suggestions */}
        <motion.div variants={itemVariants}>
          <GlassCard className="h-full flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-glass)]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Resume Score</h3>
                <span className="text-[10px] text-[var(--accent-purple)] font-semibold flex items-center gap-1">
                  <Sparkles size={10} /> AI Audited
                </span>
              </div>
              <div className="flex items-center gap-6 p-2">
                {/* Radial Score Indicator */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" className="stroke-white/5 fill-transparent" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" className="stroke-[var(--accent-blue)] fill-transparent" strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={(2 * Math.PI * 34) * (1 - 88 / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[var(--text-primary)]">88</span>
                    <span className="text-[9px] text-[var(--text-muted)]">/ 100</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Looking Strong!</span>
                  <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Your resume has high ATS compatibility. Make 2 quick edits to cross 90.
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[11px]">
                <div className="flex items-start gap-2 bg-white/[0.02] border border-[var(--border-glass)] p-2 rounded-lg">
                  <AlertCircle size={14} className="text-[var(--accent-blue)] shrink-0 mt-0.5" />
                  <span className="text-[var(--text-secondary)]">Quantify metrics in your Stanford Project details.</span>
                </div>
                <div className="flex items-start gap-2 bg-white/[0.02] border border-[var(--border-glass)] p-2 rounded-lg">
                  <AlertCircle size={14} className="text-[var(--accent-purple)] shrink-0 mt-0.5" />
                  <span className="text-[var(--text-secondary)]">Include key system architecture tools (e.g. Supabase).</span>
                </div>
              </div>
            </div>
            <button className="w-full py-2 mt-4 bg-white/5 hover:bg-white/10 border border-[var(--border-glass)] rounded-lg text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer text-center">
              Open Resume Hub
            </button>
          </GlassCard>
        </motion.div>

        {/* WIDGET 3: Internship Applications & Goals */}
        <motion.div variants={itemVariants}>
          <GlassCard className="h-full flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-glass)]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Applications</h3>
                <Briefcase size={14} className="text-[var(--text-muted)]" />
              </div>
              
              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-3 bg-black/20 border border-[var(--border-glass)] p-3 rounded-xl text-center">
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-[var(--text-primary)]">14</span>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Applied</span>
                </div>
                <div className="flex flex-col border-x border-[var(--border-glass)]">
                  <span className="text-xl font-bold text-[var(--accent-blue)]">3</span>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Interviews</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-[var(--success)]">1</span>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Offers</span>
                </div>
              </div>

              {/* Application milestones */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Active Goals</span>
                {goals.map(g => (
                  <div key={g.id} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--text-secondary)]">{g.name}</span>
                      <span className="text-[var(--text-primary)]">{g.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${g.progress}%`, backgroundColor: g.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full py-2 mt-4 bg-white/5 hover:bg-white/10 border border-[var(--border-glass)] rounded-lg text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer text-center">
              Manage Tracker
            </button>
          </GlassCard>
        </motion.div>

        {/* WIDGET 4: Productivity Area Chart (Custom SVG) */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard className="flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border-glass)]">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Productivity Chart</h3>
                <span className="text-[10px] text-[var(--text-secondary)]">Weekly Study Hours (Monday - Sunday)</span>
              </div>
              <div className="flex items-center gap-1 text-[var(--success)] text-xs font-semibold">
                <TrendingUp size={14} />
                <span>+12.4% vs last week</span>
              </div>
            </div>

            {/* High Fidelity Custom SVG Area Chart */}
            <div className="relative pt-4 w-full flex items-center justify-center">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full overflow-visible">
                <defs>
                  {/* Neon Glow Area Fill Gradient */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0" />
                  </linearGradient>
                  {/* Neon Line Path Gradient */}
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent-blue)" />
                    <stop offset="100%" stopColor="var(--accent-purple)" />
                  </linearGradient>
                  {/* Shadow Filter for Glow effect */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = chartHeight * (1 - ratio)
                  return (
                    <line key={i} x1="0" y1={y} x2={chartWidth} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  )
                })}

                {/* SVG Curve Path Drawing */}
                {/* Points: M x y C x1 y1, x2 y2, x y ... */}
                {/* Point coordinates generated based on study hours array */}
                <path
                  d="M 10 100 C 45 80, 55 50, 77 56 C 99 62, 121 110, 143 103 C 165 96, 187 25, 209 28 C 231 31, 253 70, 275 63 C 297 56, 319 40, 341 42 C 363 44, 385 10, 410 14"
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                  filter="url(#glow)"
                />

                {/* Filled Area beneath curve */}
                <path
                  d="M 10 100 C 45 80, 55 50, 77 56 C 99 62, 121 110, 143 103 C 165 96, 187 25, 209 28 C 231 31, 253 70, 275 63 C 297 56, 319 40, 341 42 C 363 44, 385 10, 410 14 L 410 140 L 10 140 Z"
                  fill="url(#areaGrad)"
                />

                {/* Interaction Dots on peaks */}
                <circle cx="209" cy="28" r="4.5" fill="var(--accent-purple)" stroke="white" strokeWidth="1.5" />
                <circle cx="410" cy="14" r="4.5" fill="var(--accent-blue)" stroke="white" strokeWidth="1.5" />

                {/* Tooltip Overlay Mock */}
                <g transform="translate(180, -2)">
                  <rect x="0" y="0" width="60" height="24" rx="6" fill="rgba(0,0,0,0.8)" stroke="var(--border-glass)" strokeWidth="1" />
                  <text x="30" y="15" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">8.0 hrs</text>
                </g>

                {/* X Axis Labels */}
                {studyHoursData.map((d, i) => {
                  const segment = chartWidth / (studyHoursData.length - 1)
                  const x = 10 + i * (segment - 3)
                  return (
                    <text key={i} x={x} y={chartHeight + 15} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                      {d.day}
                    </text>
                  )
                })}
              </svg>
            </div>
          </GlassCard>
        </motion.div>

        {/* WIDGET 5: Learning Course Progress (Custom SVG) */}
        <motion.div variants={itemVariants}>
          <GlassCard className="h-full flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border-glass)]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Class Progress</h3>
              <Award size={14} className="text-[var(--text-muted)]" />
            </div>

            {/* Course Progress Columns */}
            <div className="flex-1 flex flex-col justify-between gap-3 pt-2">
              {coursesProgress.map(c => (
                <div key={c.code} className="flex flex-col gap-1.5 p-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-lg transition-colors cursor-pointer">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex flex-col">
                      <span className="text-[var(--text-primary)]">{c.code}</span>
                      <span className="text-[9px] text-[var(--text-muted)] font-normal truncate max-w-[140px]">{c.name}</span>
                    </div>
                    <span className="text-[var(--accent-blue)]">{c.progress}%</span>
                  </div>
                  {/* Sleek Gradient progress line */}
                  <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-full transition-all duration-500" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </motion.div>
  )
}

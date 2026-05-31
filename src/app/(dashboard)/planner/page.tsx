'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Trash2,
  GraduationCap,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

interface Milestone {
  week: number
  title: string
  focus: string
  tasks: string[]
}

interface RevisionPhase {
  phase: string
  date: string
  topic: string
}

interface StudyPlanRoadmap {
  milestones: Milestone[]
  revision: RevisionPhase[]
}

interface StudyPlan {
  id: string
  subject: string
  exam_date: string
  daily_hours: number
  roadmap: StudyPlanRoadmap
}

export default function PlannerPage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  
  // Database state
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Interactive UI State
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true })
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({})

  // Form input state
  const [subject, setSubject] = useState('')
  const [examDate, setExamDate] = useState('')
  const [dailyHours, setDailyHours] = useState('3')

  // Load existing plan on mount
  useEffect(() => {
    const client = createClient()
    async function loadPlan() {
      try {
        const { data: { user } } = await client.auth.getUser()
        if (user) {
          const { data, error: dbError } = await client
            .from('study_plans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (!dbError && data && data.length > 0) {
            const currentPlan = data[0] as StudyPlan
            setPlan(currentPlan)
            
            // Load task progress from local storage
            const savedProgress = localStorage.getItem(`campusos-progress-${currentPlan.id}`)
            if (savedProgress) {
              setCheckedTasks(JSON.parse(savedProgress))
            }
          }
        }
      } catch {
        console.error('Failed to load study plan.')
      } finally {
        setLoading(false)
      }
    }
    loadPlan()
  }, [])

  // Save checked task state to Local Storage
  const toggleTask = (week: number, taskIndex: number) => {
    const key = `${week}-${taskIndex}`
    const updated = { ...checkedTasks, [key]: !checkedTasks[key] }
    setCheckedTasks(updated)
    if (plan) {
      localStorage.setItem(`campusos-progress-${plan.id}`, JSON.stringify(updated))
    }
  }

  // Calculate overall task progress
  const getProgressPercentage = () => {
    if (!plan || !plan.roadmap.milestones) return 0
    let totalTasks = 0
    let completedTasks = 0
    
    plan.roadmap.milestones.forEach(m => {
      m.tasks.forEach((_, idx) => {
        totalTasks++
        if (checkedTasks[`${m.week}-${idx}`]) {
          completedTasks++
        }
      })
    })

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  }

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!subject || !examDate) {
      setError('Subject and exam date are required.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/planner/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject,
            examDate,
            dailyHours
          })
        })

        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setPlan(data)
          setCheckedTasks({})
          setExpandedWeeks({ 1: true })
        }
      } catch {
        setError('Generation failed. Please try again.')
      }
    })
  }

  const handleDeletePlan = async () => {
    if (!plan) return
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', plan.id)

      if (dbError) {
        setError(dbError.message)
      } else {
        localStorage.removeItem(`campusos-progress-${plan.id}`)
        setPlan(null)
        setCheckedTasks({})
        setSubject('')
        setExamDate('')
      }
    } catch {
      setError('Deletion failed. Please try again.')
    }
  }

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }))
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse select-none">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2 w-1/3">
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>

        {/* Metrics/Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="p-6 flex flex-col gap-3 border-white/5 bg-[#12131A]/60">
              <Skeleton className="w-8 h-8 rounded-lg animate-pulse" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-6 w-1/3 rounded-md mt-1" />
            </GlassCard>
          ))}
        </div>

        {/* Content Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Skeleton className="h-5 w-1/4 rounded-lg" />
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-5 flex flex-col gap-3 border-white/5 bg-[#12131A]/60">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4.5 w-1/3 rounded-md" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-1/2 rounded-md" />
                <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
              </GlassCard>
            ))}
          </div>
          
          <div className="lg:col-span-1">
            <GlassCard className="p-6 h-[40vh] flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
              <Skeleton className="h-5 w-1/2 rounded" />
              <Skeleton className="flex-1 rounded-xl" />
            </GlassCard>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in-entry flex flex-col gap-6 select-none">
      {/* Header section */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
            Study Planner
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            AI-driven coursework schedules, timeline milestones, and revision trackers.
          </p>
        </div>
        {plan && (
          <button
            onClick={handleDeletePlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer transition-all"
          >
            <Trash2 size={13} />
            <span>Reset Plan</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* VIEW 1: Generator Form (If no active study plan exists) */}
        {!plan ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex items-center justify-center pt-4"
          >
            <GlassCard className="max-w-md w-full p-8 flex flex-col gap-6 bg-[#12131A]/60 border-white/5">
              <div className="text-center flex flex-col gap-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] mx-auto flex items-center justify-center text-black font-extrabold shadow-lg shadow-[var(--accent-blue-glow)]">
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Configure AI Study Planner</h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Enter your syllabus targets below, and Gemini will map out your week-by-week academic semester roadmap.
                </p>
              </div>

              <form onSubmit={handleGenerate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="planner-subject" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Subject / Course Name
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3.5 text-[var(--text-muted)]" size={15} />
                    <input
                      id="planner-subject"
                      type="text"
                      placeholder="e.g. Advanced Operating Systems"
                      disabled={isPending}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-4 py-3 text-xs text-[var(--text-primary)] outline-none transition-all w-full"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="planner-examDate" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Exam Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 text-[var(--text-muted)]" size={15} />
                      <input
                        id="planner-examDate"
                        type="date"
                        disabled={isPending}
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-9 pr-3 py-3 text-xs text-[var(--text-primary)] outline-none transition-all cursor-pointer w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="planner-dailyHours" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Study Hours / Day
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3.5 text-[var(--text-muted)]" size={15} />
                      <select
                        id="planner-dailyHours"
                        disabled={isPending}
                        value={dailyHours}
                        onChange={(e) => setDailyHours(e.target.value)}
                        className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] rounded-xl pl-9 pr-3 py-3 text-xs text-[var(--text-primary)] outline-none transition-all cursor-pointer w-full appearance-none"
                      >
                        <option value="1">1 Hour</option>
                        <option value="2">2 Hours</option>
                        <option value="3">3 Hours</option>
                        <option value="4">4 Hours</option>
                        <option value="6">6 Hours</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-4 text-[var(--text-muted)] pointer-events-none" size={12} />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-3 rounded-lg leading-relaxed flex items-start gap-2 select-text">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 font-bold h-11 rounded-xl mt-2 cursor-pointer disabled:opacity-75 flex items-center justify-center gap-1.5 shadow-lg shadow-[var(--accent-blue-glow)] border-0"
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-black animate-spin" />
                      <span>Generating Roadmap...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Generate with AI</span>
                    </>
                  )}
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        ) : (
          /* VIEW 2: Interactive Roadmap View */
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2"
          >
            {/* Left section: milestones and daily tasks */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              
              {/* Progress Summary Card */}
              <GlassCard className="p-5 flex flex-col gap-3.5 border-white/5 bg-[#12131A]/60">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[var(--text-secondary)]">Syllabus Completion</span>
                  <span className="text-[var(--accent-blue)]">{getProgressPercentage()}% Complete</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,210,255,0.4)]"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                <div className="flex gap-4 text-[10px] text-[var(--text-muted)] mt-1 select-none">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Clock size={12} className="text-[var(--accent-blue)]" />
                    <span>{plan.daily_hours} hrs/day intensity</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 font-semibold">
                    <Calendar size={12} className="text-[var(--accent-purple)]" />
                    <span>Target Exam: {new Date(plan.exam_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </GlassCard>

              {/* Weekly Accordion Roadmaps */}
              <div className="flex flex-col gap-3">
                {plan.roadmap.milestones.map((m) => {
                  const isExpanded = !!expandedWeeks[m.week]
                  const completedInWeek = m.tasks.filter((_, idx) => checkedTasks[`${m.week}-${idx}`]).length
                  const totalInWeek = m.tasks.length
                  const weekPercent = totalInWeek > 0 ? Math.round((completedInWeek / totalInWeek) * 100) : 0

                  return (
                    <GlassCard key={m.week} className="overflow-hidden border-white/5 bg-[#12131A]/60">
                      {/* Accordion header click wrapper */}
                      <div
                        onClick={() => toggleWeek(m.week)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleWeek(m.week)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`Toggle Week ${m.week} study milestones`}
                        className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.02] transition-colors outline-none focus-visible:bg-white/5"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Active Indicator capsule */}
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                            weekPercent === 100
                              ? "bg-emerald-500 text-black shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                              : isExpanded
                              ? "bg-[var(--accent-blue)] text-black shadow-[0_2px_8px_rgba(0,210,255,0.3)]"
                              : "bg-white/5 text-[var(--text-secondary)] border border-white/5"
                          )}>
                            W{m.week}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-extrabold text-[var(--text-primary)] truncate">{m.title}</span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{m.focus}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3.5 shrink-0">
                          <span className="text-[9px] font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded-full text-[var(--text-secondary)] hidden sm:inline-block">
                            {completedInWeek}/{totalInWeek} Done
                          </span>
                          <button className="text-[var(--text-secondary)]">
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Accordion body checklist */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 flex flex-col gap-2.5 bg-black/10 select-text">
                          {m.tasks.map((task, idx) => {
                            const isChecked = !!checkedTasks[`${m.week}-${idx}`]
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleTask(m.week, idx)}
                                onKeyDown={(e) => {
                                  if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault()
                                    toggleTask(m.week, idx)
                                  }
                                }}
                                role="checkbox"
                                aria-checked={isChecked}
                                tabIndex={0}
                                className={cn(
                                  "flex items-start gap-3 p-3 bg-[#171821]/40 border rounded-xl hover:bg-[#171821]/60 transition-all cursor-pointer select-none outline-none focus-visible:border-[var(--accent-blue)]/50",
                                  isChecked ? "border-emerald-500/10 opacity-60" : "border-white/5"
                                )}
                              >
                                <span className="shrink-0 mt-0.5 text-[var(--text-secondary)]">
                                  {isChecked ? (
                                    <CheckSquare size={16} className="text-emerald-400" />
                                  ) : (
                                    <Square size={16} className="text-white/20 hover:text-white/40" />
                                  )}
                                </span>
                                <span className={`text-[11px] leading-relaxed transition-all ${isChecked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)] font-medium'}`}>
                                  {task}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            </div>

            {/* Right section: revision milestones */}
            <div className="flex flex-col gap-4">
              <GlassCard className="flex flex-col gap-5 p-5 min-h-[60vh] border-white/5 bg-[#12131A]/60">
                <div className="pb-3 border-b border-[var(--border-glass)] flex items-center gap-2 select-none">
                  <GraduationCap size={16} className="text-[var(--accent-purple)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Revision Timeline</span>
                </div>
                
                {/* Timeline vertical line list */}
                <div className="flex-1 flex flex-col gap-6 pt-2 relative pl-5 border-l border-white/5 ml-3.5 select-text">
                  {plan.roadmap.revision.map((rev, idx) => (
                    <div key={idx} className="relative flex flex-col gap-1.5 group">
                      {/* Timeline dot with glowing effect on hover */}
                      <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-[var(--accent-purple)] border-2 border-[#12131A] ring-2 ring-[var(--accent-purple)]/20 group-hover:scale-110 transition-transform duration-200" />
                      
                      <span className="text-[9px] font-extrabold text-[var(--accent-purple)] uppercase tracking-widest leading-none">
                        {new Date(rev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {rev.phase}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-medium">
                        {rev.topic}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

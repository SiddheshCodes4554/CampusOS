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
  AlertCircle,
  GraduationCap
} from 'lucide-react'

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[var(--accent-blue)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="fade-in-entry flex flex-col gap-6">
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
            <GlassCard className="max-w-md w-full p-8 flex flex-col gap-6">
              <div className="text-center flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] mx-auto flex items-center justify-center text-black font-bold">
                  <Sparkles size={20} />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Configure AI Planner</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Enter your syllabus targets below, and Gemini will map out your semester roadmap.
                </p>
              </div>

              <form onSubmit={handleGenerate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Subject / Course Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Advanced Operating Systems"
                    disabled={isPending}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      disabled={isPending}
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition-all cursor-pointer"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Study Hours / Day
                    </label>
                    <select
                      disabled={isPending}
                      value={dailyHours}
                      onChange={(e) => setDailyHours(e.target.value)}
                      className="bg-black/40 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition-all cursor-pointer"
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                      <option value="3">3 Hours</option>
                      <option value="4">4 Hours</option>
                      <option value="6">6 Hours</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-3 rounded-lg leading-relaxed flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold h-10 mt-2 cursor-pointer disabled:opacity-75"
                >
                  {isPending ? 'Generating Roadmap...' : 'Generate with AI'}
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
              <GlassCard className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[var(--text-secondary)]">Syllabus Completion</span>
                  <span className="text-[var(--accent-blue)]">{getProgressPercentage()}%</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-full transition-all duration-500" style={{ width: `${getProgressPercentage()}%` }} />
                </div>
                <div className="flex gap-4 text-[10px] text-[var(--text-muted)] mt-1 select-none">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{plan.daily_hours} hrs/day</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-[var(--border-glass)] pl-4">
                    <Calendar size={12} />
                    <span>Exam: {new Date(plan.exam_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </GlassCard>

              {/* Weekly Accordion Roadmaps */}
              <div className="flex flex-col gap-3">
                {plan.roadmap.milestones.map((m) => {
                  const isExpanded = !!expandedWeeks[m.week]
                  return (
                    <GlassCard key={m.week} className="overflow-hidden border-[var(--border-glass)]">
                      {/* Accordion header click wrapper */}
                      <div
                        onClick={() => toggleWeek(m.week)}
                        className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.01]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-[var(--accent-blue)]">
                            W{m.week}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{m.title}</span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{m.focus}</span>
                          </div>
                        </div>
                        <button className="text-[var(--text-secondary)]">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {/* Accordion body checklist */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-[var(--border-glass)] pt-3 flex flex-col gap-2.5">
                          {m.tasks.map((task, idx) => {
                            const isChecked = !!checkedTasks[`${m.week}-${idx}`]
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleTask(m.week, idx)}
                                className="flex items-start gap-3 p-2.5 bg-black/25 border border-white/5 rounded-lg hover:border-[var(--border-glass)] transition-all cursor-pointer select-none"
                              >
                                <button className="shrink-0 mt-0.5 text-[var(--text-secondary)]">
                                  {isChecked ? (
                                    <CheckSquare size={15} className="text-[var(--accent-blue)]" />
                                  ) : (
                                    <Square size={15} />
                                  )}
                                </button>
                                <span className={`text-[11px] leading-relaxed transition-all ${isChecked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
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
              <GlassCard className="flex flex-col gap-4 h-full">
                <div className="pb-2 border-b border-[var(--border-glass)] flex items-center gap-2">
                  <GraduationCap size={16} className="text-[var(--accent-purple)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Revision Timeline</span>
                </div>
                
                {/* Timeline vertical line list */}
                <div className="flex-1 flex flex-col gap-5 pt-2 relative pl-4 border-l border-[var(--border-glass)] ml-3">
                  {plan.roadmap.revision.map((rev, idx) => (
                    <div key={idx} className="relative flex flex-col gap-1">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-purple)] border-2 border-[var(--canvas-bg)] ring-2 ring-[var(--accent-purple)]/20" />
                      <span className="text-[9px] font-bold text-[var(--accent-purple)] uppercase tracking-wider">
                        {new Date(rev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {rev.phase}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
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

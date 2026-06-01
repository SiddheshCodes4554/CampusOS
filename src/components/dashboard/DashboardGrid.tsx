'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  ArrowRight,
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Brain,
  Activity,
  Zap,
  Battery,
  Sliders,
  TrendingUp,
  Cpu,
  Terminal,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Milestone {
  week: number
  title: string
  focus: string
  tasks: string[]
}

interface ChecklistItem {
  id: string
  dayNumber: number
  task: string
  details: string
}

interface RoadmapPhase {
  title: string
  tasks: string[]
}

interface StudyPlanRoadmap {
  milestones: Milestone[]
  revision?: Array<{ phase: string; date: string; topic: string }>
}

interface StudyPlan {
  id: string
  subject: string
  exam_date: string
  daily_hours: number
  roadmap: StudyPlanRoadmap
}

interface TodoItem {
  id: string
  title: string
  time: string
  done: boolean
  color: string
  category: string
  originalType: 'study' | 'revision'
  planId: string
  week?: number
  idx?: number
  itemId?: string
}

interface DashboardGridProps {
  userName?: string
}

export function DashboardGrid({ userName = 'Student' }: DashboardGridProps) {
  const supabase = createClient()

  // User stats
  const [stats, setStats] = useState({
    activePlanner: null as string | null,
    activePlannerId: null as string | null,
    plannerProgress: 0,
    activeProject: null as string | null,
    activeProjectId: null as string | null,
    projectProgress: 0,
    studyHoursTarget: 3.0,
    studyHoursAchieved: 0,
    streak: 0
  })

  // AI Twin status
  const [twinStatus, setTwinStatus] = useState({
    monologue: "Academic Twin Offline: Ingest materials to initialize cognitive telemetry",
    telemetry: {
      forgettingIndex: 0,
      focusBattery: 0,
      latencyMs: 0,
      density: 0
    },
    loading: true,
    offline: true
  })

  // Notes list state
  const [notes, setNotes] = useState<Array<{ id: string; title: string; category: string; date: string }>>([])

  // To-Do list state
  const [todos, setTodos] = useState<TodoItem[]>([])

  // Load from local storage or database on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // 1. Fetch user profiles onboarding target
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_data')
            .eq('id', user.id)
            .single()

          let targetHours = 3.0
          if (profile?.onboarding_data?.studyHours) {
            targetHours = parseFloat(profile.onboarding_data.studyHours) || 3.0
          }

          // 2. Fetch notes
          const { data: notesData } = await supabase
            .from('notes')
            .select('id, title, created_at')
            .order('created_at', { ascending: false })
            .limit(3)
          
          if (notesData) {
            const parsedNotes = notesData.map((n) => ({
              id: n.id,
              title: n.title,
              category: 'Student Notebook',
              date: new Date(n.created_at).toLocaleDateString()
            }))
            setNotes(parsedNotes)
          }

          // 3. Fetch study sessions for streak and hours today
          const { data: sessions } = await supabase
            .from('study_sessions')
            .select('duration_minutes, study_date')
            .eq('user_id', user.id)

          let todayMins = 0
          let computedStreak = 0
          if (sessions && sessions.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0]
            todayMins = sessions
              .filter(s => s.study_date === todayStr)
              .reduce((acc, curr) => acc + curr.duration_minutes, 0)

            const dates = Array.from(new Set(sessions.map(s => s.study_date))).sort((a, b) => b.localeCompare(a))
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
            
            let current = todayStr
            let index = dates.indexOf(current)
            if (index === -1) {
              current = yesterdayStr
              index = dates.indexOf(current)
            }
            
            if (index !== -1) {
              computedStreak = 1
              const checkDate = new Date(current)
              while (true) {
                checkDate.setDate(checkDate.getDate() - 1)
                const checkStr = checkDate.toISOString().split('T')[0]
                if (dates.includes(checkStr)) {
                  computedStreak++
                } else {
                  break
                }
              }
            }
          }

          // 4. Fetch study planner status & tasks
          const { data: planData } = await supabase
            .from('study_plans')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

          let currentPlannerTitle: string | null = null
          let currentPlannerId: string | null = null
          let currentPlannerProgress = 0
          const tasksList: TodoItem[] = []

          if (planData && planData.length > 0) {
            const plan = planData[0] as StudyPlan
            currentPlannerTitle = plan.subject
            currentPlannerId = plan.id

            const storageKey = `campusos-progress-${plan.id}`
            const savedProgress = localStorage.getItem(storageKey)
            const checked = savedProgress ? JSON.parse(savedProgress) : {}

            if (plan.roadmap?.milestones) {
              let totalTasks = 0
              let completed = 0
              plan.roadmap.milestones.forEach((milestone: Milestone) => {
                milestone.tasks.forEach((taskTitle: string, taskIdx: number) => {
                  totalTasks++
                  const isDone = !!checked[`${milestone.week}-${taskIdx}`]
                  if (isDone) completed++

                  // Add incomplete or recent tasks to dashboard todo list
                  if (tasksList.length < 3 || !isDone) {
                    tasksList.push({
                      id: `study-${plan.id}-${milestone.week}-${taskIdx}`,
                      title: taskTitle,
                      time: `Week ${milestone.week} • ${plan.subject}`,
                      done: isDone,
                      color: '#00d2ff',
                      category: 'planner',
                      originalType: 'study',
                      planId: plan.id,
                      week: milestone.week,
                      idx: taskIdx
                    })
                  }
                })
              })
              currentPlannerProgress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0
            }
          }

          // 5. Fetch revision plan status & tasks
          const { data: revisionPlans } = await supabase
            .from('revision_plans')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

          if (revisionPlans && revisionPlans.length > 0) {
            const revPlan = revisionPlans[0]
            if (revPlan.checklist) {
              const checked = revPlan.checklist_state || {}
              revPlan.checklist.forEach((item: ChecklistItem) => {
                const isDone = !!checked[item.id]
                if (tasksList.length < 6) {
                  tasksList.push({
                    id: `revision-${revPlan.id}-${item.id}`,
                    title: item.task,
                    time: `Day ${item.dayNumber} • ${revPlan.subject_name} Revision`,
                    done: isDone,
                    color: '#9d4edd',
                    category: 'revision',
                    originalType: 'revision',
                    planId: revPlan.id,
                    itemId: item.id
                  })
                }
              })
            }
          }

          // Sort tasks so incomplete are on top
          tasksList.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
          setTodos(tasksList.slice(0, 6))

          // 6. Fetch project status
          const { data: projectData } = await supabase
            .from('student_projects')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

          let currentProjectTitle = null
          let currentProjectId = null
          let currentProjectProgress = 0

          if (projectData && projectData.length > 0) {
            const project = projectData[0]
            currentProjectTitle = project.title
            currentProjectId = project.id

            const storageKey = `campusos-project-tasks-${project.id || project.title}`
            const savedTasks = localStorage.getItem(storageKey)
            const checkedTasks = savedTasks ? JSON.parse(savedTasks) : {}

            let totalTasks = 0
            let completedTasks = 0
            if (project.roadmap && Array.isArray(project.roadmap)) {
              project.roadmap.forEach((phaseObj: RoadmapPhase, phaseIdx: number) => {
                if (phaseObj && Array.isArray(phaseObj.tasks)) {
                  phaseObj.tasks.forEach((_: string, taskIdx: number) => {
                    totalTasks++
                    const key = `${phaseIdx}-${taskIdx}`
                    if (checkedTasks[key]) completedTasks++
                  })
                }
              })
            }
            currentProjectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          }

          // 7. Update stats state
          setStats({
            activePlanner: currentPlannerTitle,
            activePlannerId: currentPlannerId,
            plannerProgress: currentPlannerProgress,
            activeProject: currentProjectTitle,
            activeProjectId: currentProjectId,
            projectProgress: currentProjectProgress,
            studyHoursTarget: targetHours,
            studyHoursAchieved: Math.round((todayMins / 60) * 10) / 10,
            streak: computedStreak
          })

          // 8. Fetch Twin Telemetry recommendations
          try {
            const twinRes = await fetch('/api/memory/twin-recommendation')
            const twinData = await twinRes.json()
            if (twinData && !twinData.error) {
              setTwinStatus({
                monologue: twinData.monologue,
                telemetry: twinData.telemetry || { forgettingIndex: 0, focusBattery: 0, latencyMs: 0, density: 0 },
                loading: false,
                offline: !!twinData.offline
              })
            }
          } catch (err) {
            console.warn('Dashboard: Failed to load twin status:', err)
          }
        }
      } catch (e) {
        console.error('Error fetching dashboard states:', e)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTodo = async (todo: TodoItem) => {
    const isNewDone = !todo.done

    // Update local state first for instant response
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: isNewDone } : t))

    if (todo.originalType === 'study') {
      const storageKey = `campusos-progress-${todo.planId}`
      const savedProgress = localStorage.getItem(storageKey)
      const checked = savedProgress ? JSON.parse(savedProgress) : {}
      checked[`${todo.week}-${todo.idx}`] = isNewDone
      localStorage.setItem(storageKey, JSON.stringify(checked))
    } else if (todo.originalType === 'revision' && todo.itemId) {
      try {
        const { data: currentPlan } = await supabase
          .from('revision_plans')
          .select('checklist_state')
          .eq('id', todo.planId)
          .single()

        const currentState = currentPlan?.checklist_state || {}
        const updatedState = { ...currentState, [todo.itemId]: isNewDone }

        await supabase
          .from('revision_plans')
          .update({ checklist_state: updatedState })
          .eq('id', todo.planId)
      } catch (err) {
        console.error('Failed to update revision checklist state:', err)
      }
    }
  }

  // Simulator controls (reactive instant metrics adjustments)
  const [simRetention, setSimRetention] = useState(72)
  const [simStamina, setSimStamina] = useState(85)
  const [simLatency, setSimLatency] = useState(140)
  const [simDensity, setSimDensity] = useState(48)

  useEffect(() => {
    if (!twinStatus.offline) {
      setSimRetention(twinStatus.telemetry.forgettingIndex)
      setSimStamina(twinStatus.telemetry.focusBattery)
      setSimLatency(twinStatus.telemetry.latencyMs)
      setSimDensity(twinStatus.telemetry.density)
    }
  }, [twinStatus])

  const triggerStudySession = () => {
    setSimStamina(prev => Math.max(10, prev - 22))
    setSimRetention(prev => Math.min(100, prev + 12))
    setSimLatency(prev => Math.max(80, prev - 25))
    setSimDensity(prev => Math.min(100, prev + 4))
  }

  const triggerRestCycle = () => {
    setSimStamina(100)
    setSimLatency(prev => Math.max(90, prev - 15))
  }

  const triggerTimeSkip = () => {
    setSimRetention(prev => Math.max(20, prev - 15))
    setSimLatency(prev => Math.min(350, prev + 50))
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
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 xl:grid-cols-3 gap-6 select-text pb-20"
    >
      {/* LEFT & CENTER MAIN PANEL (xl:col-span-2) */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        
        {/* Welcome & Streak Banner */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-between sm:items-center border-b border-[var(--border-glass)]/20 pb-4 select-none">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[var(--text-secondary)] bg-clip-text text-transparent font-heading">
              Mission Control
            </h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1">
              Active Session telemetry for candidate <span className="text-[var(--accent-blue)] font-bold">{userName}</span>
            </p>
          </div>
          {stats.streak > 0 && (
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="glass-card px-3.5 py-1.5 flex items-center gap-2 border-[var(--border-glass)] shadow-[0_0_12px_rgba(245,158,11,0.05)] bg-[rgba(245,158,11,0.03)]"
            >
              <Flame className="text-amber-500 fill-amber-500 animate-pulse" size={13} />
              <span className="text-[10px] font-extrabold text-amber-400 tracking-wider font-mono">{stats.streak} DAY STREAK</span>
            </motion.div>
          )}
        </div>

        {/* 1. PROMINENT AI BRAIN BANNER (Mathematical/Coding Theme) */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c0f16] via-[#11131c] to-[#08090d] p-6 text-white shadow-2xl flex flex-col justify-between min-h-[170px] border border-[var(--border-glass-active)] group">
            {/* Mathematical / Coding equations background */}
            <div className="absolute inset-0 opacity-[0.07] font-mono text-[9px] pointer-events-none select-none overflow-hidden leading-relaxed p-4 select-none">
              {`∫ (sin(x) / cos(x)) dx = -ln|cos(x)| + C\n`}
              {`f(n) = f(n-1) + f(n-2) // Fibonacci Sequence\n`}
              {`for (let i = 0; i < n; i++) { dp[i] = Math.max(dp[i-1] + arr[i], arr[i]) }\n`}
              {`const binarySearch = (arr, t) => { let l = 0, r = arr.length - 1; ... }\n`}
              {`A = πr² | lim(x→∞) (1 + 1/n)ⁿ = e | ▽ × E = -∂B/∂t\n`}
              {`O(log n) < O(n) < O(n log n) < O(n²)`}
            </div>

            {/* Glowing neon background orbs */}
            <span className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[var(--accent-blue-glow)] blur-[80px] group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
            <span className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-[var(--accent-purple-glow)] blur-[60px] pointer-events-none" />

            <div className="flex flex-col gap-1.5 relative z-10 select-none">
              <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-[var(--accent-blue)] flex items-center gap-1.5">
                <Terminal size={11} />
                Cognitive Pipeline Status // ACTIVE
              </span>
              <h2 className="text-xl font-extrabold tracking-tight text-white font-heading mt-1">
                AI Academic Twin & Pipeline
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mt-1 leading-relaxed">
                vectorize your syllabi and coursework materials into high-dimension embeddings, map prerequisite nodes, and query notes dynamically.
              </p>
            </div>

            <div className="mt-5 relative z-10 self-start">
              <Link
                href="/projects"
                className="inline-flex bg-white hover:bg-slate-100 text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(255,255,255,0.06)] active:scale-95 items-center gap-1.5 cursor-pointer select-none"
              >
                <span>Initialize Project Builder</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 2. CONTINUE LEARNING (Progress Cards Grid) */}
        <div className="flex flex-col gap-3">
          <h3 className="px-1 text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] select-none">
            Active Study Iterations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Study Planner Card */}
            <motion.div variants={itemVariants}>
              {stats.activePlanner ? (
                <GlassCard className="p-5 flex flex-col justify-between min-h-[150px] border-[var(--border-glass)] hover:border-[rgba(0,210,255,0.25)] transition-all bg-[var(--surface-bg)] shadow-md">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start select-none">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <h4 className="text-xs font-extrabold text-white truncate uppercase tracking-wider">
                          {stats.activePlanner}
                        </h4>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase">COURSEWORK SCHEDULE</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 text-[8px] font-extrabold text-[var(--accent-blue)] uppercase tracking-wider select-none">
                        Active Plan
                      </span>
                    </div>

                    {/* Custom Progress Bar */}
                    <div className="flex flex-col gap-1.5 mt-3 select-none">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-[var(--text-secondary)]">Milestones Met</span>
                        <span className="text-[var(--accent-blue)]">{stats.plannerProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.plannerProgress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-[var(--accent-blue)] rounded-full shadow-[0_0_8px_var(--accent-blue)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--border-glass)]/50">
                    <span className="text-[9px] text-[var(--text-muted)] font-mono flex items-center gap-1.5 select-none">
                      <Clock size={11} /> TRACE_OK
                    </span>
                    <Link
                      href="/planner"
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-extrabold text-white transition-all cursor-pointer select-none border border-white/5"
                    >
                      Continue
                    </Link>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-5 flex flex-col justify-between min-h-[150px] border-[var(--border-glass)] hover:border-[rgba(0,210,255,0.25)] transition-all bg-[var(--surface-bg)]">
                  <div className="flex flex-col gap-2 select-none">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">No Active Study Plan</h4>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
                        STANDBY
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      Map course parameters and exam calendars to generate weekly milestones automatically.
                    </p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Link
                      href="/planner"
                      className="px-4 py-1.5 bg-[var(--accent-blue)] text-black hover:opacity-90 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer select-none shadow-[0_4px_12px_rgba(0,210,255,0.15)]"
                    >
                      Create Plan
                    </Link>
                  </div>
                </GlassCard>
              )}
            </motion.div>

            {/* AI Project Builder Card */}
            <motion.div variants={itemVariants}>
              {stats.activeProject ? (
                <GlassCard className="p-5 flex flex-col justify-between min-h-[150px] border-[var(--border-glass)] hover:border-[rgba(157,78,221,0.25)] transition-all bg-[var(--surface-bg)] shadow-md">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start select-none">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <h4 className="text-xs font-extrabold text-white truncate uppercase tracking-wider">
                          {stats.activeProject}
                        </h4>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase">PORTFOLIO PIPELINE</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[var(--accent-purple-glow)] border border-[var(--accent-purple)]/20 text-[8px] font-extrabold text-[var(--accent-purple)] uppercase tracking-wider select-none">
                        Compiling
                      </span>
                    </div>

                    {/* Custom Progress Bar */}
                    <div className="flex flex-col gap-1.5 mt-3 select-none">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-[var(--text-secondary)]">PRD Roadmap Completion</span>
                        <span className="text-[var(--accent-purple)]">{stats.projectProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.projectProgress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-[var(--accent-purple)] rounded-full shadow-[0_0_8px_var(--accent-purple)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--border-glass)]/50">
                    <span className="text-[9px] text-[var(--text-muted)] font-mono flex items-center gap-1.5 select-none">
                      <Cpu size={11} /> BUILD_OK
                    </span>
                    <Link
                      href="/projects"
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-extrabold text-white transition-all cursor-pointer select-none border border-white/5"
                    >
                      Open Builder
                    </Link>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-5 flex flex-col justify-between min-h-[150px] border-[var(--border-glass)] hover:border-[rgba(157,78,221,0.25)] transition-all bg-[var(--surface-bg)]">
                  <div className="flex flex-col gap-2 select-none">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">No Active Project</h4>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
                        STANDBY
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      Generate folder directory hierarchies and professional PRD details tailored for engineering recruitment.
                    </p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Link
                      href="/projects"
                      className="px-4 py-1.5 bg-[var(--accent-purple)] text-black hover:opacity-90 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer select-none shadow-[0_4px_12px_rgba(157,78,221,0.15)]"
                    >
                      Build Portfolio
                    </Link>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          </div>
        </div>

        {/* 3. CONTINUE READING (Grounded Document Archives) */}
        <div className="flex flex-col gap-3">
          <h3 className="px-1 text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] select-none">
            Recent Ingested Archives
          </h3>
          
          {notes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {notes.map((note) => (
                <motion.div key={note.id} variants={itemVariants}>
                  <GlassCard className="p-4 flex flex-col justify-between min-h-[125px] border-[var(--border-glass)] bg-[var(--surface-bg)] hover:bg-white/[0.01] transition-all">
                    <div className="flex flex-col gap-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate" title={note.title}>
                        {note.title}
                      </h4>
                      <span className="text-[8.5px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                        {note.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border-glass)]/30">
                      <span className="text-[8.5px] text-[var(--text-muted)] font-mono select-none">
                        {note.date}
                      </span>
                      <Link
                        href="/notes"
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--accent-blue)] border border-white/5 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
                      >
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <GlassCard className="p-5 border border-dashed border-[var(--border-glass-active)] bg-black/10 flex flex-col items-center justify-center text-center py-9 rounded-2xl select-none">
              <Brain className="text-[var(--text-muted)] opacity-25 mb-2" size={24} />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Your Library is Empty</h4>
              <p className="text-[10px] text-[var(--text-secondary)] max-w-sm leading-relaxed mb-4">
                Upload notes or syllabus files in the Academic Brain page to construct dynamic study materials.
              </p>
              <Link
                href="/brain"
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none"
              >
                Upload Course Notes
              </Link>
            </GlassCard>
          )}
        </div>

        {/* 4. RECRUITMENT BOT ADVERTISEMENT STRIP */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-4 border-[var(--border-glass)] bg-[var(--surface-bg)] flex flex-col sm:flex-row justify-between items-center gap-4 rounded-2xl w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center text-black font-extrabold text-[10px] shadow-[0_0_12px_rgba(0,210,255,0.15)] relative">
                <Sparkles size={14} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div className="flex flex-col text-center sm:text-left select-none">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                  AI Placement Simulator
                </span>
                <span className="text-[9.5px] text-[var(--text-secondary)] mt-0.5">
                  Simulate technical DSA compiler evaluations or behavioral HR recruiters.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 select-none">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-400 uppercase tracking-widest">
                SIM_ONLINE
              </span>
              <Link
                href="/placement"
                className="px-4 py-2 bg-[var(--accent-blue)] text-black hover:opacity-90 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer select-none shadow-[0_4px_12px_rgba(0,210,255,0.15)]"
              >
                Start Simulator
              </Link>
            </div>
          </div>
        </motion.div>

      </div>

      {/* RIGHT SIDEBAR PANEL: THE DIGITAL TWIN HUD (col-span-1) */}
      <div className="xl:col-span-1 flex flex-col gap-6">

        {/* LIVING DIGITAL TWIN HOLOGRAM WIDGET */}
        <motion.div variants={itemVariants}>
          {twinStatus.offline ? (
            <GlassCard className="p-5 flex flex-col gap-4 border-[var(--border-glass)] bg-[var(--surface-bg)] relative overflow-hidden group select-none">
              <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2.5">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
                  <Brain size={14} className="text-rose-400" />
                  Academic Digital Twin
                </h3>
                <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                  OFFLINE
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center py-6">
                <Activity size={24} className="text-rose-500/20 mb-2 animate-pulse" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Twin Standby</h4>
                <p className="text-[10px] text-[var(--text-secondary)] max-w-[200px] leading-relaxed mb-4">
                  Ingest notes, configure planners, or score DSA checkpoints to compile twin telemetry.
                </p>
              </div>

              <Link
                href="/brain"
                className="w-full h-9 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-white transition-all flex items-center justify-center gap-1.5 border border-white/5 cursor-pointer"
              >
                <span>Upload Materials</span>
                <ArrowRight size={12} />
              </Link>
            </GlassCard>
          ) : (
            <GlassCard className="p-5 flex flex-col gap-4 border-[var(--border-glass)] bg-[var(--surface-bg)] relative overflow-hidden group">
              <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2.5 select-none">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
                  <Brain size={14} className="text-[var(--accent-blue)] animate-pulse" />
                  Academic Digital Twin
                </h3>
                <span className="text-[8px] bg-[var(--accent-blue-glow)] text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 px-2 py-0.5 rounded font-mono font-bold tracking-wider animate-pulse">
                  TELEMETRY
                </span>
              </div>

              {/* LIVING HOLOGRAM CORE ORB */}
              <div className="flex items-center gap-5 py-2 select-none">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  {/* Rotating breathing outer gradient orbits */}
                  <span className="absolute inset-0 rounded-full border border-[var(--accent-blue)]/25 animate-ping opacity-25" />
                  <span className="absolute inset-1 rounded-full border border-dashed border-[var(--accent-purple)]/40 animate-spin duration-7000" />
                  
                  {/* Floating core sphere */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center shadow-[0_0_20px_var(--accent-blue-glow)] border border-white/10 relative">
                    <Activity size={14} className="text-white animate-pulse" />
                  </div>
                </div>

                {/* Micro HUD Telemetry Readout */}
                <div className="grid grid-cols-3 gap-2 flex-1 text-center font-mono select-none">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">RETENTION</span>
                    <span className="text-xs font-bold text-white mt-1">{simRetention}%</span>
                  </div>
                  <div className="flex flex-col border-l border-[var(--border-glass)]">
                    <span className="text-[7px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">BATTERY</span>
                    <span className="text-xs font-bold text-white mt-1">{simStamina}%</span>
                  </div>
                  <div className="flex flex-col border-l border-[var(--border-glass)]">
                    <span className="text-[7px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">RECALL</span>
                    <span className="text-xs font-bold text-white mt-1">{simLatency}ms</span>
                  </div>
                </div>
              </div>

              {/* Interactive Twin Cognitive Monologue */}
              <div className="bg-black/40 border border-[var(--border-glass)] rounded-xl p-3 text-[10px] text-[var(--text-secondary)] leading-relaxed italic relative font-medium select-text">
                &ldquo;{twinStatus.monologue.length > 130 ? twinStatus.monologue.slice(0, 130) + '...' : twinStatus.monologue}&rdquo;
              </div>

              {/* Cognitive Sandbox Controls */}
              <div className="bg-black/15 p-3 rounded-xl border border-[var(--border-glass)] space-y-2 select-none">
                <span className="text-[7.5px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                  <Sliders size={9} /> Cognitive Sandbox Controls
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={triggerStudySession}
                    disabled={simStamina <= 15}
                    className="py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/15 disabled:bg-white/5 border border-emerald-500/15 disabled:border-transparent text-emerald-400 disabled:text-white/20 text-[8px] font-extrabold transition-colors cursor-pointer"
                  >
                    Study Loop
                  </button>
                  <button
                    onClick={triggerRestCycle}
                    className="py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/15 text-indigo-400 text-[8px] font-extrabold transition-colors cursor-pointer"
                  >
                    Sleep/Rest
                  </button>
                  <button
                    onClick={triggerTimeSkip}
                    className="py-1 rounded bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/15 text-rose-400 text-[8px] font-extrabold transition-colors cursor-pointer"
                  >
                    24h Decay
                  </button>
                </div>
              </div>

              <Link
                href="/memory"
                className="w-full h-8.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-white transition-all flex items-center justify-center gap-1 border border-white/5 cursor-pointer"
              >
                <span>Access Cognitive Core</span>
                <ArrowRight size={11} />
              </Link>
            </GlassCard>
          )}
        </motion.div>
        
        {/* A. WEEKLY GOALS & PROGRESS INDICATOR */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 flex flex-col gap-4 border-[var(--border-glass)] bg-[var(--surface-bg)] select-none">
            <div className="border-b border-[var(--border-glass)] pb-2.5">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                Daily Study Progress
              </h3>
            </div>

            {stats.studyHoursAchieved > 0 ? (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-32 h-32 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="50" className="stroke-white/5 fill-transparent" strokeWidth="8" />
                    <circle
                      cx="64"
                      cy="64"
                      r="50"
                      className="fill-transparent stroke-[var(--accent-blue)]"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={(2 * Math.PI * 50) * (1 - Math.min(1.0, stats.studyHoursAchieved / stats.studyHoursTarget))}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-white leading-none font-mono">
                      {stats.studyHoursAchieved}h
                    </span>
                    <span className="text-[7.5px] text-[var(--text-muted)] uppercase tracking-widest mt-1">LOGGED TODAY</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-5 text-[9px] font-bold text-[var(--text-secondary)] mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span>Target ({stats.studyHoursTarget}h)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)]" />
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-5">
                <Clock className="text-[var(--accent-blue)]/20 mb-2 animate-pulse" size={24} />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Target Pending</h4>
                <p className="text-[10px] text-[var(--text-secondary)] max-w-[190px] leading-relaxed mb-3">
                  Log active study sessions in the Analytics tab to compile targets.
                </p>
                <Link
                  href="/analytics"
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                >
                  Log Study Session
                </Link>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* B. SAAS CONFIG CHECKLIST (YOUR TO-DO LIST) */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 flex flex-col gap-4 border-[var(--border-glass)] bg-[var(--surface-bg)]">
            <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2.5 select-none">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                Task Checklist Queue
              </h3>
              {todos.length > 0 && (
                <span className="text-[9px] text-[var(--accent-blue)] font-bold font-mono">
                  {todos.filter(t => !t.done).length} PENDING
                </span>
              )}
            </div>

            {todos.length > 0 ? (
              <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-0.5 custom-scrollbar">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={() => toggleTodo(todo)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.01] border transition-all cursor-pointer select-none",
                      todo.done ? "border-transparent opacity-40" : "border-[var(--border-glass)] bg-black/10"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-1">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${todo.color}15`, border: `1px solid ${todo.color}25` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: todo.color }} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className={cn(
                          "text-xs font-bold text-white truncate",
                          todo.done && "line-through text-[var(--text-muted)]"
                        )}>
                          {todo.title}
                        </span>
                        <span className="text-[8px] text-[var(--text-muted)] mt-0.5 font-mono">
                          {todo.time}
                        </span>
                      </div>
                    </div>

                    <button className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 cursor-pointer shrink-0">
                      {todo.done ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <Circle size={14} className="text-white/25 hover:text-white/40" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 select-none">
                <CheckCircle2 className="text-emerald-400/20 mb-2 animate-pulse" size={24} />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Queue Completed</h4>
                <p className="text-[10px] text-[var(--text-secondary)] max-w-[190px] leading-relaxed">
                  No active planner tasks. Generate custom pipelines in the Planner or Revision tabs.
                </p>
              </div>
            )}

            <Link
              href="/planner"
              className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 border border-dashed border-[var(--border-glass-active)] hover:border-[var(--accent-blue)] rounded-xl text-xs text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer select-none"
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

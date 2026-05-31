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
  Plus,
  Brain,
  Activity
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
  const [todos, setTodos] = useState<Array<{
    id: string;
    title: string;
    time: string;
    done: boolean;
    color: string;
    category: string;
    originalType: 'study' | 'revision';
    planId: string;
    week?: number;
    idx?: number;
    itemId?: string;
  }>>([])

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
                      color: '#F59E0B',
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
                    color: '#00D2FF',
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
          {stats.streak > 0 && (
            <div className="flex gap-2 mt-3 sm:mt-0">
              <div className="glass-card px-3.5 py-1.5 flex items-center gap-2 border-[var(--border-glass)]">
                <Flame className="text-amber-500 fill-amber-500 animate-pulse" size={14} />
                <span className="text-[11px] font-bold text-[var(--text-primary)]">{stats.streak} Day Streak</span>
              </div>
            </div>
          )}
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
              {stats.activePlanner ? (
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
                      <Clock size={11} /> Progress active
                    </span>
                    <Link
                      href="/planner"
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-[var(--text-primary)] transition-all cursor-pointer select-none"
                    >
                      Continue
                    </Link>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-4 flex flex-col justify-between min-h-[140px] hover:border-amber-400/30 transition-all border-white/5 bg-[#171821]/45">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">No Active Study Plan</h4>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-semibold text-amber-400 uppercase tracking-wider">
                        Inactive
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Map your coursework milestones and exam dates. Let AI build a custom daily revision tracker.
                    </p>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Link
                      href="/planner"
                      className="px-3.5 py-1.5 bg-amber-500 text-black hover:bg-amber-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none"
                    >
                      Create Plan
                    </Link>
                  </div>
                </GlassCard>
              )}
            </motion.div>

            {/* Card 2: AI Project Builder */}
            <motion.div variants={itemVariants}>
              {stats.activeProject ? (
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
                      Project tracker active
                    </span>
                    <Link
                      href="/projects"
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-[var(--text-primary)] transition-all cursor-pointer select-none"
                    >
                      Continue
                    </Link>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-4 flex flex-col justify-between min-h-[140px] hover:border-emerald-400/30 transition-all border-white/5 bg-[#171821]/45">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">No Portfolio Projects</h4>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Inactive
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Structure real-world coding portfolios and outlines. Generate custom project roadmaps now.
                    </p>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Link
                      href="/projects"
                      className="px-3.5 py-1.5 bg-emerald-500 text-black hover:bg-emerald-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none"
                    >
                      Build Portfolio
                    </Link>
                  </div>
                </GlassCard>
              )}
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
          
          {notes.length > 0 ? (
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

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className="text-[9px] text-[var(--text-muted)] font-medium">
                        Uploaded {note.date}
                      </span>
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
          ) : (
            <GlassCard className="p-5 border border-dashed border-white/15 bg-black/10 flex flex-col items-center justify-center text-center py-8 rounded-2xl">
              <Brain className="text-[var(--text-muted)] opacity-30 mb-2" size={24} />
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">Your Library is Empty</h4>
              <p className="text-[10px] text-[var(--text-muted)] max-w-sm leading-relaxed mb-3">
                Upload notes or syllabus files in the Brain view to populate your notes library.
              </p>
              <Link
                href="/brain"
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none"
              >
                Upload Course Notes
              </Link>
            </GlassCard>
          )}
        </div>

        {/* 4. COUNSELING SCHEDULE / PLACEMENT STRIP (Wide Strip at Bottom) */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-3.5 border-white/5 bg-[#12131A]/60 hover:bg-[#12131A]/80 transition-colors flex flex-col sm:flex-row justify-between items-center gap-3.5 rounded-2xl w-full">
            <div className="flex items-center gap-3">
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
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
                Interactive Practice
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

        {/* AI DIGITAL TWIN TELEMETRY WIDGET */}
        <motion.div variants={itemVariants}>
          {twinStatus.offline ? (
            <GlassCard className="p-5 flex flex-col gap-4 border-white/5 bg-[#12131A]/60 relative overflow-hidden group">
              <span className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-rose-500/5 blur-xl group-hover:scale-125 transition-all" />
              
              <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 select-none">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-1.5">
                  <Brain size={14} className="text-rose-400" />
                  AI Student Twin
                </h3>
                <span className="text-[7.5px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                  OFFLINE
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center py-4 select-none">
                <Activity size={20} className="text-rose-500/30 mb-2 animate-pulse" />
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">Academic Twin Offline</h4>
                <p className="text-[10px] text-[var(--text-muted)] max-w-[200px] leading-relaxed">
                  Ingest notes, run a revision planner, or complete mock prep quizzes to initialize cognitive telemetry.
                </p>
              </div>

              <Link
                href="/brain"
                className="w-full h-8 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <span>Upload Materials</span>
                <ArrowRight size={10} />
              </Link>
            </GlassCard>
          ) : (
            <GlassCard className="p-5 flex flex-col gap-4 border-white/5 bg-[#12131A]/60 relative overflow-hidden group">
              <span className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-cyan-500/10 blur-xl group-hover:scale-125 transition-all" />
              
              <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 select-none">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-1.5">
                  <Brain size={14} className="text-cyan-400 animate-pulse" />
                  AI Student Twin
                </h3>
                <span className="text-[7.5px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                  TELEMETRY
                </span>
              </div>

              <div className="flex items-center gap-4 py-1.5 select-none">
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-cyan-500/5 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <Activity size={16} className="text-cyan-400 animate-pulse" />
                  <span className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30 animate-spin duration-10000" />
                </div>

                <div className="grid grid-cols-3 gap-3 flex-1 text-center">
                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">RETENTION</span>
                    <span className="text-xs font-bold text-white mt-0.5">{twinStatus.telemetry.forgettingIndex}%</span>
                  </div>
                  <div className="flex flex-col border-l border-white/5">
                    <span className="text-[7.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">BATTERY</span>
                    <span className="text-xs font-bold text-white mt-0.5">{twinStatus.telemetry.focusBattery}%</span>
                  </div>
                  <div className="flex flex-col border-l border-white/5">
                    <span className="text-[7.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">RECALL</span>
                    <span className="text-xs font-bold text-white mt-0.5">{twinStatus.telemetry.latencyMs}ms</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/25 border border-white/5 rounded-xl p-3 text-[10px] text-[var(--text-secondary)] leading-relaxed italic relative">
                &ldquo;{twinStatus.monologue.length > 130 ? twinStatus.monologue.slice(0, 130) + '...' : twinStatus.monologue}&rdquo;
              </div>

              <Link
                href="/memory"
                className="w-full h-8 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <span>Access Cognitive Core</span>
                <ArrowRight size={10} />
              </Link>
            </GlassCard>
          )}
        </motion.div>
        
        {/* A. WEEKLY ACTIVITIES: Donut Chart & Legend */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
            <div className="border-b border-[var(--border-glass)] pb-2 select-none">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Weekly Activities
              </h3>
            </div>

            {stats.studyHoursAchieved > 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-36 h-36 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="56" className="stroke-white/5 fill-transparent" strokeWidth="12" />
                    <circle
                      cx="72"
                      cy="72"
                      r="56"
                      className="fill-transparent stroke-[var(--accent-blue)]"
                      strokeWidth="12"
                      strokeDasharray={2 * Math.PI * 56}
                      strokeDashoffset={(2 * Math.PI * 56) * (1 - Math.min(1.0, stats.studyHoursAchieved / stats.studyHoursTarget))}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">
                      {stats.studyHoursAchieved}
                    </span>
                    <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mt-1">HOURS TODAY</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 text-[10px] font-semibold text-[var(--text-secondary)] select-none mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-white/20" />
                    <span>Target ({stats.studyHoursTarget}h)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-[var(--accent-blue)]" />
                    <span>Logged ({stats.studyHoursAchieved}h)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 select-none">
                <Clock className="text-cyan-500/30 mb-2 animate-pulse" size={24} />
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">No Study Hours Today</h4>
                <p className="text-[10px] text-[var(--text-muted)] max-w-[200px] leading-relaxed mb-3">
                  Log a study session with the stopwatch on the Analytics tab to visualize your goals.
                </p>
                <Link
                  href="/analytics"
                  className="px-3 py-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-[9px] font-bold transition-all cursor-pointer select-none"
                >
                  Log Study Session
                </Link>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* B. YOUR TO-DO LIST */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
            <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 select-none">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Your To-Do List
              </h3>
              {todos.length > 0 && (
                <span className="text-[10px] text-[var(--accent-blue)] font-bold">
                  {todos.filter(t => !t.done).length} Pending
                </span>
              )}
            </div>

            {todos.length > 0 ? (
              <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={() => toggleTodo(todo)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.02] border transition-colors cursor-pointer select-none",
                      todo.done ? "border-transparent opacity-45" : "border-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-1">
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
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 select-none">
                <CheckCircle2 className="text-emerald-500/20 mb-2" size={24} />
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">All Caught Up!</h4>
                <p className="text-[10px] text-[var(--text-muted)] max-w-[180px] leading-relaxed">
                  No active revision or study plan tasks found. Generate one in the Planner or Revision tabs to populate your daily schedule.
                </p>
              </div>
            )}

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

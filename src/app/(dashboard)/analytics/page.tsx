'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Sparkles,
  Loader2,
  Plus,
  Play,
  Pause,
  Award,
  Target,
  Clock,
  Trash2
} from 'lucide-react'

// Interfaces
interface Goal {
  id: string
  title: string
  category: 'study_hours' | 'topic_coverage' | 'knowledge_growth' | 'quiz_performance' | 'revision_progress'
  target_value: number
  current_value: number
  deadline_date: string
  completed: boolean
}

interface AdvisoryItem {
  title: string
  priority: 'high' | 'medium' | 'low'
  actionTip: string
}

interface SessionLog {
  id: string
  subject: string
  duration_minutes: number
  focus_rating: number
  study_date: string
}

interface AnalyticsData {
  metrics: {
    studyHours: number
    topicCoverage: number
    knowledgeGrowth: number
    quizPerformance: number
    revisionProgress: number
    semesterReadiness: number
  }
  weeklyStudyHours: Record<string, number>
  heatmapData: Record<string, number>
  advisory: AdvisoryItem[]
}

export default function AnalyticsDashboardPage() {
  const [isPending, startTransition] = useTransition()

  // State Management
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData>({
    metrics: {
      studyHours: 0,
      topicCoverage: 0,
      knowledgeGrowth: 0,
      quizPerformance: 0,
      revisionProgress: 0,
      semesterReadiness: 0
    },
    weeklyStudyHours: {},
    heatmapData: {},
    advisory: []
  })
  
  const [goals, setGoals] = useState<Goal[]>([])
  const [recentSessions, setRecentSessions] = useState<SessionLog[]>([])

  // Goal Creation State
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalCategory, setNewGoalCategory] = useState<Goal['category']>('study_hours')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [newGoalDeadline, setNewGoalDeadline] = useState('')

  // Stopwatch Timer State
  const [stopwatchTime, setStopwatchTime] = useState(0) // in seconds
  const [stopwatchActive, setStopwatchActive] = useState(false)
  const [logSubject, setLogSubject] = useState('')
  const [logFocus, setLogFocus] = useState(4) // Default rating 4/5
  const [showLogForm, setShowLogForm] = useState(false)

  // 1. Fetch data on mount
  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/analytics/summary')
      const summary = await res.json()
      if (summary && !summary.error) {
        setData(summary)
      }

      // Fetch goals
      const goalsRes = await fetch('/api/analytics/goals')
      const goalsList = await goalsRes.json()
      if (Array.isArray(goalsList)) {
        setGoals(goalsList)
      } else {
        // Fallback to local storage
        const stored = localStorage.getItem('campusos_local_goals')
        if (stored) setGoals(JSON.parse(stored))
      }

      // Fetch sessions
      const sessionsRes = await fetch('/api/analytics/sessions')
      const sessionsList = await sessionsRes.json()
      if (Array.isArray(sessionsList)) {
        setRecentSessions(sessionsList)
      } else {
        // Fallback to local storage
        const stored = localStorage.getItem('campusos_local_sessions')
        if (stored) setRecentSessions(JSON.parse(stored))
      }

    } catch (err) {
      console.error('Failed to load analytics dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // 2. Stopwatch counter effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (stopwatchActive) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + 1)
      }, 1000)
    } else {
      if (interval) clearInterval(interval)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [stopwatchActive])

  // 3. Goal action triggers
  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !newGoalTarget || !newGoalDeadline) {
      alert('Please fill out all goal parameters.')
      return
    }

    const newTarget = parseFloat(newGoalTarget)
    if (isNaN(newTarget) || newTarget <= 0) {
      alert('Target value must be a positive number.')
      return
    }

    const payload = {
      title: newGoalTitle,
      category: newGoalCategory,
      targetValue: newTarget,
      deadlineDate: newGoalDeadline
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/analytics/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const result = await res.json()

        if (result.error || result.isFallback) {
          // Database tables not migrated yet, fallback to Local Storage
          const fallbackGoal: Goal = {
            id: `local-goal-${Date.now()}`,
            title: newGoalTitle,
            category: newGoalCategory,
            target_value: newTarget,
            current_value: 0,
            deadline_date: newGoalDeadline,
            completed: false
          }
          const updated = [fallbackGoal, ...goals]
          setGoals(updated)
          localStorage.setItem('campusos_local_goals', JSON.stringify(updated))
        } else {
          setGoals(prev => [result, ...prev])
        }

        // Reset
        setNewGoalTitle('')
        setNewGoalTarget('')
        setNewGoalDeadline('')
        setShowAddGoal(false)
      } catch (err) {
        console.error(err)
      }
    })
  }

  const handleIncrementGoal = async (id: string, current: number, target: number) => {
    const updatedVal = Math.min(current + 1, target)
    const completed = updatedVal >= target

    startTransition(async () => {
      try {
        if (id.startsWith('local-goal-')) {
          const updated = goals.map(g => {
            if (g.id === id) {
              return { ...g, current_value: updatedVal, completed }
            }
            return g
          })
          setGoals(updated)
          localStorage.setItem('campusos_local_goals', JSON.stringify(updated))
          return
        }

        const res = await fetch('/api/analytics/goals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, currentValue: updatedVal, completed })
        })
        const result = await res.json()
        if (result && !result.error) {
          setGoals(prev => prev.map(g => g.id === id ? result : g))
        }
      } catch (err) {
        console.error(err)
      }
    })
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    startTransition(async () => {
      try {
        if (id.startsWith('local-goal-')) {
          const updated = goals.filter(g => g.id !== id)
          setGoals(updated)
          localStorage.setItem('campusos_local_goals', JSON.stringify(updated))
          return
        }

        await fetch('/api/analytics/goals', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        setGoals(prev => prev.filter(g => g.id !== id))
      } catch (err) {
        console.error(err)
      }
    })
  }

  // 4. Session action triggers
  const handleLogStudySession = async () => {
    if (!logSubject.trim()) {
      alert('Please enter a subject name.')
      return
    }

    const durationMinutes = Math.max(1, Math.round(stopwatchTime / 60))
    const payload = {
      subject: logSubject,
      durationMinutes,
      focusRating: logFocus,
      studyDate: new Date().toISOString().split('T')[0]
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/analytics/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const result = await res.json()

        if (result.error || result.isFallback) {
          // Database tables not migrated yet, fallback to Local Storage
          const fallbackSession: SessionLog = {
            id: `local-sess-${Date.now()}`,
            subject: logSubject,
            duration_minutes: durationMinutes,
            focus_rating: logFocus,
            study_date: payload.studyDate
          }
          const updated = [fallbackSession, ...recentSessions]
          setRecentSessions(updated.slice(0, 10))
          localStorage.setItem('campusos_local_sessions', JSON.stringify(updated))
        } else {
          setRecentSessions(prev => [result, ...prev].slice(0, 10))
        }

        // Update local study summary counter optimistically
        setData(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            studyHours: Math.round((prev.metrics.studyHours + (durationMinutes / 60)) * 10) / 10
          }
        }))

        // Reset
        setLogSubject('')
        setStopwatchTime(0)
        setStopwatchActive(false)
        setShowLogForm(false)
        fetchDashboardData() // Refresh database summary averages
      } catch (err) {
        console.error(err)
      }
    })
  }

  // Helper formats seconds to MM:SS or HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':')
  }

  // SVGs charts coordinates generators
  const getVelocityChartPath = () => {
    const keys = Object.keys(data.weeklyStudyHours)
    if (keys.length === 0) return { line: '', area: '' }

    const points = keys.map((key, idx) => {
      const hours = data.weeklyStudyHours[key] || 0
      const x = 40 + idx * 50 // step width
      const y = 140 - Math.min(100, hours * 10) // scale height (max 10 hours)
      return { x, y }
    })

    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = `${linePath} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`
    return { line: linePath, area: areaPath }
  }

  const { line: velocityLine, area: velocityArea } = getVelocityChartPath()

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 select-text">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <TrendingUp size={18} />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Academic Analytics
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Analyze your learning habits, track study goals, log focus hours, and review customized AI recommendations.
          </p>
        </div>

        {/* Stopwatch widget in header */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
          <Clock size={14} className={stopwatchActive ? "text-cyan-400 animate-spin" : "text-[var(--text-muted)]"} />
          <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-primary)]">
            {formatTime(stopwatchTime)}
          </span>
          {stopwatchActive ? (
            <button 
              onClick={() => setStopwatchActive(false)}
              className="p-1 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Pause size={12} />
            </button>
          ) : (
            <button 
              onClick={() => {
                setStopwatchActive(true)
                setShowLogForm(false)
              }}
              className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Play size={12} />
            </button>
          )}
          {stopwatchTime > 0 && !stopwatchActive && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 ml-1">
              <button 
                onClick={() => setShowLogForm(true)}
                className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase cursor-pointer"
              >
                Log
              </button>
              <button 
                onClick={() => {
                  setStopwatchTime(0)
                  setStopwatchActive(false)
                  setShowLogForm(false)
                }}
                className="text-[9px] font-bold text-rose-400 hover:text-rose-300 uppercase cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* stopwatch logging drawer modal */}
      {showLogForm && (
        <GlassCard className="p-4 border-cyan-500/30 max-w-md mx-auto space-y-3">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock size={12} className="text-cyan-400" />
              Log Study Session ({Math.round(stopwatchTime / 60)} mins)
            </h3>
            <button onClick={() => setShowLogForm(false)} className="text-[10px] text-[var(--text-muted)] hover:text-white uppercase font-bold">Cancel</button>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Subject / Course</label>
            <input 
              type="text" 
              placeholder="e.g. Data Structures and Algorithms" 
              value={logSubject}
              onChange={(e) => setLogSubject(e.target.value)}
              className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-cyan-500 text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Focus Rating: {logFocus}/5</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setLogFocus(star)}
                  className={`text-lg transition-colors ${
                    star <= logFocus ? 'text-amber-400' : 'text-white/10'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <Button 
            onClick={handleLogStudySession}
            disabled={isPending}
            className="w-full h-8 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md border-0"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : "Save Session"}
          </Button>
        </GlassCard>
      )}

      {loading ? (
        <div className="py-20 flex flex-col gap-3 justify-center items-center select-none">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
          <span className="text-xs text-[var(--text-muted)] font-semibold">Analyzing Academic Portfolios...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Section 1: Command Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            
            {/* Metric 1: Semester Readiness */}
            <GlassCard className="p-4 border-white/5 bg-[#12131A]/60 flex flex-col items-center justify-between text-center col-span-2 select-none relative overflow-hidden group">
              <span className="absolute top-0 right-0 p-2.5 text-white/5 group-hover:text-white/10 transition-colors">
                <Award size={36} />
              </span>
              <div className="space-y-1">
                <h3 className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Semester Readiness</h3>
                <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest leading-none">Diagnostic index</span>
              </div>

              {/* Radial Progress Ring */}
              <div className="relative w-24 h-24 flex items-center justify-center my-3">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.04)" strokeWidth="6" fill="transparent" />
                  <circle cx="48" cy="48" r="38" stroke="url(#cyanPurpleGradient)" strokeWidth="7" fill="transparent"
                    strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - data.metrics.semesterReadiness / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="cyanPurpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="flex flex-col items-center justify-center font-heading">
                  <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                    {data.metrics.semesterReadiness}%
                  </span>
                  <span className="text-[7.5px] uppercase font-bold text-[var(--text-muted)]">
                    {data.metrics.semesterReadiness > 0 ? 'Ready' : 'Offline'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Metric 2: Study Hours */}
            <GlassCard className="p-4 border-white/5 bg-[#12131A]/60 flex flex-col justify-between select-none">
              <div>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-cyan-400">Study hours</span>
                <h4 className="text-2xl font-black text-[var(--text-primary)] mt-1">{data.metrics.studyHours}h</h4>
              </div>
              <p className="text-[9px] text-[var(--text-muted)] mt-4 leading-relaxed font-semibold">Total logged focus time.</p>
            </GlassCard>

            {/* Metric 3: Topic Coverage */}
            <GlassCard className="p-4 border-white/5 bg-[#12131A]/60 flex flex-col justify-between select-none">
              <div>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-indigo-400">Topic Coverage</span>
                <h4 className="text-2xl font-black text-[var(--text-primary)] mt-1">{data.metrics.topicCoverage}%</h4>
              </div>
              {/* mini visual indicator */}
              <div className="relative w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div className="absolute h-full bg-indigo-500 rounded-full" style={{ width: `${data.metrics.topicCoverage}%` }} />
              </div>
            </GlassCard>

            {/* Metric 4: Knowledge Growth */}
            <GlassCard className="p-4 border-white/5 bg-[#12131A]/60 flex flex-col justify-between select-none">
              <div>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-400">Knowledge nodes</span>
                <h4 className="text-2xl font-black text-[var(--text-primary)] mt-1">{data.metrics.knowledgeGrowth}</h4>
              </div>
              <p className="text-[9px] text-[var(--text-muted)] mt-4 leading-relaxed font-semibold">Vectorized concept maps.</p>
            </GlassCard>

            {/* Metric 5: Quiz Performance */}
            <GlassCard className="p-4 border-white/5 bg-[#12131A]/60 flex flex-col justify-between select-none">
              <div>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-amber-400">Quiz performance</span>
                <h4 className="text-2xl font-black text-[var(--text-primary)] mt-1">{data.metrics.quizPerformance}%</h4>
              </div>
              <p className="text-[9px] text-[var(--text-muted)] mt-4 leading-relaxed font-semibold">Average quiz grades.</p>
            </GlassCard>

          </div>

          {/* Section 2: Visual Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Heatmap Widget (lg:col-span-8) */}
            <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 lg:col-span-8 space-y-4">
              <div className="flex justify-between items-center select-none border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Learning Activity Heatmap
                </h3>
                <span className="text-[8px] text-[var(--text-muted)] italic font-normal tracking-wider lowercase">
                  Study session frequency & intensity
                </span>
              </div>

              {/* Responsive SVG Grid for GitHub-style Heatmap */}
              <div className="flex flex-col gap-2 overflow-x-auto scrollbar-none py-1">
                <div className="flex gap-4">
                  
                  {/* Heatmap Row Labels */}
                  <div className="flex flex-col justify-between text-[7px] text-[var(--text-muted)] font-bold py-1 select-none pr-1 uppercase">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                  </div>

                  {/* Heatmap Matrix SVG */}
                  <svg className="w-full min-w-[500px] h-[90px]" viewBox="0 0 520 90">
                    <g>
                      {/* Grid loops 52 weeks x 7 days */}
                      {Array.from({ length: 52 }).map((_, wIdx) => {
                        return (
                          <g key={wIdx} transform={`translate(${wIdx * 10}, 0)`}>
                            {Array.from({ length: 7 }).map((_, dIdx) => {
                              // Compute date index counting backward from today
                              const cellDate = new Date()
                              const diffDays = (51 - wIdx) * 7 + (6 - dIdx)
                              cellDate.setDate(cellDate.getDate() - diffDays)
                              const cellStr = cellDate.toISOString().split('T')[0]
                              
                              const minutes = data.heatmapData[cellStr] || 0
                              
                              // opacity color steps matching study intensity
                              let color = "rgba(255, 255, 255, 0.03)" // 0 mins
                              if (minutes > 0 && minutes <= 30) color = "rgba(6, 182, 212, 0.15)"
                              else if (minutes > 30 && minutes <= 90) color = "rgba(6, 182, 212, 0.4)"
                              else if (minutes > 90 && minutes <= 180) color = "rgba(6, 182, 212, 0.7)"
                              else if (minutes > 180) color = "rgba(6, 182, 212, 1.0)"

                              return (
                                <rect
                                  key={dIdx}
                                  y={dIdx * 11}
                                  width="9"
                                  height="9"
                                  rx="2"
                                  fill={color}
                                  className="transition-all hover:scale-110 cursor-pointer"
                                >
                                  <title>{`${cellStr} • ${minutes} mins study`}</title>
                                </rect>
                              )
                            })}
                          </g>
                        )
                      })}
                    </g>
                  </svg>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center gap-1.5 text-[8px] text-[var(--text-muted)] font-bold tracking-widest uppercase self-end mr-6 select-none mt-1">
                  <span>Less</span>
                  <div className="w-2 h-2 rounded-sm bg-white/5" />
                  <div className="w-2 h-2 rounded-sm bg-[rgba(6,182,212,0.15)]" />
                  <div className="w-2 h-2 rounded-sm bg-[rgba(6,182,212,0.4)]" />
                  <div className="w-2 h-2 rounded-sm bg-[rgba(6,182,212,0.7)]" />
                  <div className="w-2 h-2 rounded-sm bg-[rgba(6,182,212,1)]" />
                  <span>More</span>
                </div>
              </div>
            </GlassCard>

            {/* Velocity Area Chart (lg:col-span-4) */}
            <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 lg:col-span-4 space-y-4">
              <div className="flex justify-between items-center select-none border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Weekly Study Hours
                </h3>
                <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest">
                  Study velocity
                </span>
              </div>

              {/* Area SVG Chart */}
              <div className="w-full flex justify-center py-1">
                {Object.values(data.weeklyStudyHours).reduce((acc, curr) => acc + curr, 0) > 0 ? (
                  <svg className="w-full max-w-[320px] h-[150px]" viewBox="0 0 340 150">
                    {/* Grid background lines */}
                    <line x1="40" y1="40" x2="340" y2="40" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                    <line x1="40" y1="90" x2="340" y2="90" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                    <line x1="40" y1="140" x2="340" y2="140" stroke="rgba(255,255,255,0.05)" />

                    <defs>
                      <linearGradient id="glowAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(6, 182, 212, 0.22)" />
                        <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                      </linearGradient>
                    </defs>

                    {/* Area fill */}
                    {velocityArea && <path d={velocityArea} fill="url(#glowAreaGradient)" />}
                    {/* Line path */}
                    {velocityLine && <path d={velocityLine} fill="none" stroke="rgba(6, 182, 212, 0.85)" strokeWidth="2.5" strokeLinecap="round" />}

                    {/* Data points dots */}
                    {Object.keys(data.weeklyStudyHours).map((key, idx) => {
                      const hours = data.weeklyStudyHours[key] || 0
                      const x = 40 + idx * 50
                      const y = 140 - Math.min(100, hours * 10)
                      return (
                        <g key={idx} className="group cursor-pointer">
                          <circle cx={x} cy={y} r="3" fill="#06b6d4" className="transition-transform group-hover:scale-125" />
                          <title>{`${key}: ${hours}h`}</title>
                        </g>
                      )
                    })}

                    {/* Horizontal Labels */}
                    {Object.keys(data.weeklyStudyHours).map((key, idx) => {
                      const x = 40 + idx * 50
                      return (
                        <text key={idx} x={x} y="148" textAnchor="middle" fill="#6b7280" className="text-[7.5px] font-bold font-mono">
                          {key}
                        </text>
                      )
                    })}
                  </svg>
                ) : (
                  <div className="w-full h-[150px] flex flex-col items-center justify-center text-center select-none">
                    <Clock className="text-cyan-500/20 mb-2" size={24} />
                    <p className="text-[10px] text-[var(--text-muted)] max-w-[200px] leading-relaxed">
                      No study history this week. Log focus sessions using the stopwatch timer above to construct your velocity curves.
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>

          </div>

          {/* Section 3: AI recommendations */}
          <GlassCard className="p-5 border-white/5 bg-gradient-to-r from-[rgba(157,78,221,0.02)] to-[rgba(6,182,212,0.02)] border border-[var(--border-glass)]/60 space-y-4 select-text">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 flex items-center gap-1.5 select-none">
              <Sparkles size={12} className="text-cyan-400" />
              AI Study Analyst Advisories
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.advisory && data.advisory.length > 0 ? (
                data.advisory.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-black/20 border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between select-none">
                      <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase tracking-widest border ${
                        item.priority === 'high' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                          : item.priority === 'medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {item.priority} priority
                      </span>
                    </div>
                    <h4 className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">{item.title}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{item.actionTip}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none col-span-3">No learning advisory generated.</p>
              )}
            </div>
          </GlassCard>

          {/* Section 4: Target Goals List */}
          <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
            <div className="flex justify-between items-center select-none border-b border-white/5 pb-2">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Target size={12} className="text-indigo-400" />
                Target Academic Goals
              </h3>
              <button 
                onClick={() => setShowAddGoal(!showAddGoal)}
                className="text-[9px] font-extrabold uppercase bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded-lg text-cyan-400 transition-colors flex items-center gap-1"
              >
                <Plus size={10} />
                Add Goal
              </button>
            </div>

            {/* Create Goal Form Drawer */}
            {showAddGoal && (
              <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3.5 max-w-lg mx-auto">
                <h4 className="text-[10px] font-extrabold uppercase text-cyan-400 select-none">Configure Study Objective</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Goal Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Complete 20h Study Time" 
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5 select-none">
                    <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Metric Category</label>
                    <select
                      value={newGoalCategory}
                      onChange={(e) => setNewGoalCategory(e.target.value as Goal['category'])}
                      className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="study_hours">Study Hours logged</option>
                      <option value="topic_coverage">Topic Coverage %</option>
                      <option value="knowledge_growth">Knowledge Base growth</option>
                      <option value="quiz_performance">Quiz grades %</option>
                      <option value="revision_progress">Revision checklists</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Target Target Value</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 20" 
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(e.target.value)}
                      className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Deadline Date</label>
                    <input 
                      type="date" 
                      value={newGoalDeadline}
                      onChange={(e) => setNewGoalDeadline(e.target.value)}
                      className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] font-bold select-none pt-2">
                  <Button 
                    onClick={() => setShowAddGoal(false)}
                    className="bg-transparent hover:bg-white/5 border border-white/10 text-white font-bold text-[9px] h-8 px-4"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateGoal}
                    disabled={isPending}
                    className="bg-gradient-to-r from-cyan-400 to-indigo-500 text-black font-bold text-[9px] h-8 px-4 border-0"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : "Save Goal"}
                  </Button>
                </div>
              </div>
            )}

            {/* List Active Goals */}
            {goals.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8 select-none">No active goals registered. Create a new target to monitor progress.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal) => {
                  const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                  return (
                    <div key={goal.id} className="p-4 bg-black/25 border border-white/5 rounded-xl space-y-3 relative group">
                      
                      {/* Metric name & completion badge */}
                      <div className="flex justify-between items-start select-none">
                        <div className="space-y-0.5">
                          <span className="text-[7.5px] uppercase font-extrabold text-[var(--text-muted)] tracking-widest">{goal.category.replace('_', ' ')}</span>
                          <h4 className="text-[11.5px] font-bold text-[var(--text-primary)] leading-tight">{goal.title}</h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {goal.completed ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-bold uppercase tracking-wider">Completed</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[7px] font-bold uppercase tracking-wider">{percent}%</span>
                          )}
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity cursor-pointer rounded"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>

                      {/* Progress meter */}
                      <div className="space-y-1 select-none">
                        <div className="relative w-full h-1.5 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                          <div 
                            className="absolute h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-[var(--text-muted)] font-mono">
                          <span>{goal.current_value} / {goal.target_value}</span>
                          <span>Deadline: {goal.deadline_date}</span>
                        </div>
                      </div>

                      {/* Increment target button */}
                      {!goal.completed && (
                        <div className="flex justify-end pt-1 select-none">
                          <button
                            onClick={() => handleIncrementGoal(goal.id, goal.current_value, goal.target_value)}
                            className="px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={8} />
                            Log Progress
                          </button>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>

          {/* Section 5: Recent study logs */}
          <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 select-none">
              Recent Study Sessions Activity Logs
            </h3>

            {recentSessions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No focus sessions logged. Start the stopwatch above to capture study sessions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[8px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider select-none">
                      <th className="py-2">Subject / Topic</th>
                      <th className="py-2 text-center">Duration</th>
                      <th className="py-2 text-center">Focus Intensity</th>
                      <th className="py-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {recentSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-white/[0.01]">
                        <td className="py-2.5 font-bold text-[var(--text-primary)]">{session.subject}</td>
                        <td className="py-2.5 text-center font-mono font-semibold">{session.duration_minutes} Mins</td>
                        <td className="py-2.5 text-center">
                          <div className="flex justify-center text-amber-400 select-none">
                            {Array.from({ length: session.focus_rating }).map((_, i) => (
                              <span key={i} className="text-[10px]">★</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium text-[var(--text-muted)]">{session.study_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

        </div>
      )}

    </div>
  )
}

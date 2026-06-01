'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Compass, 
  Upload, 
  BookOpen, 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  ListChecks, 
  Award,
  ChevronRight,
  RefreshCw,
  Percent,
  CheckCircle2,
  Bookmark,
  Layers,
  ArrowRight,
  Play,
  Activity,
  FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SemesterPlan {
  id: string
  subject_name: string
  subject_code: string
  units: Array<{
    unitNumber: number
    title: string
    topics: string[]
    weightage: number
  }>
  marks_distribution: {
    finalExam: number
    internalExams: number
    projects: number
    assignments: number
    practicals: number
  }
  practicals: Array<{
    name: string
    description: string
  }>
  roadmaps: {
    semester: Array<{ month: string; milestones: string[] }>
    weekly: Array<{ week: number; focus: string; tasks: string[] }>
    daily: Array<{ day: string; tasks: string[] }>
    revision: Array<{ topic: string; dates: string[] }>
  }
  exam_prep: {
    internalPrep: string[]
    finalPrep: string[]
  }
  created_at: string
}

export default function SemesterCopilotPage() {
  const supabase = createClient()
  
  // State
  const [plans, setPlans] = useState<SemesterPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<SemesterPlan | null>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily' | 'revision' | 'practicals'>('weekly')
  const [examPrepTab, setExamPrepTab] = useState<'internal' | 'final'>('internal')
  const [isLoading, setIsLoading] = useState(true)
  
  // Interactive Checkbox state synced to Local Storage
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchPlans()
    // Load check states from localStorage
    const saved = localStorage.getItem('semester_copilot_completed_tasks')
    if (saved) {
      try {
        setCompletedTasks(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPlans = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('semester_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlans(data || [])
      if (data && data.length > 0) {
        setSelectedPlan(data[0])
      }
    } catch (err: unknown) {
      console.error('Failed to load semester plans:', err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadError(null)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    try {
      setIsUploading(true)
      setUploadError(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/semester/generate', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.error || 'Failed to parse syllabus.')
      }

      const newPlan = await response.json()
      setPlans(prev => [newPlan, ...prev])
      setSelectedPlan(newPlan)
      setFile(null)
      
      const fileInput = document.getElementById('syllabus-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsUploading(false)
    }
  }

  const toggleTask = (taskKey: string) => {
    const updated = {
      ...completedTasks,
      [taskKey]: !completedTasks[taskKey]
    }
    setCompletedTasks(updated)
    localStorage.setItem('semester_copilot_completed_tasks', JSON.stringify(updated))
  }

  const handleResetPlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('semester_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      const remaining = plans.filter(p => p.id !== id)
      setPlans(remaining)
      if (remaining.length > 0) {
        setSelectedPlan(remaining[0])
      } else {
        setSelectedPlan(null)
      }
    } catch (err: unknown) {
      console.error('Failed to reset plan:', err instanceof Error ? err.message : String(err))
    }
  }

  // Calculate stats based on checklists
  const getSubjectStats = () => {
    if (!selectedPlan) return { progress: 0, total: 0, completed: 0 }
    
    let totalTasksCount = 0
    let completedTasksCount = 0

    // Count weekly tasks
    selectedPlan.roadmaps.weekly.forEach(w => {
      w.tasks.forEach((t, i) => {
        totalTasksCount++
        const key = `${selectedPlan.id}-w-${w.week}-task-${i}`
        if (completedTasks[key]) completedTasksCount++
      })
    })

    // Count exam prep tasks
    selectedPlan.exam_prep.internalPrep.forEach((t, i) => {
      totalTasksCount++
      const key = `${selectedPlan.id}-prep-int-task-${i}`
      if (completedTasks[key]) completedTasksCount++
    })
    selectedPlan.exam_prep.finalPrep.forEach((t, i) => {
      totalTasksCount++
      const key = `${selectedPlan.id}-prep-fin-task-${i}`
      if (completedTasks[key]) completedTasksCount++
    })

    return {
      total: totalTasksCount,
      completed: completedTasksCount,
      progress: totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0
    }
  }

  const stats = getSubjectStats()

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 select-text">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-glass)]/25 pb-4 select-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Compass size={18} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white font-heading">
              Semester Copilot
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Ingest your syllabus structure to align unit weights, maps, Gantt roadmap tasks, and mock exam schedules.
          </p>
        </div>

        {/* Plan Select Toggle */}
        {plans.length > 1 && (
          <select
            value={selectedPlan?.id || ''}
            onChange={(e) => {
              const matched = plans.find(p => p.id === e.target.value)
              if (matched) setSelectedPlan(matched)
            }}
            className="bg-[#16171E] border border-[var(--border-glass)] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.subject_code ? `[${p.subject_code}] ` : ''}{p.subject_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 select-none">
          <Loader2 size={32} className="animate-spin text-cyan-400" />
          <span className="text-xs text-[var(--text-secondary)] font-semibold">Tethering Syllabus Modules...</span>
        </div>
      ) : !selectedPlan ? (
        
        /* Syllabus Uploader (When no active plans exist) */
        <GlassCard className="p-8 max-w-xl mx-auto border-[var(--border-glass)] mt-10 select-none">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 text-[var(--accent-blue)] border border-cyan-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <Upload size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider font-heading">
                Initialize Course Schedule
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                Upload your university course syllabus (PDF, DOCX, or TXT) to generate full roadmaps, grading distributions, and revision structures.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
              <div className="border border-dashed border-[var(--border-glass)] hover:border-cyan-500/40 rounded-2xl p-7 bg-black/20 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  id="syllabus-file-input"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.docx,.pptx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-xs text-[var(--text-secondary)] group-hover:text-white transition-colors">
                  {file ? (
                    <span className="text-cyan-400 font-extrabold font-mono uppercase">{file.name}</span>
                  ) : (
                    <span>Click to browse syllabus file</span>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-left">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={!file || isUploading}
                className="w-full h-11 rounded-xl text-xs font-extrabold cursor-pointer shadow-[0_4px_15px_rgba(0,210,255,0.15)] bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-black flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    Compiling vector syllabus roadmap...
                  </>
                ) : (
                  <>
                    <Compass size={14} className="text-black" />
                    Extract & Plan Semester
                  </>
                )}
              </Button>
            </form>
          </div>
        </GlassCard>

      ) : (

        /* Semester Dashboard Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Left Column: Syllabus breakdown & Course Details */}
          <div className="space-y-6">
            
            {/* Course Header card */}
            <GlassCard className="p-5 border-[var(--border-glass)] relative overflow-hidden bg-[var(--surface-bg)] shadow-md select-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-blue-glow)] rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4">
                <div>
                  <span className="px-2 py-0.5 rounded bg-[var(--accent-blue-glow)] text-[8.5px] font-extrabold text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 font-mono">
                    {selectedPlan.subject_code || 'COURSE'}
                  </span>
                  <h2 className="text-lg font-black text-white mt-2 leading-tight font-heading">
                    {selectedPlan.subject_name}
                  </h2>
                </div>

                <div className="flex items-center gap-5 text-[10px] border-t border-[var(--border-glass)]/40 pt-3 text-[var(--text-secondary)] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <ListChecks size={12} className="text-purple-400" />
                    <span>{selectedPlan.units.length} Modules</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award size={12} className="text-emerald-400" />
                    <span>{selectedPlan.practicals.length} Lab Components</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Overall Subject Readiness Progress */}
            <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] flex items-center justify-between gap-4 shadow-md select-none">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingUp size={14} className="text-cyan-400" />
                  Syllabus Metrics
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] leading-normal max-w-[160px]">
                  Estimated progress based on completed roadmap tasks.
                </p>
                <div className="text-[10px] font-extrabold text-white pt-1.5 font-mono">
                  {stats.completed} / {stats.total} TASKS DONE
                </div>
              </div>

              {/* Radial Score Gauge */}
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="36" cy="36" r="30" stroke="rgba(255,255,255,0.04)" strokeWidth="5" fill="transparent" />
                  <motion.circle
                    cx="36"
                    cy="36"
                    r="30"
                    stroke="url(#progressGlow)"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 30}
                    initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - stats.progress / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="progressGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d2ff" />
                      <stop offset="100%" stopColor="#9d4edd" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-xs font-bold text-white font-mono">
                  {stats.progress}%
                </span>
              </div>
            </GlassCard>

            {/* Marks Distribution Donut (Custom SVG Chart) */}
            <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] space-y-4 shadow-md select-none">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Percent size={14} className="text-purple-400" />
                Marks Weightage
              </h3>

              <div className="flex items-center gap-6 justify-center py-2">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="10" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#00d2ff"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - selectedPlan.marks_distribution.finalExam / 100)}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase block font-bold tracking-widest">Final</span>
                    <span className="text-sm font-black text-[var(--accent-blue)]">{selectedPlan.marks_distribution.finalExam}%</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-cyan-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Final Exam:</span>
                    <span className="font-bold text-white">{selectedPlan.marks_distribution.finalExam}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-purple-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Internals:</span>
                    <span className="font-bold text-white">{selectedPlan.marks_distribution.internalExams}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-emerald-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Labs/Viva:</span>
                    <span className="font-bold text-white">{selectedPlan.marks_distribution.practicals}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-orange-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Projects:</span>
                    <span className="font-bold text-white">{(selectedPlan.marks_distribution.projects + selectedPlan.marks_distribution.assignments)}%</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Units & Topics Accordion Details */}
            <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider select-none">
                <BookOpen size={14} className="text-emerald-400" />
                Unit Outline Modules
              </h3>

              <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {selectedPlan.units.map(unit => (
                  <div key={unit.unitNumber} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-bold font-mono uppercase select-none">
                      <span className="text-cyan-400">Unit {unit.unitNumber}</span>
                      <span className="text-[var(--text-secondary)]">Weight: {unit.weightage}%</span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-normal font-heading">
                      {unit.title}
                    </h4>
                    <div className="flex flex-wrap gap-1 select-none">
                      {unit.topics.map((topic, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-[var(--text-secondary)] font-semibold"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

          </div>

          {/* Center Column: Study Roadmaps (Weekly, Daily, Revision, Practicals) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Roadmap Tab view */}
            <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] space-y-5 shadow-md">
              
              {/* Tab Navigation header */}
              <div className="flex items-center justify-between border-b border-[var(--border-glass)] pb-3 flex-wrap gap-2 select-none">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Timeline Agenda
                </h3>
                
                <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-xl text-[10px]">
                  <button
                    onClick={() => setActiveTab('weekly')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'weekly' ? 'bg-[var(--accent-blue)] text-black shadow' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    Weekly Gantt
                  </button>
                  <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'daily' ? 'bg-[var(--accent-blue)] text-black shadow' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    Daily Blocks
                  </button>
                  <button
                    onClick={() => setActiveTab('revision')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'revision' ? 'bg-[var(--accent-blue)] text-black shadow' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    Spaced Revision
                  </button>
                  <button
                    onClick={() => setActiveTab('practicals')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'practicals' ? 'bg-[var(--accent-blue)] text-black shadow' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    Labs
                  </button>
                </div>
              </div>

              {/* Tab Content Display */}
              <div className="space-y-4 min-h-[240px]">
                
                {/* Weekly Focus Tab */}
                {activeTab === 'weekly' && (
                  <div className="space-y-4">
                    {selectedPlan.roadmaps.weekly.map((w) => (
                      <div key={w.week} className="p-4 rounded-2xl bg-black/25 border border-[var(--border-glass)] space-y-3">
                        <div className="flex items-center justify-between text-xs select-none">
                          <span className="font-extrabold text-[var(--accent-blue)] uppercase font-mono tracking-wider">Week {w.week} Focus</span>
                          <span className="text-[9.5px] text-[var(--text-secondary)] font-extrabold bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {w.focus}
                          </span>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-[var(--border-glass)]/40">
                          {w.tasks.map((task, i) => {
                            const key = `${selectedPlan.id}-w-${w.week}-task-${i}`
                            const isDone = !!completedTasks[key]
                            return (
                              <div key={i} className="flex items-start gap-3 text-xs">
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => toggleTask(key)}
                                  className="w-4 h-4 rounded border-gray-600 bg-black text-[var(--accent-blue)] focus:ring-[var(--accent-blue-glow)] mt-0.5 shrink-0 cursor-pointer accent-[var(--accent-blue)]"
                                />
                                <span className={isDone ? 'line-through text-[var(--text-muted)]' : 'text-slate-200'}>
                                  {task}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Daily Checklist Tab */}
                {activeTab === 'daily' && (
                  <div className="space-y-3.5 select-none">
                    {selectedPlan.roadmaps.daily.map((d, i) => (
                      <div key={i} className="flex flex-col gap-2.5 p-4 rounded-2xl bg-black/25 border border-[var(--border-glass)]">
                        <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                          <Clock size={13} />
                          {d.day} Study Target
                        </div>
                        <div className="space-y-2 pl-4 border-l border-[var(--border-glass)]/40 text-xs text-slate-300">
                          {d.tasks.map((task, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <ChevronRight size={10} className="text-[var(--accent-blue)]" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Revision Schedule Tab */}
                {activeTab === 'revision' && (
                  <div className="space-y-3.5 select-none">
                    {selectedPlan.roadmaps.revision.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/25 border border-[var(--border-glass)] gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white font-heading">{r.topic}</h4>
                          <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-wider">Spaced Recall Timeline</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[8.5px] font-extrabold text-black font-mono uppercase">
                          {r.dates.map((date, idx) => (
                            <span key={idx} className="px-2.5 py-0.5 rounded bg-[var(--accent-blue)] shrink-0 shadow-sm">
                              {date}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Lab components Tab */}
                {activeTab === 'practicals' && (
                  <div className="space-y-3.5 select-none">
                    {selectedPlan.practicals.map((p, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-black/25 border border-[var(--border-glass)] space-y-2">
                        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Award size={13} />
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </GlassCard>

            {/* Exam Preparation Centre */}
            <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-[var(--border-glass)] pb-3 flex-wrap gap-2 select-none">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-cyan-400" />
                  Prep Checkpoints
                </h3>
                
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setExamPrepTab('internal')}
                    className={`text-[9.5px] font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${examPrepTab === 'internal' ? 'bg-[var(--accent-blue-glow)] text-[var(--accent-blue)] border-[var(--accent-blue)]/20' : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:text-white'}`}
                  >
                    Internals
                  </button>
                  <button
                    onClick={() => setExamPrepTab('final')}
                    className={`text-[9.5px] font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${examPrepTab === 'final' ? 'bg-[var(--accent-blue-glow)] text-[var(--accent-blue)] border-[var(--accent-blue)]/20' : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:text-white'}`}
                  >
                    Finals
                  </button>
                </div>
              </div>

              {/* Prep checklists */}
              <div className="space-y-2.5">
                {(examPrepTab === 'internal' ? selectedPlan.exam_prep.internalPrep : selectedPlan.exam_prep.finalPrep).map((task, i) => {
                  const key = `${selectedPlan.id}-prep-${examPrepTab}-task-${i}`
                  const isDone = !!completedTasks[key]
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer",
                        isDone ? 'bg-white/[0.01] border-transparent opacity-40' : 'bg-black/10 border-[var(--border-glass)]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleTask(key)}
                        className="w-4 h-4 rounded border-gray-600 bg-black text-[var(--accent-blue)] focus:ring-[var(--accent-blue-glow)] mt-0.5 shrink-0 cursor-pointer accent-[var(--accent-blue)]"
                      />
                      <span className={cn("text-xs leading-normal", isDone ? 'line-through text-[var(--text-secondary)]' : 'text-slate-200')}>
                        {task}
                      </span>
                    </div>
                  )
                })}
              </div>
            </GlassCard>

            {/* Reset / Re-upload Option */}
            <div className="flex justify-end pt-2 select-none">
              <button
                onClick={() => handleResetPlan(selectedPlan.id)}
                className="text-[9px] font-extrabold text-rose-400/90 hover:text-rose-300 flex items-center gap-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw size={10} />
                RESET & UPLOAD SYLLABUS
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}

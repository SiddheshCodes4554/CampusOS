'use client'

import React, { useState, useEffect } from 'react'
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
  Percent
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'

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
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(0,210,255,0.3)]">
              <Compass size={18} />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              AI Semester Copilot
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Upload your syllabus to automatically map units, grades, schedules, practical works, and generate targeted internal/final exam preparators.
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
            className="bg-[#16171E] border border-[var(--border-glass)]/70 rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
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
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 size={32} className="animate-spin text-cyan-400" />
          <span className="text-xs text-[var(--text-secondary)]">Loading semester copilot context...</span>
        </div>
      ) : !selectedPlan ? (
        
        /* Syllabus Uploader (When no active plans exist) */
        <GlassCard className="p-8 max-w-xl mx-auto border-[var(--border-glass)]/70 mt-10">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <Upload size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold font-heading text-[var(--text-primary)]">
                Initialize Semester Copilot
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Drag and drop your university course syllabus (PDF, DOCX, PPTX, or TXT) to generate full roadmaps, grading graphs, and revision structures.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
              <div className="border border-dashed border-[var(--border-glass)]/50 rounded-2xl p-6 bg-black/20 hover:border-cyan-500/40 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  id="syllabus-file-input"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.docx,.pptx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  {file ? (
                    <span className="text-cyan-400 font-semibold">{file.name}</span>
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
                className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer shadow-[0_4px_12px_rgba(0,210,255,0.15)] bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    Parsing syllabus & mapping roadmaps...
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Syllabus breakdown & Course Details */}
          <div className="space-y-6">
            
            {/* Course Header card */}
            <GlassCard className="p-5 border-[var(--border-glass)]/70 relative overflow-hidden">
              {/* Highlight gradient glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-3">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {selectedPlan.subject_code || 'COURSE'}
                  </span>
                  <h2 className="text-lg font-bold font-heading text-[var(--text-primary)] mt-1.5 leading-tight">
                    {selectedPlan.subject_name}
                  </h2>
                </div>

                <div className="flex items-center gap-6 text-[10px] border-t border-[var(--border-glass)]/40 pt-3 text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1.5">
                    <ListChecks size={12} className="text-purple-400" />
                    <span>{selectedPlan.units.length} Syllabus Units</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award size={12} className="text-emerald-400" />
                    <span>{selectedPlan.practicals.length} Practical Labs</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Overall Subject Readiness Progress */}
            <GlassCard className="p-5 border-[var(--border-glass)]/70 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-cyan-400" />
                  Subject Readiness
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight max-w-[160px]">
                  Estimated progress based on completed roadmap tasks.
                </p>
                <div className="text-xs font-semibold text-[var(--text-primary)] pt-1">
                  {stats.completed} / {stats.total} Tasks Done
                </div>
              </div>

              {/* Radial Score Gauge */}
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    stroke="url(#progressGlow)"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - stats.progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="progressGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d2ff" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-xs font-bold text-[var(--text-primary)]">
                  {stats.progress}%
                </span>
              </div>
            </GlassCard>

            {/* Marks Distribution Donut (Custom SVG Chart) */}
            <GlassCard className="p-5 border-[var(--border-glass)]/70 space-y-4">
              <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Percent size={14} className="text-purple-400" />
                Marks Distribution
              </h3>

              <div className="flex items-center gap-6 justify-center py-2">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="10" fill="transparent" />
                    
                    {/* Ring segment for Final Exam */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#06b6d4" // Cyan
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - selectedPlan.marks_distribution.finalExam / 100)}
                    />
                    {/* Inner layers for remaining segments would overlay, but showing main distribution visually */}
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-bold tracking-wider">Exam</span>
                    <span className="text-sm font-black text-cyan-400">{selectedPlan.marks_distribution.finalExam}%</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-cyan-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Final Exam:</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedPlan.marks_distribution.finalExam}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Internals:</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedPlan.marks_distribution.internalExams}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Practicals:</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedPlan.marks_distribution.practicals}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-orange-400 block shrink-0" />
                    <span className="text-[var(--text-secondary)] font-semibold">Labs/Projects:</span>
                    <span className="font-bold text-[var(--text-primary)]">{(selectedPlan.marks_distribution.projects + selectedPlan.marks_distribution.assignments)}%</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Units & Topics List */}
            <GlassCard className="p-5 border-[var(--border-glass)]/70 space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <BookOpen size={14} className="text-emerald-400" />
                Syllabus Topics
              </h3>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {selectedPlan.units.map(unit => (
                  <div key={unit.unitNumber} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-cyan-400 uppercase tracking-wide">Unit {unit.unitNumber}</span>
                      <span className="text-[var(--text-secondary)]">Weight: {unit.weightage}%</span>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                      {unit.title}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {unit.topics.map((topic, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-[var(--text-secondary)] font-medium"
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
            <GlassCard className="p-5 border-[var(--border-glass)]/70 space-y-5">
              
              {/* Tab Navigation header */}
              <div className="flex items-center justify-between border-b border-[var(--border-glass)]/40 pb-3 flex-wrap gap-2">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Roadmap Calendar
                </h3>
                
                <div className="flex items-center gap-1 bg-[#16171E] border border-[var(--border-glass)]/70 p-1 rounded-xl text-[10px]">
                  <button
                    onClick={() => setActiveTab('weekly')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'weekly' ? 'bg-cyan-500 text-black shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    Weekly Focus
                  </button>
                  <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'daily' ? 'bg-cyan-500 text-black shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    Daily Tasks
                  </button>
                  <button
                    onClick={() => setActiveTab('revision')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'revision' ? 'bg-cyan-500 text-black shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    Revision
                  </button>
                  <button
                    onClick={() => setActiveTab('practicals')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'practicals' ? 'bg-cyan-500 text-black shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    Labs
                  </button>
                </div>
              </div>

              {/* Tab Content Display */}
              <div className="space-y-4 min-h-[220px]">
                
                {/* Weekly Focus Tab */}
                {activeTab === 'weekly' && (
                  <div className="space-y-4">
                    {selectedPlan.roadmaps.weekly.map((w) => (
                      <div key={w.week} className="p-3.5 rounded-2xl bg-white/[0.01] border border-[var(--border-glass)]/30 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-cyan-400">Week {w.week} Focus</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-medium bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                            {w.focus}
                          </span>
                        </div>
                        <div className="space-y-2 pt-1 border-t border-[var(--border-glass)]/30">
                          {w.tasks.map((task, i) => {
                            const key = `${selectedPlan.id}-w-${w.week}-task-${i}`
                            const isDone = !!completedTasks[key]
                            return (
                              <div key={i} className="flex items-start gap-2.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => toggleTask(key)}
                                  className="w-4 h-4 rounded border-gray-600 bg-black text-cyan-500 focus:ring-cyan-500/20 shrink-0 cursor-pointer accent-cyan-500"
                                />
                                <span className={isDone ? 'line-through text-[var(--text-secondary)]/50' : 'text-[var(--text-primary)]'}>
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
                  <div className="space-y-3.5">
                    {selectedPlan.roadmaps.daily.map((d, i) => (
                      <div key={i} className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.01] border border-[var(--border-glass)]/30">
                        <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                          <Clock size={12} />
                          {d.day} Study Block
                        </div>
                        <div className="space-y-1.5 pl-4 border-l border-[var(--border-glass)]/40 text-xs text-[var(--text-primary)]">
                          {d.tasks.map((task, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <ChevronRight size={10} className="text-cyan-500" />
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
                  <div className="space-y-3.5">
                    {selectedPlan.roadmaps.revision.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-[var(--border-glass)]/30 gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">{r.topic}</h4>
                          <span className="text-[10px] text-[var(--text-secondary)] font-medium">Spaced Recall Interval</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[9px] font-bold text-black uppercase">
                          {r.dates.map((date, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-cyan-400 shrink-0">
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
                  <div className="space-y-3.5">
                    {selectedPlan.practicals.map((p, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-white/[0.01] border border-[var(--border-glass)]/30 space-y-1">
                        <h4 className="text-xs font-bold text-emerald-400">{p.name}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </GlassCard>

            {/* Exam Preparation Centre */}
            <GlassCard className="p-5 border-[var(--border-glass)]/70 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-glass)]/40 pb-3 flex-wrap gap-2">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-cyan-400" />
                  Exam Prep Console
                </h3>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setExamPrepTab('internal')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${examPrepTab === 'internal' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
                  >
                    Internal Exams
                  </button>
                  <button
                    onClick={() => setExamPrepTab('final')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${examPrepTab === 'final' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
                  >
                    Final Exams
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
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${isDone ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-black/10 border-[var(--border-glass)]/30'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleTask(key)}
                        className="w-4 h-4 rounded border-gray-600 bg-black text-cyan-500 focus:ring-cyan-500/20 mt-0.5 shrink-0 cursor-pointer accent-cyan-500"
                      />
                      <span className={`text-xs ${isDone ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                        {task}
                      </span>
                    </div>
                  )
                })}
              </div>
            </GlassCard>

            {/* Reset / Re-upload Option */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleResetPlan(selectedPlan.id)}
                className="text-[10px] font-bold text-rose-400/80 hover:text-rose-400 flex items-center gap-1 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw size={10} />
                Reset & Upload New Syllabus
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}

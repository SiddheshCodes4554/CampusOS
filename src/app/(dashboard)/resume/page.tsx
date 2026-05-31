'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import {
  UploadCloud,
  FileText,
  CheckCircle,
  XCircle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Brain,
  History,
  Trash2
} from 'lucide-react'

interface ReportData {
  missingSkills: string[]
  improvements: string[]
  careerSuggestions: string[]
}

interface ResumeReport {
  id: string
  file_name: string
  score: number
  report_data: ReportData
  created_at: string
}

export default function ResumePage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  
  // UI states
  const [report, setReport] = useState<ResumeReport | null>(null)
  const [history, setHistory] = useState<ResumeReport[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [checkedImprovements, setCheckedImprovements] = useState<Record<number, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch reports on mount
  useEffect(() => {
    const client = createClient()
    async function loadHistory() {
      try {
        const { data: { user } } = await client.auth.getUser()
        if (user) {
          const { data, error: dbError } = await client
            .from('resume_reports')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
          
          if (!dbError && data) {
            setHistory(data as ResumeReport[])
            // Auto-load most recent report if available
            if (data.length > 0) {
              setReport(data[0] as ResumeReport)
            }
          }
        }
      } catch {
        console.error('Failed to load history.')
      } finally {
        setLoadingHistory(false)
      }
    }
    loadHistory()
  }, [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF resumes are supported.')
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('File size must be less than 4MB.')
      return
    }

    setError(null)
    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      try {
        const res = await fetch('/api/resume/analyze', {
          method: 'POST',
          body: formData
        })

        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setReport(data)
          setHistory(prev => [data, ...prev])
          setCheckedImprovements({})
        }
      } catch {
        setError('Analysis failed. Please try again.')
      }
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { error: dbError } = await supabase
        .from('resume_reports')
        .delete()
        .eq('id', id)

      if (!dbError) {
        setHistory(prev => prev.filter(item => item.id !== id))
        if (report?.id === id) {
          setReport(null)
        }
      }
    } catch {
      console.error('Failed to delete report.')
    }
  }

  const toggleImprovement = (index: number) => {
    setCheckedImprovements(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-[var(--success)] stroke-[var(--success)]'
    if (score >= 70) return 'text-amber-400 stroke-amber-400'
    return 'text-red-400 stroke-red-400'
  }

  return (
    <div className="fade-in-entry flex flex-col gap-6">
      {/* Header Title */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
            Resume Analyzer
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            AI-powered ATS audit, structural keyword checks, and career mapping recommendations.
          </p>
        </div>
        {report && (
          <button
            onClick={() => setReport(null)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-glass)] hover:bg-white/5 text-xs text-[var(--text-primary)] font-semibold cursor-pointer transition-all"
          >
            Scan New Resume
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* VIEW 1: PDF Dropzone Upload (No report viewed) */}
        {!report ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2"
          >
            {/* Upload Area */}
            <div className="lg:col-span-2">
              <form
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onSubmit={(e) => e.preventDefault()}
                className="h-[50vh] relative"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleChange}
                  accept=".pdf"
                  className="hidden"
                />

                <div
                  onClick={triggerFileInput}
                  className={cn(
                    "w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 transition-all cursor-pointer bg-black/20 hover:bg-black/35",
                    dragActive ? "border-[var(--accent-blue)] bg-black/35 shadow-[0_0_20px_rgba(0,210,255,0.05)]" : "border-[var(--border-glass)]",
                    isPending && "pointer-events-none"
                  )}
                >
                  {isPending ? (
                    <div className="flex flex-col items-center gap-4">
                      {/* Loading Ring */}
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-transparent border-[var(--accent-blue)] animate-spin" />
                      </div>
                      <div className="flex flex-col gap-1 select-none">
                        <span className="text-sm font-semibold text-[var(--text-primary)] animate-pulse">
                          AI is analyzing resume PDF...
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          Auditing ATS rules and structural keywords
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--accent-blue)] border border-white/5 shadow-inner">
                        <UploadCloud size={28} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          Drag and drop your PDF resume here
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          or click to browse local files (PDF only, max 4MB)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </form>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed mt-4 flex items-center gap-2">
                  <XCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Sidebar History Panel */}
            <div className="flex flex-col gap-4">
              <GlassCard className="h-full flex flex-col gap-4 max-h-[50vh] overflow-y-auto">
                <div className="pb-2 border-b border-[var(--border-glass)] flex items-center gap-2">
                  <History size={15} className="text-[var(--text-secondary)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Audit History</span>
                </div>

                {loadingHistory ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border border-t-transparent border-[var(--accent-blue)] animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center p-4">
                    <span className="text-xs text-[var(--text-muted)]">No past uploads audited yet.</span>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setReport(item)}
                        className="flex items-center justify-between p-2.5 bg-black/20 hover:bg-white/[0.03] border border-white/5 hover:border-[var(--border-glass)] rounded-lg cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={15} className="text-[var(--text-secondary)] shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[140px]">
                              {item.file_name}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold", item.score >= 85 ? "text-[var(--success)]" : item.score >= 70 ? "text-amber-400" : "text-red-400")}>
                            {item.score}
                          </span>
                          <button
                            onClick={(e) => handleDeleteReport(item.id, e)}
                            className="text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          </motion.div>
        ) : (
          /* VIEW 2: Audit Report Card Visualizer */
          <motion.div
            key="report"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2"
          >
            {/* Left section: Score Circular Card & Suggestions */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              
              {/* Score Circular Summary */}
              <GlassCard className="p-6 flex items-center gap-6">
                {/* Radial Indicator */}
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="42" className="stroke-white/5 fill-transparent" strokeWidth="7" />
                    <circle cx="48" cy="48" r="42" className={cn("fill-transparent transition-all duration-500", getScoreColor(report.score))} strokeWidth="7"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={(2 * Math.PI * 42) * (1 - report.score / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{report.score}</span>
                    <span className="text-[9px] text-[var(--text-muted)] uppercase">ATS Score</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                    <Sparkles size={14} className="text-[var(--accent-blue)]" />
                    <span>ATS Assessment Report</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-md">
                    Analyzed: <span className="text-[var(--text-primary)] font-semibold truncate inline-block max-w-[140px] align-bottom">{report.file_name}</span>. Check the suggested formatting improvements and missing keywords list below to reach a perfect score.
                  </span>
                </div>
              </GlassCard>

              {/* Improvements Checklist */}
              <GlassCard className="p-6 flex flex-col gap-4">
                <div className="pb-2 border-b border-[var(--border-glass)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Formatting & Content Fixes</span>
                  <span className="text-[9px] text-[var(--text-muted)] select-none">
                    {Object.values(checkedImprovements).filter(Boolean).length} / {report.report_data.improvements.length} resolved
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {report.report_data.improvements.map((imp, idx) => {
                    const isChecked = !!checkedImprovements[idx]
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleImprovement(idx)}
                        className="flex items-start gap-3 p-3 bg-black/25 border border-white/5 rounded-lg hover:border-[var(--border-glass)] cursor-pointer transition-all select-none"
                      >
                        <button className="shrink-0 mt-0.5 text-[var(--text-secondary)]">
                          {isChecked ? (
                            <CheckCircle size={15} className="text-[var(--success)]" />
                          ) : (
                            <div className="w-[15px] h-[15px] rounded-full border border-[var(--text-secondary)]" />
                          )}
                        </button>
                        <span className={`text-[11px] leading-relaxed transition-all ${isChecked ? 'line-through text-[var(--text-muted)] opacity-60' : 'text-[var(--text-primary)]'}`}>
                          {imp}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

            </div>

            {/* Right section: keywords and careers */}
            <div className="flex flex-col gap-4">
              
              {/* Missing Skills Pill Container */}
              <GlassCard className="p-6 flex flex-col gap-4">
                <div className="pb-2 border-b border-[var(--border-glass)] flex items-center gap-1.5">
                  <Brain size={15} className="text-[var(--accent-blue)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Missing Keywords</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 select-none">
                  {report.report_data.missingSkills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 text-[10px] font-semibold text-[var(--accent-blue)] flex items-center gap-1.5 hover:bg-[var(--accent-blue)]/20 transition-all hover:scale-102"
                    >
                      <span>{skill}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Career Suggestions Bullet Cards */}
              <GlassCard className="p-6 flex flex-col gap-4">
                <div className="pb-2 border-b border-[var(--border-glass)] flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[var(--accent-purple)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Recommended Career Roles</span>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  {report.report_data.careerSuggestions.map((career, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-lg transition-all"
                    >
                      <ChevronRight size={13} className="text-[var(--accent-purple)] shrink-0" />
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">{career}</span>
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

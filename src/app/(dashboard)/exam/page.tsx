'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Flame,
  Brain,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Bookmark,
  Calendar,
  AlertTriangle,
  HelpCircle,
  Clock,
  ArrowRight,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Interface definitions
interface BrainDocument {
  id: string
  file_name: string
  category: string
  processed: boolean
}

interface ChapterPredict {
  chapterName: string
  importanceScore: number
  reason: string
  frequencyInPYQs: number
}

interface HeatmapTopic {
  topicName: string
  chapterName: string
  importance: 'high' | 'medium' | 'low'
  pyqOccurrence: number
  lectureNoteMention: 'high' | 'medium' | 'low'
  estimatedMarksWeightage: number
}

interface ProbableQuestion {
  question: string
  chapterName: string
  expectedMarks: number
  answerOutline: string
}

interface ExamAnalysisReport {
  subject: string
  highPriorityChapters: ChapterPredict[]
  heatmapTopics: HeatmapTopic[]
  probableQuestions: ProbableQuestion[]
}

interface PredictionRecord {
  id: string
  subject_name: string
  analysis: ExamAnalysisReport
  readiness_checklist: Record<string, boolean>
  created_at: string
}

export default function ExamIntelligencePage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // State Management
  const [documents, setDocuments] = useState<BrainDocument[]>([])
  const [reports, setReports] = useState<PredictionRecord[]>([])
  const [activeReport, setActiveReport] = useState<PredictionRecord | null>(null)
  
  // Selection Forms
  const [subjectName, setSubjectName] = useState('')
  const [selectedSyllabus, setSelectedSyllabus] = useState<Record<string, boolean>>({})
  const [selectedNotes, setSelectedNotes] = useState<Record<string, boolean>>({})
  const [selectedPYQs, setSelectedPYQs] = useState<Record<string, boolean>>({})

  // UI Control
  const [loading, setLoading] = useState(true)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(null)

  // 1. Fetch academic brain sources and history reports on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch documents
        const { data: docs } = await supabase
          .from('brain_documents')
          .select('id, file_name, category, processed')
          .eq('user_id', user.id)
          .eq('processed', true)
        
        if (docs) {
          setDocuments(docs as BrainDocument[])
        }

        // Fetch history reports
        const { data: predictionRecords } = await supabase
          .from('exam_predictions')
          .select('*')
          .order('created_at', { ascending: false })

        if (predictionRecords) {
          setReports(predictionRecords as PredictionRecord[])
          if (predictionRecords.length > 0) {
            setActiveReport(predictionRecords[0] as PredictionRecord)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [supabase])

  // 2. File categorization helpers
  const syllabi = documents.filter(d => d.category === 'syllabus')
  const notesFiles = documents.filter(d => d.category === 'notes')
  const pyqs = documents.filter(d => d.category === 'pyq')

  // 3. Exam pattern prediction RAG run trigger
  const handleAnalyzeExamPatterns = () => {
    if (!subjectName.trim()) {
      alert('Please enter a subject name.')
      return
    }

    const syllabusDocIds = Object.keys(selectedSyllabus).filter(id => selectedSyllabus[id])
    const noteDocIds = Object.keys(selectedNotes).filter(id => selectedNotes[id])
    const pyqDocIds = Object.keys(selectedPYQs).filter(id => selectedPYQs[id])

    if (syllabusDocIds.length === 0 && noteDocIds.length === 0 && pyqDocIds.length === 0) {
      alert('Please select at least one syllabus, notes, or PYQ file to ground the prediction analysis.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/exam/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectName,
            syllabusDocIds,
            noteDocIds,
            pyqDocIds
          })
        })

        const data = await res.json()
        if (data.error) {
          alert(`Analysis failed: ${data.error}`)
          return
        }

        // Add to history and set active report
        setReports(prev => [data, ...prev])
        setActiveReport(data)
        setSubjectName('')
        setSelectedSyllabus({})
        setSelectedNotes({})
        setSelectedPYQs({})
      } catch (err) {
        console.error(err)
        alert('Internal server error conducting exam intelligence query.')
      }
    })
  }

  // 4. Delete Analysis Report
  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this exam diagnostic report?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !id.startsWith('temp-')) {
        await supabase
          .from('exam_predictions')
          .delete()
          .eq('id', id)
      }

      const updated = reports.filter(r => r.id !== id)
      setReports(updated)

      if (activeReport?.id === id) {
        if (updated.length > 0) {
          setActiveReport(updated[0])
        } else {
          setActiveReport(null)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 5. Toggle topic readiness checklist
  const handleToggleTopic = async (topicName: string) => {
    if (!activeReport) return

    const currentChecklist = activeReport.readiness_checklist || {}
    const updatedChecklist = {
      ...currentChecklist,
      [topicName]: !currentChecklist[topicName]
    }

    const updatedRecord: PredictionRecord = {
      ...activeReport,
      readiness_checklist: updatedChecklist
    }

    // Optimistic Update
    setActiveReport(updatedRecord)
    setReports(prev => prev.map(r => r.id === activeReport.id ? updatedRecord : r))

    // DB Update
    try {
      if (!activeReport.id.startsWith('temp-')) {
        await supabase
          .from('exam_predictions')
          .update({ readiness_checklist: updatedChecklist })
          .eq('id', activeReport.id)
      }
    } catch (err) {
      console.warn('Sync checklist failed:', err)
    }
  }

  // 6. Metrics computations
  const getReadinessMetrics = () => {
    if (!activeReport || !activeReport.analysis.heatmapTopics) {
      return { score: 0, checkedCount: 0, total: 0 }
    }
    const topics = activeReport.analysis.heatmapTopics
    const total = topics.length
    if (total === 0) return { score: 0, checkedCount: 0, total: 0 }

    const checklist = activeReport.readiness_checklist || {}
    const checkedCount = topics.filter(t => checklist[t.topicName]).length
    const score = Math.round((checkedCount / total) * 100)

    return { score, checkedCount, total }
  }

  const { score: readinessScore, checkedCount, total: totalTopics } = getReadinessMetrics()

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 select-text">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none border-b border-[var(--border-glass)]/25 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <Flame size={18} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white font-heading">
              Exam Intelligence
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Analyze syllabus documents, lecture notes, and previous year papers to predict topic weightage and repeat exam patterns.
          </p>
        </div>

        {/* Brain sources status badge */}
        <div className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wide flex items-center gap-1.5 self-start md:self-center">
          <Brain size={12} className="text-cyan-400" />
          <span>{documents.length} Grounding Files Vectorized</span>
        </div>
      </div>

      {/* Loading Widget */}
      {loading ? (
        <div className="py-20 flex flex-col gap-3 justify-center items-center select-none">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
          <span className="text-xs text-[var(--text-muted)] font-semibold">Tethering Diagnostics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Diagnostics Config & History list (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Setup Diagnostic Analysis card */}
            <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] space-y-4 shadow-md">
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-[var(--border-glass)] pb-2.5 select-none">
                Predict Exam Patterns
              </h2>

              {/* Subject Title */}
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                  Subject / Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Operating Systems"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[var(--text-muted)] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* File selectors */}
              <div className="space-y-4">
                
                {/* 1. Syllabus documents */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                    Select Syllabus
                  </label>
                  {syllabi.length === 0 ? (
                    <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed select-none">Syllabus file missing. Upload syllabus in Academic Brain first.</p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {syllabi.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedSyllabus(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.01] cursor-pointer text-[10px] font-bold text-[var(--text-secondary)] border border-transparent hover:border-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSyllabus[doc.id] ?? false}
                            readOnly
                            className="shrink-0 accent-cyan-400"
                          />
                          <span className="truncate">{doc.file_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Lecture Notes */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                    Select Study Notes
                  </label>
                  {notesFiles.length === 0 ? (
                    <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed select-none">Notes files missing. Write notes or upload files to grounds context.</p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {notesFiles.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedNotes(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.01] cursor-pointer text-[10px] font-bold text-[var(--text-secondary)] border border-transparent hover:border-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNotes[doc.id] ?? false}
                            readOnly
                            className="shrink-0 accent-cyan-400"
                          />
                          <span className="truncate">{doc.file_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. PYQs */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                    Select Past Question Papers (PYQs)
                  </label>
                  {pyqs.length === 0 ? (
                    <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed select-none">Past papers missing. Upload files under &ldquo;pyq&rdquo; category.</p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {pyqs.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedPYQs(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.01] cursor-pointer text-[10px] font-bold text-[var(--text-secondary)] border border-transparent hover:border-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPYQs[doc.id] ?? false}
                            readOnly
                            className="shrink-0 accent-cyan-400"
                          />
                          <span className="truncate">{doc.file_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <Button
                onClick={handleAnalyzeExamPatterns}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-amber-400 to-rose-500 text-black text-xs font-bold py-3.5 h-11 select-none shadow-[0_4px_15px_rgba(244,63,94,0.22)] border-0 cursor-pointer rounded-xl flex items-center justify-center gap-1.5 active:scale-97 transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-black" />
                    Analyzing Repeat Patterns...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-black" />
                    Generate Exam Intelligence
                  </>
                )}
              </Button>
            </GlassCard>

            {/* Diagnostic History Card */}
            <GlassCard className="p-4 border-[var(--border-glass)] bg-[var(--surface-bg)] flex flex-col gap-3 max-h-[35vh]">
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-[var(--border-glass)] pb-2 select-none">
                Saved Diagnostic Archive
              </h2>
              
              {reports.length === 0 ? (
                <p className="text-[10px] text-[var(--text-muted)] italic leading-relaxed py-6 select-none text-center">No reports computed yet.</p>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5 max-h-[25vh]">
                  {reports.map((rep) => {
                    const isActive = activeReport?.id === rep.id
                    return (
                      <div
                        key={rep.id}
                        onClick={() => setActiveReport(rep)}
                        className={cn(
                          "group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                          isActive
                            ? 'bg-white/5 border-rose-500/30 shadow-md'
                            : 'border-white/5 bg-black/15 hover:bg-white/[0.01]'
                        )}
                      >
                        <div className="flex items-center gap-2 truncate flex-1">
                          <Flame size={12} className={isActive ? 'text-rose-400' : 'text-[var(--text-secondary)]'} />
                          <span className={cn("text-[11px] font-bold truncate", isActive ? 'text-rose-400' : 'text-slate-300')}>
                            {rep.subject_name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteReport(rep.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity cursor-pointer rounded"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </GlassCard>

          </div>

          {/* Right Column: Diagnostic dashboard results (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {activeReport ? (
              <div className="space-y-6">
                
                {/* Header Metrics Banner (Readiness & Subject) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Subject Details Banner */}
                  <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] md:col-span-2 flex flex-col justify-between shadow-md">
                    <div>
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-rose-400 font-mono">Diagostic Analysis</span>
                      <h2 className="text-lg font-black text-white mt-1.5 leading-tight font-heading truncate">
                        {activeReport.subject_name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] font-semibold mt-4">
                      <span className="flex items-center gap-1.5">
                        <Layers size={12} className="text-cyan-400" />
                        {activeReport.analysis.highPriorityChapters?.length || 0} Priority Chapters
                      </span>
                      <span>•</span>
                      <span>
                        {activeReport.analysis.heatmapTopics?.length || 0} Predicted Topics
                      </span>
                    </div>
                  </GlassCard>

                  {/* Circular SVG Exam Readiness Gauge */}
                  <GlassCard className="p-5 border-[var(--border-glass)] bg-[var(--surface-bg)] flex items-center justify-between gap-4 shadow-md">
                    <div className="space-y-1 select-none">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Readiness</h3>
                      <p className="text-[9.5px] text-[var(--text-secondary)] font-medium leading-normal max-w-[130px]">
                        {checkedCount} of {totalTopics} topics prepped.
                      </p>
                    </div>

                    {/* Circular dial */}
                    <div className="relative w-15 h-15 flex items-center justify-center shrink-0 select-none">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle className="text-white/5" strokeWidth="3.5" stroke="currentColor" fill="transparent" r="15.915" cx="18" cy="18" />
                        <circle
                          className="text-rose-500 transition-all duration-500 ease-out"
                          strokeDasharray={`${readinessScore}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="15.915"
                          cx="18"
                          cy="18"
                          style={{ filter: 'drop-shadow(0 0 4px rgba(244,63,94,0.4))' }}
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-white font-mono">
                        {readinessScore}%
                      </span>
                    </div>
                  </GlassCard>

                </div>

                {/* Priority Matrix Grid (Eisenhower Matrix style) */}
                <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2.5 flex items-between select-none">
                    <span>Priority Topic Matrix</span>
                  </h3>

                  {activeReport.analysis.heatmapTopics && activeReport.analysis.heatmapTopics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Quadrant 1: High Importance / High Marks (Focus first) */}
                      <div className="p-4 bg-rose-500/[0.02] border border-rose-500/10 rounded-2xl space-y-3">
                        <span className="text-[8.5px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1 font-mono select-none">
                          <Flame size={11} className="animate-pulse" /> FOCUS FIRST // HIGH WEIGHTAGE
                        </span>
                        
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
                          {activeReport.analysis.heatmapTopics
                            .filter(t => t.importance.toLowerCase() === 'high')
                            .map((topic, idx) => {
                              const isPrepped = activeReport.readiness_checklist?.[topic.topicName] ?? false
                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleToggleTopic(topic.topicName)}
                                  className={cn(
                                    "p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1",
                                    isPrepped ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/5 bg-black/20 hover:border-white/10"
                                  )}
                                >
                                  <span className="text-[7.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider font-mono">{topic.chapterName}</span>
                                  <p className={cn("text-xs font-bold", isPrepped ? "line-through text-[var(--text-muted)]" : "text-white")}>{topic.topicName}</p>
                                  <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)] mt-1">
                                    <span>Weight: ~{topic.estimatedMarksWeightage}%</span>
                                    <span>PYQ Count: {topic.pyqOccurrence}</span>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Quadrant 2: Medium/Low Importance */}
                      <div className="p-4 bg-cyan-500/[0.02] border border-cyan-500/10 rounded-2xl space-y-3">
                        <span className="text-[8.5px] font-extrabold text-[var(--accent-blue)] uppercase tracking-widest flex items-center gap-1 font-mono select-none">
                          <TrendingUp size={11} /> SECONDARY CONCEPTS
                        </span>
                        
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
                          {activeReport.analysis.heatmapTopics
                            .filter(t => t.importance.toLowerCase() !== 'high')
                            .map((topic, idx) => {
                              const isPrepped = activeReport.readiness_checklist?.[topic.topicName] ?? false
                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleToggleTopic(topic.topicName)}
                                  className={cn(
                                    "p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1",
                                    isPrepped ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/5 bg-black/20 hover:border-white/10"
                                  )}
                                >
                                  <span className="text-[7.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider font-mono">{topic.chapterName}</span>
                                  <p className={cn("text-xs font-bold", isPrepped ? "line-through text-[var(--text-muted)]" : "text-white")}>{topic.topicName}</p>
                                  <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)] mt-1">
                                    <span>Weight: ~{topic.estimatedMarksWeightage}%</span>
                                    <span>PYQ Count: {topic.pyqOccurrence}</span>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] py-4 select-none text-center">No topic heatmap records available.</p>
                  )}
                </GlassCard>

                {/* Grid layout for High Priority Chapters & Probable Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* High Priority Chapters List */}
                  <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 flex flex-col gap-3 max-h-[50vh] overflow-hidden shadow-md">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2.5 select-none flex items-center justify-between">
                      <span>Chapter Weight Rankings</span>
                      <span className="text-[8px] text-[var(--text-muted)] font-normal uppercase tracking-widest">Weight Score</span>
                    </h3>

                    {activeReport.analysis.highPriorityChapters && activeReport.analysis.highPriorityChapters.length > 0 ? (
                      <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-0.5">
                        {activeReport.analysis.highPriorityChapters
                          .sort((a, b) => b.importanceScore - a.importanceScore)
                          .map((ch, idx) => {
                            let barColor = 'bg-[var(--accent-blue)]'
                            if (ch.importanceScore >= 80) barColor = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                            else if (ch.importanceScore >= 50) barColor = 'bg-purple-500'

                            return (
                              <div key={idx} className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-[11px] text-white truncate max-w-[180px]">{ch.chapterName}</span>
                                  <span className="text-[10px] text-cyan-400 font-mono">{ch.importanceScore}%</span>
                                </div>
                                <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">{ch.reason}</p>
                                
                                {/* Micro progress bar */}
                                <div className="relative w-full h-1.5 bg-black/40 border border-white/5 rounded-full overflow-hidden select-none">
                                  <div className={`h-full ${barColor}`} style={{ width: `${ch.importanceScore}%` }} />
                                </div>

                                <div className="text-[9px] text-[var(--text-muted)] font-semibold select-none flex items-center justify-between">
                                  <span>Appearances in past papers: {ch.frequencyInPYQs} times</span>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] py-4 select-none text-center">No priority chapters classified.</p>
                    )}
                  </GlassCard>

                  {/* Probable Questions Accordion */}
                  <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 flex flex-col gap-3 max-h-[50vh] overflow-hidden shadow-md">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2.5 select-none">
                      Probable Questions Forecast
                    </h3>

                    {activeReport.analysis.probableQuestions && activeReport.analysis.probableQuestions.length > 0 ? (
                      <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-0.5">
                        {activeReport.analysis.probableQuestions.map((q, idx) => {
                          const isOpen = activeQuestionIdx === idx
                          return (
                            <div key={idx} className="border border-white/5 bg-black/10 rounded-xl overflow-hidden text-xs">
                              
                              {/* Trigger button */}
                              <button
                                onClick={() => setActiveQuestionIdx(isOpen ? null : idx)}
                                className="w-full text-left p-3.5 flex items-center justify-between gap-2.5 transition-colors hover:bg-white/[0.01] cursor-pointer"
                              >
                                <div className="space-y-1 truncate pr-1">
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-bold uppercase tracking-wider select-none mr-2">
                                    {q.expectedMarks} Marks
                                  </span>
                                  <span className="text-[11px] font-bold text-white whitespace-normal">
                                    {q.question}
                                  </span>
                                </div>
                                {isOpen ? <ChevronUp size={14} className="text-cyan-400 shrink-0" /> : <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" />}
                              </button>

                              {/* Accordion Outline */}
                              {isOpen && (
                                <div className="p-4 bg-black/35 border-t border-white/5 space-y-2 text-[10px] leading-relaxed text-[var(--text-secondary)] select-text">
                                  <div className="flex items-center justify-between select-none">
                                    <span className="text-[8px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Chapter: {q.chapterName}</span>
                                    <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                                      <CheckCircle2 size={8} className="text-emerald-400" />
                                      Verified Predict
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <strong className="text-[var(--text-primary)]">Predicted Answer Structure:</strong>
                                    <p className="whitespace-pre-wrap">{q.answerOutline}</p>
                                  </div>
                                </div>
                              )}

                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] py-4 select-none text-center">No probable questions estimated.</p>
                    )}
                  </GlassCard>

                </div>

              </div>
            ) : (
              // Empty selection prompt
              <GlassCard className="p-12 border-white/5 bg-[#12131A]/60 flex flex-col items-center justify-center text-center gap-3 min-h-[50vh] select-none shadow-md">
                <Flame size={44} className="text-[var(--text-muted)] animate-pulse" />
                <h3 className="text-md font-bold text-white mt-2">Exam Intelligence Console</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                  Provide a subject title and select the corresponding syllabus, class study notes, and previous year papers inside the setup panel to identify trends and probable questions.
                </p>
              </GlassCard>
            )}

          </div>

        </div>
      )}

    </div>
  )
}

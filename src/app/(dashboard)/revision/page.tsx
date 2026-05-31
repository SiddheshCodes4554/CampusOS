'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Brain,
  Sparkles,
  Loader2,
  CheckCircle,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

// Interfaces
interface BrainDocument {
  id: string
  file_name: string
  category: string
  processed: boolean
}

interface Concept {
  conceptName: string
  definition: string
  formulaOrExample: string
}

interface WeakTopic {
  topicName: string
  difficultyReason: string
  revisionTip: string
}

interface ChecklistItem {
  id: string
  dayNumber: number
  task: string
  details: string
}

interface Flashcard {
  front: string
  back: string
}

interface MockQuestion {
  question: string
  marks: number
  idealAnswerOutline: string
}

// Removed unused RevisionReport to fix eslint warnings

interface RevisionRecord {
  id: string
  subject_name: string
  duration_days: number
  concepts: Concept[]
  weak_topics: WeakTopic[]
  checklist: ChecklistItem[]
  flashcards: Flashcard[]
  mock_test: MockQuestion[]
  checklist_state: Record<string, boolean>
  mock_test_answers: Record<string, boolean>
  created_at: string
}

export default function RevisionModePage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // State Management
  const [documents, setDocuments] = useState<BrainDocument[]>([])
  const [plans, setPlans] = useState<RevisionRecord[]>([])
  const [activePlan, setActivePlan] = useState<RevisionRecord | null>(null)
  
  // Selection Forms
  const [subjectName, setSubjectName] = useState('')
  const [durationDays, setDurationDays] = useState<number>(3) // Default 3 days
  const [selectedSyllabus, setSelectedSyllabus] = useState<Record<string, boolean>>({})
  const [selectedNotes, setSelectedNotes] = useState<Record<string, boolean>>({})
  const [selectedPYQs, setSelectedPYQs] = useState<Record<string, boolean>>({})

  // UI Control
  const [loading, setLoading] = useState(true)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'checklist' | 'concepts' | 'weak' | 'flashcards' | 'mock'>('checklist')
  
  // Mock assessment accordion
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(null)
  
  // Spaced repetition flashcards state
  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)

  // 1. Fetch Academic Brain files and saved revision plans on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load files
        const { data: docs } = await supabase
          .from('brain_documents')
          .select('id, file_name, category, processed')
          .eq('user_id', user.id)
          .eq('processed', true)

        if (docs) setDocuments(docs as BrainDocument[])

        // Load saved revision plans
        const { data: records } = await supabase
          .from('revision_plans')
          .select('*')
          .order('created_at', { ascending: false })

        if (records) {
          setPlans(records as RevisionRecord[])
          if (records.length > 0) {
            setActivePlan(records[0] as RevisionRecord)
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [supabase])

  // 2. Document separation helpers
  const syllabi = documents.filter(d => d.category === 'syllabus')
  const notesFiles = documents.filter(d => d.category === 'notes')
  const pyqs = documents.filter(d => d.category === 'pyq')

  // 3. Spaced repetition generate plan trigger
  const handleGenerateRevisionPlan = () => {
    if (!subjectName.trim()) {
      alert('Please enter a subject name.')
      return
    }

    const syllabusDocIds = Object.keys(selectedSyllabus).filter(id => selectedSyllabus[id])
    const noteDocIds = Object.keys(selectedNotes).filter(id => selectedNotes[id])
    const pyqDocIds = Object.keys(selectedPYQs).filter(id => selectedPYQs[id])

    if (syllabusDocIds.length === 0 && noteDocIds.length === 0 && pyqDocIds.length === 0) {
      alert('Please select at least one syllabus, notes, or PYQ file to construct the study timeline.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/revision/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectName,
            durationDays,
            syllabusDocIds,
            noteDocIds,
            pyqDocIds
          })
        })

        const data = await res.json()
        if (data.error) {
          alert(`Failed to generate revision timeline: ${data.error}`)
          return
        }

        setPlans(prev => [data, ...prev])
        setActivePlan(data)
        setSubjectName('')
        setSelectedSyllabus({})
        setSelectedNotes({})
        setSelectedPYQs({})
        setActiveWorkspaceTab('checklist')
      } catch (err) {
        console.error(err)
        alert('Server error generating revision mode prediction.')
      }
    })
  }

  // 4. Delete saved plan
  const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this revision plan?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !id.startsWith('temp-')) {
        await supabase.from('revision_plans').delete().eq('id', id)
      }

      const updated = plans.filter(p => p.id !== id)
      setPlans(updated)

      if (activePlan?.id === id) {
        if (updated.length > 0) {
          setActivePlan(updated[0])
        } else {
          setActivePlan(null)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 5. Check off checklist item
  const handleToggleChecklistItem = async (itemId: string) => {
    if (!activePlan) return

    const currentChecked = activePlan.checklist_state || {}
    const updatedChecked = {
      ...currentChecked,
      [itemId]: !currentChecked[itemId]
    }

    const updatedRecord: RevisionRecord = {
      ...activePlan,
      checklist_state: updatedChecked
    }

    // Optimistic Update
    setActivePlan(updatedRecord)
    setPlans(prev => prev.map(p => p.id === activePlan.id ? updatedRecord : p))

    // DB Update
    try {
      if (!activePlan.id.startsWith('temp-')) {
        await supabase
          .from('revision_plans')
          .update({ checklist_state: updatedChecked })
          .eq('id', activePlan.id)
      }
    } catch (err) {
      console.warn('Checklist sync failed:', err)
    }
  }

  // 6. Check off mock test answer self-grading
  const handleToggleMockQuestion = async (qIdx: number) => {
    if (!activePlan) return

    const currentAnswers = activePlan.mock_test_answers || {}
    const updatedAnswers = {
      ...currentAnswers,
      [qIdx]: !currentAnswers[qIdx]
    }

    const updatedRecord: RevisionRecord = {
      ...activePlan,
      mock_test_answers: updatedAnswers
    }

    // Optimistic Update
    setActivePlan(updatedRecord)
    setPlans(prev => prev.map(p => p.id === activePlan.id ? updatedRecord : p))

    // DB Update
    try {
      if (!activePlan.id.startsWith('temp-')) {
        await supabase
          .from('revision_plans')
          .update({ mock_test_answers: updatedAnswers })
          .eq('id', activePlan.id)
      }
    } catch (err) {
      console.warn('Mock answers sync failed:', err)
    }
  }

  // 7. Calculate metrics
  const getProgressMetrics = () => {
    if (!activePlan || !activePlan.checklist) {
      return { score: 0, checkedCount: 0, total: 0 }
    }
    const total = activePlan.checklist.length
    if (total === 0) return { score: 0, checkedCount: 0, total: 0 }

    const checked = Object.values(activePlan.checklist_state || {}).filter(Boolean).length
    const score = Math.round((checked / total) * 100)
    return { score, checkedCount: checked, total }
  }

  const { score: progressPercent, checkedCount: preppedTasks, total: totalTasks } = getProgressMetrics()

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 select-text">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <RefreshCw size={18} />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Revision Mode
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Create custom 1, 3, 7, or 30-day revision timelines grounded in your notes and syllabus with visual concepts, active recall cards, and mock self-tests.
          </p>
        </div>

        {/* Brain status */}
        <div className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wide flex items-center gap-1.5 self-start md:self-center">
          <Brain size={12} className="text-emerald-400" />
          <span>{documents.length} Grounding Files Active</span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col gap-3 justify-center items-center select-none">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
          <span className="text-xs text-[var(--text-muted)] font-semibold">Loading Revision Center...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Diagnostics Config & History list (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Setup Diagnostic Analysis card */}
            <GlassCard className="p-5 border-[var(--border-glass)]/70 space-y-4">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-glass)] pb-2 select-none">
                Create Revision Timeline
              </h2>

              {/* Subject Title */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                  Subject / Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Operating Systems"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-[#16171E] border border-[var(--border-glass)]/70 rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Revision Duration select tabs */}
              <div className="space-y-1.5 select-none">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">
                  Select Revision Duration
                </label>
                <div className="grid grid-cols-4 bg-white/5 border border-[var(--border-glass)] rounded-xl p-0.5">
                  {([1, 3, 7, 30] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => setDurationDays(days)}
                      disabled={isPending}
                      className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                        durationDays === days
                          ? 'bg-white/10 text-cyan-400 font-extrabold shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* File selectors */}
              <div className="space-y-3">
                
                {/* 1. Syllabus documents */}
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                    Select Syllabus (Ground Truth)
                  </label>
                  {syllabi.length === 0 ? (
                    <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed select-none">Syllabus file missing. Upload syllabus in Academic Brain first.</p>
                  ) : (
                    <div className="max-h-20 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                      {syllabi.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedSyllabus(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                          className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.02] cursor-pointer text-[10px] font-semibold text-[var(--text-secondary)]"
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
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                    Select Study Notes
                  </label>
                  {notesFiles.length === 0 ? (
                    <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed select-none">Notes files missing. Write notes or upload files to grounds context.</p>
                  ) : (
                    <div className="max-h-20 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                      {notesFiles.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedNotes(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                          className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.02] cursor-pointer text-[10px] font-semibold text-[var(--text-secondary)]"
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
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] select-none">
                    Select Past Question Papers (PYQs)
                  </label>
                  {pyqs.length === 0 ? (
                    <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed select-none">Past papers missing. Upload files under &quot;pyq&quot; category.</p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                      {pyqs.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedPYQs(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.02] cursor-pointer text-[10px] font-semibold text-[var(--text-secondary)]"
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
                onClick={handleGenerateRevisionPlan}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-xs font-bold py-3.5 h-10 select-none shadow-[0_4px_15px_rgba(6,182,212,0.22)] border-0 cursor-pointer rounded-xl flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Assembling Revision Plan...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Generate Revision Mode
                  </>
                )}
              </Button>
            </GlassCard>

            {/* Diagnostic History Card */}
            <GlassCard className="p-4 border-[var(--border-glass)]/70 flex flex-col gap-3 max-h-[35vh]">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-glass)] pb-2 select-none">
                Saved Revision Plans
              </h2>
              
              {plans.length === 0 ? (
                <p className="text-[10px] text-[var(--text-muted)] italic leading-relaxed py-6 select-none text-center">No revision plans generated yet.</p>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5 max-h-[25vh]">
                  {plans.map((plan) => {
                    const isActive = activePlan?.id === plan.id
                    return (
                      <div
                        key={plan.id}
                        onClick={() => {
                          setActivePlan(plan)
                          setCurrentCardIdx(0)
                          setIsCardFlipped(false)
                        }}
                        className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isActive
                            ? 'bg-white/5 border-cyan-500/50 shadow-md'
                            : 'border-white/5 bg-black/15 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1">
                          <RefreshCw size={12} className={isActive ? 'text-cyan-400' : 'text-[var(--text-secondary)]'} />
                          <div className="flex flex-col truncate">
                            <span className={`text-[11px] font-bold truncate ${isActive ? 'text-cyan-400' : 'text-[var(--text-primary)]'}`}>
                              {plan.subject_name}
                            </span>
                            <span className="text-[8px] text-[var(--text-muted)] font-medium">
                              Duration: {plan.duration_days} Days Plan
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeletePlan(plan.id, e)}
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

          {/* Right Column: Diagnostic workspace (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {activePlan ? (
              <div className="space-y-6">
                
                {/* Header Metrics Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Subject Title card */}
                  <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 md:col-span-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-cyan-400">Diagnostic Revision Mode</span>
                      <h2 className="text-xl font-extrabold font-heading text-[var(--text-primary)] mt-1 truncate">
                        {activePlan.subject_name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] font-semibold mt-4">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-cyan-400" />
                        {activePlan.duration_days} Days Study Course
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Bookmark size={12} className="text-indigo-400" />
                        {activePlan.concepts?.length || 0} Critical Concepts
                      </span>
                    </div>
                  </GlassCard>

                  {/* Linear Progress Card */}
                  <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 flex flex-col justify-between select-none">
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Revision Progress</h3>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-tight">
                        {preppedTasks} of {totalTasks} checklist items completed.
                      </p>
                    </div>

                    <div className="space-y-2.5 mt-4">
                      {/* Linear progress bar */}
                      <div className="relative w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500 ease-out" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-[var(--text-primary)]">
                        <span>Readiness</span>
                        <span className="text-cyan-400">{progressPercent}%</span>
                      </div>
                    </div>
                  </GlassCard>

                </div>

                {/* Workspace tab selector */}
                <div className="flex items-center border-b border-[var(--border-glass)] pb-2 overflow-x-auto gap-2 scrollbar-none select-none shrink-0">
                  {([
                    { key: 'checklist', label: 'Checklist', icon: CheckCircle },
                    { key: 'concepts', label: 'Important Concepts', icon: Bookmark },
                    { key: 'weak', label: 'Weak Topics', icon: AlertTriangle },
                    { key: 'flashcards', label: 'Flashcards', icon: RefreshCw },
                    { key: 'mock', label: 'Mock Test', icon: Award }
                  ] as const).map(tab => {
                    const Icon = tab.icon
                    const isActive = activeWorkspaceTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setActiveWorkspaceTab(tab.key)
                          setIsCardFlipped(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-white/5 border-[var(--border-glass-active)] text-cyan-400 shadow-sm'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        <Icon size={11} className={isActive ? 'text-cyan-400' : 'text-[var(--text-secondary)]'} />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Active Tab Workspaces */}
                <div className="min-h-[40vh]">
                  
                  {/* TAB 1: CHECKLIST */}
                  {activeWorkspaceTab === 'checklist' && (
                    <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 select-none">
                        Day-by-Day Revision Tasks
                      </h3>

                      {activePlan.checklist && activePlan.checklist.length > 0 ? (
                        <div className="space-y-3.5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-0.5">
                          {activePlan.checklist.map((item) => {
                            const isChecked = activePlan.checklist_state?.[item.id] ?? false
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleToggleChecklistItem(item.id)}
                                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                                    : 'bg-black/15 border-white/5 hover:border-white/10'
                                }`}
                              >
                                <div 
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                    isChecked 
                                      ? 'bg-emerald-500 border-emerald-400 text-black' 
                                      : 'border-white/20'
                                  }`}
                                >
                                  {isChecked && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                                </div>
                                <div className="space-y-1 select-text">
                                  <div className="flex items-center gap-2 select-none">
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[7.5px] font-extrabold uppercase tracking-widest">
                                      Day {item.dayNumber}
                                    </span>
                                  </div>
                                  <h4 className={`text-[11px] font-bold ${isChecked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                                    {item.task}
                                  </h4>
                                  <p className={`text-[10px] leading-relaxed ${isChecked ? 'text-[var(--text-muted)]/80' : 'text-[var(--text-secondary)]'}`}>
                                    {item.details}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No revision checklist tasks computed.</p>
                      )}
                    </GlassCard>
                  )}

                  {/* TAB 2: IMPORTANT CONCEPTS */}
                  {activeWorkspaceTab === 'concepts' && (
                    <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 select-none">
                        Essential Formulas & Cheat Sheets
                      </h3>

                      {activePlan.concepts && activePlan.concepts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[45vh] overflow-y-auto custom-scrollbar pr-0.5">
                          {activePlan.concepts.map((concept, idx) => (
                            <div key={idx} className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-2 text-xs">
                              <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                <Bookmark size={11} className="text-cyan-400" />
                                {concept.conceptName}
                              </h4>
                              <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">{concept.definition}</p>
                              
                              <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-[9.5px] font-mono leading-relaxed text-cyan-300 whitespace-pre-wrap select-all">
                                {concept.formulaOrExample}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No concept cheat sheets defined.</p>
                      )}
                    </GlassCard>
                  )}

                  {/* TAB 3: WEAK TOPICS */}
                  {activeWorkspaceTab === 'weak' && (
                    <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 select-none">
                        Identified Vulnerabilities & Diagnostic Recovery
                      </h3>

                      {activePlan.weak_topics && activePlan.weak_topics.length > 0 ? (
                        <div className="space-y-3.5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-0.5">
                          {activePlan.weak_topics.map((topic, idx) => (
                            <div key={idx} className="p-4 bg-rose-500/[0.01] border border-rose-500/10 rounded-xl space-y-2.5 text-xs">
                              <h4 className="font-bold text-rose-400 flex items-center gap-1.5">
                                <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                                {topic.topicName}
                              </h4>
                              <p className="text-[10px] leading-relaxed text-[var(--text-secondary)] italic">
                                <strong>Vulnerability Details:</strong> {topic.difficultyReason}
                              </p>
                              <div className="p-2.5 bg-emerald-500/[0.02] border border-emerald-500/15 rounded-lg text-[10px] leading-relaxed text-[var(--text-secondary)]">
                                <strong className="text-emerald-400">Recovery Tips:</strong> {topic.revisionTip}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No weak topics diagnosed.</p>
                      )}
                    </GlassCard>
                  )}

                  {/* TAB 4: FLASHCARDS */}
                  {activeWorkspaceTab === 'flashcards' && (
                    <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4 select-none">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 flex items-center justify-between">
                        <span>Active Recall Spaced Repetition Cards</span>
                        <span className="text-[8px] text-[var(--text-muted)] italic font-normal tracking-widest lowercase">Click card to flip</span>
                      </h3>

                      {activePlan.flashcards && activePlan.flashcards.length > 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 max-w-lg mx-auto py-2">
                          <div
                            onClick={() => setIsCardFlipped(!isCardFlipped)}
                            className="w-full h-44 cursor-pointer relative"
                            style={{ perspective: '1000px' }}
                          >
                            <motion.div
                              className="w-full h-full rounded-xl border border-[var(--border-glass)] bg-black/45 flex items-center justify-center p-5 text-center shadow-lg relative"
                              animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                              transition={{ duration: 0.4, ease: 'easeInOut' }}
                              style={{ transformStyle: 'preserve-3d' }}
                            >
                              {/* Front */}
                              <div
                                className="absolute inset-0 p-5 flex flex-col justify-center items-center select-text"
                                style={{ backfaceVisibility: 'hidden' }}
                              >
                                <Bookmark size={14} className="text-cyan-400 mb-2" />
                                <p className="text-xs font-semibold text-[var(--text-primary)] leading-relaxed select-text">
                                  {activePlan.flashcards[currentCardIdx]?.front}
                                </p>
                                <span className="text-[8px] text-[var(--text-muted)] mt-4">Click to flip</span>
                              </div>

                              {/* Back */}
                              <div
                                className="absolute inset-0 p-5 flex flex-col justify-center items-center bg-black/85 rounded-xl select-text"
                                style={{ 
                                  backfaceVisibility: 'hidden',
                                  transform: 'rotateY(180deg)' 
                                }}
                              >
                                <CheckCircle size={14} className="text-emerald-400 mb-2" />
                                <p className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed select-text">
                                  {activePlan.flashcards[currentCardIdx]?.back}
                                </p>
                              </div>
                            </motion.div>
                          </div>

                          {/* Navigator */}
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <Button
                              disabled={currentCardIdx === 0}
                              onClick={() => {
                                setCurrentCardIdx(prev => prev - 1)
                                setIsCardFlipped(false)
                              }}
                              className="p-1 h-6 w-6 rounded bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer"
                            >
                              <ChevronLeft size={14} />
                            </Button>
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              {currentCardIdx + 1} / {activePlan.flashcards.length}
                            </span>
                            <Button
                              disabled={currentCardIdx === activePlan.flashcards.length - 1}
                              onClick={() => {
                                setCurrentCardIdx(prev => prev + 1)
                                setIsCardFlipped(false)
                              }}
                              className="p-1 h-6 w-6 rounded bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer"
                            >
                              <ChevronRight size={14} />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No flashcards available.</p>
                      )}
                    </GlassCard>
                  )}

                  {/* TAB 5: MOCK TEST */}
                  {activeWorkspaceTab === 'mock' && (
                    <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 select-none">
                        <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                          Diagnostic Mock Assessment Paper
                        </h3>
                        <span className="text-[8px] text-[var(--text-muted)] uppercase font-semibold">
                          Grade questions after review
                        </span>
                      </div>

                      {activePlan.mock_test && activePlan.mock_test.length > 0 ? (
                        <div className="space-y-3.5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-0.5">
                          {activePlan.mock_test.map((q, idx) => {
                            const isOpen = activeQuestionIdx === idx
                            const isGraded = activePlan.mock_test_answers?.[idx] ?? false
                            return (
                              <div key={idx} className="border border-white/5 bg-black/15 rounded-xl overflow-hidden text-xs">
                                
                                {/* Header / Trigger */}
                                <div className="flex items-center justify-between p-3.5 gap-2 hover:bg-white/[0.01]">
                                  <div 
                                    onClick={() => handleToggleMockQuestion(idx)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                      isGraded 
                                        ? 'bg-emerald-500 border-emerald-400 text-black' 
                                        : 'border-white/20 hover:border-white/40'
                                    }`}
                                  >
                                    {isGraded && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                                  </div>

                                  <div 
                                    onClick={() => setActiveQuestionIdx(isOpen ? null : idx)}
                                    className="flex-1 text-left cursor-pointer flex items-center justify-between truncate pr-1 ml-1"
                                  >
                                    <div className="truncate">
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-bold uppercase tracking-wider select-none mr-2">
                                        {q.marks} Marks
                                      </span>
                                      <span className={`text-[11px] font-bold ${isGraded ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                                        {q.question}
                                      </span>
                                    </div>
                                    {isOpen ? <ChevronUp size={14} className="text-cyan-400 shrink-0 ml-1" /> : <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0 ml-1" />}
                                  </div>
                                </div>

                                {/* Answer outline expander */}
                                {isOpen && (
                                  <div className="p-4 bg-black/35 border-t border-white/5 space-y-2 text-[10px] leading-relaxed text-[var(--text-secondary)] select-text animate-fadeIn">
                                    <div className="flex items-center justify-between select-none">
                                      <span className="text-[8px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Grading Standard Key</span>
                                      <span className="text-[8px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                                        <Sparkles size={8} className="text-cyan-400 animate-pulse" />
                                        Examiner Sheet
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <strong className="text-[var(--text-primary)]">Ideal Response Outline:</strong>
                                      <p className="whitespace-pre-wrap">{q.idealAnswerOutline}</p>
                                    </div>
                                  </div>
                                )}

                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No mock test computed.</p>
                      )}
                    </GlassCard>
                  )}

                </div>

              </div>
            ) : (
              // Empty selection dashboard prompt
              <GlassCard className="p-12 border-white/5 bg-[#12131A]/60 flex flex-col items-center justify-center text-center gap-3 min-h-[50vh] select-none">
                <RefreshCw size={44} className="text-[var(--text-muted)] animate-pulse" />
                <h3 className="text-md font-bold text-[var(--text-primary)] mt-2">Revision Mode Workspace</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                  Enter a subject title, select study documents from your Academic Brain library, and select your target timeline duration (1 to 30 days) to forecast spaced repetition revision checklists.
                </p>
              </GlassCard>
            )}

          </div>

        </div>
      )}

    </div>
  )
}

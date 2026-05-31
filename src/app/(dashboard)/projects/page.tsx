'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Sparkles,
  Cpu,
  Terminal,
  FileText,
  CheckCircle2,
  History,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Download,
  Folder,
  ArrowLeft,
  AlertTriangle,
  Bookmark
} from 'lucide-react'

// Core Types matching database and generator API
interface ProjectRoadmapPhase {
  phase: string
  tasks: string[]
}

interface ProjectIdea {
  id?: string
  title: string
  description: string
  features: string[]
  techStack: string[]
  architecture: string
  roadmap: ProjectRoadmapPhase[]
  prd: string
  target_role?: string
  skill_level?: string
  interests?: string
}

interface SavedProject {
  id: string
  user_id: string
  target_role: string
  skill_level: string
  interests: string
  title: string
  description: string
  features: string[]
  tech_stack: string[]
  architecture: string
  roadmap: ProjectRoadmapPhase[]
  prd: string
  created_at: string
}

const loadingMessages = [
  'Analyzing target career role & engineering requirements...',
  'Brainstorming 3 distinct high-impact portfolio ideas...',
  'Generating step-by-step checkable implementation roadmaps...',
  'Composing visual file system directory architectures...',
  'Authoring custom full-length Product Requirement Documents (PRD)...'
]

export default function ProjectsPage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // Database / History state
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  // API Generation State
  const [targetRole, setTargetRole] = useState('')
  const [skillLevel, setSkillLevel] = useState('Intermediate')
  const [interests, setInterests] = useState('')
  const [generatedIdeas, setGeneratedIdeas] = useState<ProjectIdea[] | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  
  // Active Project Workspace State
  const [selectedProject, setSelectedProject] = useState<ProjectIdea | null>(null)
  const [isSavedInDb, setIsSavedInDb] = useState(false)
  const [activeTab, setActiveTab] = useState<'roadmap' | 'architecture' | 'prd' | 'features'>('prd')
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true })
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({})

  // Copied state
  const [copiedPrd, setCopiedPrd] = useState(false)

  // Quick suggestions
  const roleSuggestions = ['Fullstack Engineer', 'Frontend Engineer', 'AI/ML Developer', 'Mobile App Developer', 'Data Analyst']
  const interestSuggestions = ['AI chatbot', 'Fintech dashboard', 'E-commerce website', 'Web3 application', 'SaaS product']

  // Load history on mount
  useEffect(() => {
    async function loadSavedProjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('student_projects')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            if (error.code === '42P01') {
              setDbError('Database table not initialized. Local fallback storage activated.')
            } else {
              setDbError(error.message)
            }
          } else if (data) {
            setSavedProjects(data as SavedProject[])
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load saved projects history:', err)
        setDbError('Failed to load project database.')
      } finally {
        setLoadingHistory(false)
      }
    }
    loadSavedProjects()
  }, [supabase])

  // Load checked tasks whenever selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      const storageKey = `campusos-project-tasks-${selectedProject.id || selectedProject.title}`
      const savedTasks = localStorage.getItem(storageKey)
      if (savedTasks) {
        try {
          setCheckedTasks(JSON.parse(savedTasks))
        } catch {
          setCheckedTasks({})
        }
      } else {
        setCheckedTasks({})
      }
      
      const savedMatch = savedProjects.find(p => p.title.toLowerCase() === selectedProject.title.toLowerCase())
      if (savedMatch) {
        setIsSavedInDb(true)
        if (!selectedProject.id) {
          setSelectedProject({
            ...selectedProject,
            id: savedMatch.id
          })
        }
      } else {
        setIsSavedInDb(false)
      }
    }
  }, [selectedProject, savedProjects])

  const toggleTask = (phaseIdx: number, taskIdx: number) => {
    if (!selectedProject) return
    const key = `${phaseIdx}-${taskIdx}`
    const updated = {
      ...checkedTasks,
      [key]: !checkedTasks[key]
    }
    setCheckedTasks(updated)
    const storageKey = `campusos-project-tasks-${selectedProject.id || selectedProject.title}`
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project? Your checkable progress will be lost.')) return

    try {
      const { error } = await supabase
        .from('student_projects')
        .delete()
        .eq('id', id)

      if (error) {
        alert(`Failed to delete: ${error.message}`)
      } else {
        setSavedProjects(prev => prev.filter(p => p.id !== id))
        if (selectedProject && selectedProject.id === id) {
          setSelectedProject(null)
        }
      }
    } catch (err: unknown) {
      console.error('Delete project error:', err)
      alert('Failed to delete project.')
    }
  }

  const handleGenerateProjects = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetRole.trim() || !interests.trim()) return

    setGenerationError(null)
    setGeneratedIdeas(null)

    startTransition(async () => {
      try {
        const response = await fetch('/api/projects/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetRole,
            skillLevel,
            interests
          })
        })

        const data = await response.json()
        if (data.error) {
          setGenerationError(data.error)
        } else if (data.projects) {
          setGeneratedIdeas(data.projects)
        } else {
          setGenerationError('Failed to parse response format from AI API.')
        }
      } catch (err: unknown) {
        console.error('Generation failed:', err)
        setGenerationError('Failed to communicate with AI generation backend. Please try again.')
      }
    })
  }

  const handleSaveProject = async () => {
    if (!selectedProject) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be signed in to save projects.')
        return
      }

      if (isSavedInDb) return

      const payload = {
        user_id: user.id,
        target_role: targetRole || selectedProject.target_role || 'General Developer',
        skill_level: skillLevel || selectedProject.skill_level || 'Intermediate',
        interests: interests || selectedProject.interests || 'Coding',
        title: selectedProject.title,
        description: selectedProject.description,
        features: selectedProject.features,
        tech_stack: selectedProject.techStack,
        architecture: selectedProject.architecture,
        roadmap: selectedProject.roadmap,
        prd: selectedProject.prd
      }

      const { data, error } = await supabase
        .from('student_projects')
        .insert(payload)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        const saved = data as SavedProject
        setSavedProjects(prev => [saved, ...prev])
        setSelectedProject({
          ...selectedProject,
          id: saved.id
        })
        setIsSavedInDb(true)
      }
    } catch (err: unknown) {
      console.error('Save project error:', err)
      alert(`Storing locally for this session.`)
      
      const localId = `local-${Date.now()}`
      const fallbackProject: SavedProject = {
        id: localId,
        user_id: 'local-user',
        target_role: targetRole || 'General Developer',
        skill_level: skillLevel,
        interests: interests,
        title: selectedProject.title,
        description: selectedProject.description,
        features: selectedProject.features,
        tech_stack: selectedProject.techStack,
        architecture: selectedProject.architecture,
        roadmap: selectedProject.roadmap,
        prd: selectedProject.prd,
        created_at: new Date().toISOString()
      }
      setSavedProjects(prev => [fallbackProject, ...prev])
      setSelectedProject({
        ...selectedProject,
        id: localId
      })
      setIsSavedInDb(true)
    }
  }

  const handleCopyPrd = () => {
    if (!selectedProject) return
    navigator.clipboard.writeText(selectedProject.prd)
    setCopiedPrd(true)
    setTimeout(() => setCopiedPrd(false), 2000)
  }

  const handleDownloadMarkdown = () => {
    if (!selectedProject) return
    const element = document.createElement("a")
    const file = new Blob([selectedProject.prd], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = `${selectedProject.title.toLowerCase().replace(/\s+/g, '-')}-prd.md`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const [loadingStep, setLoadingStep] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPending) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length)
      }, 3500)
    } else {
      setLoadingStep(0)
    }
    return () => clearInterval(interval)
  }, [isPending])

  const renderPrdMarkdown = (markdownText: string) => {
    if (!markdownText) return null

    const lines = markdownText.split('\n')
    let inList = false
    let listItems: string[] = []
    const renderedElements: React.ReactNode[] = []

    let inTable = false
    let tableRows: string[][] = []

    const flushList = (key: string | number) => {
      if (inList && listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 my-3.5 space-y-2 text-sm text-[var(--text-secondary)]">
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInlineMarkdownStyles(item)}</li>
            ))}
          </ul>
        )
        listItems = []
        inList = false
      }
    }

    const flushTable = (key: string | number) => {
      if (inTable && tableRows.length > 0) {
        const hasSeparator = tableRows[1] && tableRows[1].every(cell => cell.trim().startsWith('-') || cell.trim() === '')
        const dataRows = hasSeparator ? tableRows.slice(2) : tableRows.slice(1)
        const headerRow = tableRows[0]

        renderedElements.push(
          <div key={`table-${key}`} className="overflow-x-auto my-5 rounded-xl border border-[var(--border-glass)] bg-black/20">
            <table className="min-w-full divide-y divide-[var(--border-glass)] text-left text-xs">
              {headerRow && (
                <thead className="bg-white/5 font-semibold text-[var(--text-primary)]">
                  <tr>
                    {headerRow.map((cell, idx) => (
                      <th key={idx} className="px-4 py-3 font-semibold uppercase tracking-wider">{parseInlineMarkdownStyles(cell)}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-[var(--border-glass)] text-[var(--text-secondary)]">
                {dataRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-white/[0.01] transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-3">{parseInlineMarkdownStyles(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        tableRows = []
        inTable = false
      }
    }

    const parseInlineMarkdownStyles = (inlineText: string) => {
      const parts = inlineText.split(/(\*\*.*?\*\*|\*.*?\*)/g)
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index} className="italic text-[var(--text-secondary)]">{part.slice(1, -1)}</em>
        }
        return part
      })
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (line.startsWith('|') && line.endsWith('|')) {
        flushList(i)
        inTable = true
        const cells = line.split('|').slice(1, -1).map(c => c.trim())
        tableRows.push(cells)
        continue
      } else {
        flushTable(i)
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        inList = true
        listItems.push(line.slice(2))
        continue
      } else {
        flushList(i)
      }

      if (line === '') {
        renderedElements.push(<div key={`empty-${i}`} className="h-3" />)
        continue
      }

      if (line.startsWith('# ')) {
        renderedElements.push(<h1 key={i} className="text-xl font-bold text-[var(--text-primary)] mt-7 mb-4 border-b border-[var(--border-glass)] pb-2 flex items-center gap-2">{parseInlineMarkdownStyles(line.slice(2))}</h1>)
      } else if (line.startsWith('## ')) {
        renderedElements.push(<h2 key={i} className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">{parseInlineMarkdownStyles(line.slice(3))}</h2>)
      } else if (line.startsWith('### ')) {
        renderedElements.push(<h3 key={i} className="text-md font-medium text-[var(--text-primary)] mt-5 mb-2">{parseInlineMarkdownStyles(line.slice(4))}</h3>)
      } else if (line.startsWith('#### ')) {
        renderedElements.push(<h4 key={i} className="text-sm font-semibold text-[var(--text-primary)] mt-4 mb-2">{parseInlineMarkdownStyles(line.slice(5))}</h4>)
      } else {
        renderedElements.push(<p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed my-2.5">{parseInlineMarkdownStyles(line)}</p>)
      }
    }

    flushList(lines.length)
    flushTable(lines.length)

    return <div className="markdown-body select-text">{renderedElements}</div>
  }

  const loadSavedProjectIntoWorkspace = (proj: SavedProject) => {
    setSelectedProject({
      id: proj.id,
      title: proj.title,
      description: proj.description,
      features: proj.features,
      techStack: proj.tech_stack,
      architecture: proj.architecture,
      roadmap: proj.roadmap,
      prd: proj.prd,
      target_role: proj.target_role,
      skill_level: proj.skill_level,
      interests: proj.interests
    })
  }

  return (
    <div className="fade-in-entry flex flex-col gap-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent flex items-center gap-2">
            <Cpu className="text-[var(--accent-blue)] shrink-0" size={28} />
            AI Project Builder
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Input a role and topics to generate customizable coding project checklists, directory architectures, and full PRDs.
          </p>
        </div>

        {selectedProject && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedProject(null)
              setGeneratedIdeas(null)
            }}
            className="flex items-center gap-1.5 border-[var(--border-glass)] hover:border-[var(--border-glass-active)] cursor-pointer self-start rounded-xl font-bold text-xs"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Button>
        )}
      </div>

      {dbError && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2 max-w-3xl leading-relaxed select-text">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{dbError}</span>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          {/* Workspace view (when project is loaded) */}
          {selectedProject ? (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start"
            >
              {/* Workspace Sidebar: Project Info */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <GlassCard className="p-5 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
                  <div className="flex flex-col gap-1 select-text">
                    <span className="text-[10px] font-bold text-[var(--accent-blue)] tracking-wider uppercase">Project Target</span>
                    <h2 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">{selectedProject.title}</h2>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">{selectedProject.description}</p>
                  </div>

                  <hr className="border-white/5" />

                  {/* Profile Tags */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-muted)]">Target Role:</span>
                      <span className="text-[var(--text-primary)] font-bold truncate max-w-[130px]" title={selectedProject.target_role || targetRole}>
                        {selectedProject.target_role || targetRole || 'Software Engineer'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs select-none">
                      <span className="text-[var(--text-muted)]">Skill Level:</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-[var(--accent-blue)] uppercase">
                        {selectedProject.skill_level || skillLevel}
                      </span>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Tech stack */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Tech Stack</span>
                    <div className="flex flex-wrap gap-1.5 select-text">
                      {selectedProject.techStack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[var(--text-secondary)] hover:border-white/10 hover:text-white transition-colors"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Actions Column */}
                  <div className="flex flex-col gap-2">
                    {!isSavedInDb ? (
                      <Button
                        onClick={handleSaveProject}
                        className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 font-bold text-xs py-2 shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer rounded-xl"
                      >
                        <Bookmark size={13} />
                        Build & Save Project
                      </Button>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={13} />
                        Saved in CampusOS
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={handleCopyPrd}
                        className="flex items-center justify-center gap-1 text-[10px] font-bold border-[var(--border-glass)] cursor-pointer rounded-lg"
                      >
                        <Copy size={11} />
                        {copiedPrd ? 'Copied' : 'Copy PRD'}
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={handleDownloadMarkdown}
                        className="flex items-center justify-center gap-1 text-[10px] font-bold border-[var(--border-glass)] cursor-pointer rounded-lg"
                      >
                        <Download size={11} />
                        Download
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Workspace Main Panel: Tabs and Content */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <GlassCard className="p-6 min-h-[60vh] flex flex-col gap-6 border-white/5 bg-[#12131A]/60">
                  {/* Workspace Navigation Tabs */}
                  <div className="flex items-center border-b border-[var(--border-glass)] pb-2 overflow-x-auto gap-2 scrollbar-none">
                    <button
                      onClick={() => setActiveTab('prd')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                        activeTab === 'prd'
                          ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} />
                        PRD Document
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('roadmap')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                        activeTab === 'roadmap'
                          ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} />
                        Roadmap Checklist
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('architecture')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                        activeTab === 'architecture'
                          ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Terminal size={13} />
                        Folder Structure
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('features')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                        activeTab === 'features'
                          ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Cpu size={13} />
                        Feature Specs
                      </span>
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-1">
                    {activeTab === 'prd' && (
                      <div className="flex flex-col gap-4 h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                        {renderPrdMarkdown(selectedProject.prd)}
                      </div>
                    )}

                    {activeTab === 'roadmap' && (
                      <div className="flex flex-col gap-4 select-text">
                        <div className="flex flex-col gap-1 select-none">
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Chronological Milestone Tasks</h3>
                          <p className="text-xs text-[var(--text-muted)]">Check off implementation stages. Progress is saved locally.</p>
                        </div>

                        <div className="flex flex-col gap-3 mt-2">
                          {selectedProject.roadmap.map((phaseObj, phaseIdx) => {
                            const isExpanded = expandedPhases[phaseIdx] ?? false
                            const phaseTasks = phaseObj.tasks
                            const completedCount = phaseTasks.filter((_, tIdx) => checkedTasks[`${phaseIdx}-${tIdx}`]).length
                            const totalCount = phaseTasks.length
                            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

                            return (
                              <div
                                key={phaseIdx}
                                className="border border-white/5 bg-black/10 rounded-xl overflow-hidden transition-colors"
                              >
                                {/* Phase Header bar */}
                                <div
                                  onClick={() => setExpandedPhases(prev => ({ ...prev, [phaseIdx]: !isExpanded }))}
                                  className="flex items-center justify-between p-3.5 bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer transition-colors select-none"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-6 h-6 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-bold text-[var(--accent-blue)] shrink-0">
                                      {phaseIdx + 1}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                        {phaseObj.phase}
                                      </span>
                                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                        {completedCount} of {totalCount} tasks completed ({percent}%)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3.5">
                                    {/* Progress track */}
                                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                      <div
                                        className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-full transition-all duration-300"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                    {isExpanded ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                                  </div>
                                </div>

                                {/* Phase Tasks Checklist */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0 }}
                                      animate={{ height: 'auto' }}
                                      exit={{ height: 0 }}
                                      className="overflow-hidden bg-black/5"
                                    >
                                      <div className="p-3.5 border-t border-white/5 flex flex-col gap-2.5">
                                        {phaseTasks.map((task, taskIdx) => {
                                          const isChecked = checkedTasks[`${phaseIdx}-${taskIdx}`] ?? false
                                          return (
                                            <div
                                              key={taskIdx}
                                              onClick={() => toggleTask(phaseIdx, taskIdx)}
                                              className="flex items-start gap-3 p-3 bg-[#171821]/40 hover:bg-[#171821]/60 border border-white/5 rounded-xl cursor-pointer transition-colors group/task select-none"
                                            >
                                              <div className="mt-0.5 shrink-0 transition-transform active:scale-95">
                                                {isChecked ? (
                                                  <CheckCircle2 size={16} className="text-emerald-400" />
                                                ) : (
                                                  <div className="w-4 h-4 rounded border border-white/20 group-hover/task:border-[var(--accent-blue)] transition-colors flex items-center justify-center" />
                                                )}
                                              </div>
                                              <span className={`text-xs font-semibold leading-relaxed transition-all ${isChecked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)] group-hover/task:text-white'}`}>
                                                {task}
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'architecture' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1 select-none">
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">ASCII Directory Layout</h3>
                          <p className="text-xs text-[var(--text-muted)]">High-density visual workspace directory structure planned for your project.</p>
                        </div>

                        {/* Monospace Code Editor/Terminal Mockup */}
                        <div className="rounded-xl border border-white/5 bg-[#090a0f] overflow-hidden shadow-2xl relative font-mono text-xs mt-2 select-text">
                          {/* Terminal Header */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/5 select-none">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500/80" />
                              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                              <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] font-bold tracking-wider uppercase">Workspace Explorer</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedProject.architecture)
                                alert('Folder tree copied!')
                              }}
                              className="text-[10px] text-[var(--text-muted)] hover:text-white flex items-center gap-1 border border-white/5 hover:border-white/10 px-2 py-0.5 rounded cursor-pointer font-bold"
                            >
                              <Copy size={10} />
                              Copy
                            </button>
                          </div>

                          {/* Terminal Content */}
                          <div className="p-5 overflow-x-auto text-[var(--text-secondary)] leading-relaxed min-h-[40vh] max-h-[50vh] overflow-y-auto">
                            <div className="flex items-center gap-2 mb-3 text-[var(--accent-blue)] select-none">
                              <Folder size={14} className="shrink-0" />
                              <span className="font-extrabold">{selectedProject.title.toLowerCase().replace(/\s+/g, '-')}</span>
                            </div>
                            <pre className="text-cyan-400/90 whitespace-pre font-mono leading-relaxed pl-3 border-l border-white/5">
                              {selectedProject.architecture}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'features' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1 select-none">
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Key System Features</h3>
                          <p className="text-xs text-[var(--text-muted)]">Core functional deliverables and modules planned for V1 release.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 select-text">
                          {selectedProject.features.map((feat, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-xl flex items-start gap-3 transition-colors hover:bg-white/[0.02]"
                            >
                              <div className="w-5 h-5 rounded-lg bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent-blue)] shrink-0 mt-0.5 select-none">
                                {idx + 1}
                              </div>
                              <span className="text-xs text-[var(--text-secondary)] leading-relaxed font-semibold">
                                {feat}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          ) : (
            /* Creation view (Form and Ideas carousel) */
            <motion.div
              key="creation"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
            >
              {/* Left Column: Configure form */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <GlassCard className="p-6 flex flex-col gap-5 border-white/5 bg-[#12131A]/60">
                  <div className="flex items-center gap-2 select-none">
                    <Sparkles size={16} className="text-[var(--accent-blue)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Configure Build Inputs</span>
                  </div>

                  <form onSubmit={handleGenerateProjects} className="flex flex-col gap-4.5 select-text">
                    {/* Target Role input */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="targetRole" className="text-xs font-bold text-[var(--text-primary)]">Target Professional Role</label>
                      <input
                        id="targetRole"
                        type="text"
                        placeholder="e.g. Backend Engineer, iOS Developer, Data Engineer..."
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                        required
                      />
                      {/* Suggestions list */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5 select-none">
                        {roleSuggestions.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setTargetRole(role)}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[var(--text-secondary)] hover:border-white/10 hover:text-white transition-colors cursor-pointer"
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Skill Level selectors */}
                    <div className="flex flex-col gap-1.5 select-none">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Current Experience Level</span>
                      <div className="grid grid-cols-3 gap-2">
                        {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setSkillLevel(level)}
                            className={`py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              skillLevel === level
                                ? 'bg-[var(--accent-blue-glow)] border-[var(--accent-blue)] text-[var(--accent-blue)] font-bold shadow-[0_2px_8px_rgba(0,210,255,0.1)]'
                                : 'bg-black/25 border-white/5 text-[var(--text-secondary)] hover:border-white/10 hover:text-white'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Areas of Interest input */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="interests" className="text-xs font-bold text-[var(--text-primary)]">Key Tech Topics & Interests</label>
                      <input
                        id="interests"
                        type="text"
                        placeholder="e.g. Chatbots, FinTech, crypto tracker, social network..."
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                        required
                      />
                      {/* Suggestions list */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5 select-none">
                        {interestSuggestions.map((interest) => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => setInterests(interest)}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[var(--text-secondary)] hover:border-white/10 hover:text-white transition-colors cursor-pointer"
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending || !targetRole.trim() || !interests.trim()}
                      className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 font-bold text-xs py-3.5 shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer rounded-xl mt-2 select-none"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-1.5 justify-center">
                          <Loader2 size={14} className="animate-spin text-black" />
                          <span>Generating Portfolio Ideas...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 justify-center">
                          <Sparkles size={14} />
                          <span>Formulate Project Candidates</span>
                        </span>
                      )}
                    </Button>
                  </form>
                </GlassCard>

                {/* Form status / error output */}
                {generationError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg leading-relaxed flex items-center gap-2 select-text">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{generationError}</span>
                  </div>
                )}

                {/* Pulsing loading state */}
                {isPending && (
                  <GlassCard className="p-8 flex flex-col items-center justify-center text-center gap-4 border-[var(--accent-blue)]/20 shadow-lg shadow-[var(--accent-blue-glow)] select-none">
                    <div className="w-14 h-14 rounded-full bg-[var(--accent-blue-glow)] flex items-center justify-center text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 animate-pulse">
                      <Sparkles size={24} />
                    </div>
                    <div className="flex flex-col gap-1.5 max-w-sm">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Consulting Gemini AI Coordinator</span>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed h-8 transition-all duration-300">
                        {loadingMessages[loadingStep]}
                      </p>
                    </div>
                  </GlassCard>
                )}

                {/* Display candidate ideas if generated */}
                {generatedIdeas && !isPending && (
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex items-center gap-2 select-none">
                      <Sparkles size={14} className="text-[var(--accent-purple)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Candidate Recommendations</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {generatedIdeas.map((idea, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedProject(idea)}
                          className="group p-4 bg-white/[0.02] border border-white/5 hover:border-[var(--accent-blue)]/50 rounded-xl cursor-pointer flex flex-col gap-3.5 transition-all hover:bg-white/[0.04]"
                        >
                          <div className="flex flex-col gap-1 select-text">
                            <span className="text-[9px] font-extrabold text-[var(--accent-purple)] uppercase tracking-widest select-none">Idea Option {idx + 1}</span>
                            <h3 className="text-xs font-bold text-[var(--text-primary)] truncate leading-snug group-hover:text-[var(--accent-blue)] transition-colors">
                              {idea.title}
                            </h3>
                            <p className="text-[10px] text-[var(--text-muted)] line-clamp-3 mt-1 leading-relaxed">
                              {idea.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-auto select-text">
                            {idea.techStack.slice(0, 3).map((t, tIdx) => (
                              <span key={tIdx} className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[var(--text-secondary)] select-none">
                                {t}
                              </span>
                            ))}
                            {idea.techStack.length > 3 && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[var(--text-muted)] select-none">
                                +{idea.techStack.length - 3} more
                              </span>
                            )}
                          </div>

                          <button className="text-[10px] font-bold text-[var(--accent-blue)] hover:text-white flex items-center gap-1 mt-1 transition-colors select-none">
                            <span>Load Details</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: History panel of saved projects */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <GlassCard className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto border-white/5 bg-[#12131A]/60">
                  <div className="pb-2 border-b border-[var(--border-glass)] flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <History size={15} className="text-[var(--text-secondary)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Project Portfolio</span>
                    </div>
                    {savedProjects.length > 0 && (
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-[var(--accent-blue)] font-bold">
                        {savedProjects.length}
                      </span>
                    )}
                  </div>

                  {loadingHistory ? (
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-xl">
                          <div className="flex items-center gap-2 w-full">
                            <Skeleton className="w-4 h-4 rounded-md shrink-0 animate-pulse" />
                            <div className="flex flex-col gap-1.5 w-3/4">
                              <Skeleton className="w-2/3 h-2.5 rounded" />
                              <Skeleton className="w-1/3 h-1.5 rounded" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : savedProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <Cpu size={24} className="text-[var(--text-muted)] animate-pulse" />
                      <span className="text-xs text-[var(--text-muted)] max-w-[160px]">
                        No saved build blueprints. Fill in the build details to generate.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {savedProjects.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => loadSavedProjectIntoWorkspace(item)}
                          className="flex items-center justify-between p-3 bg-black/25 hover:bg-white/[0.03] border border-white/5 hover:border-[var(--border-glass)] rounded-xl cursor-pointer transition-all group/item"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[130px] group-hover/item:text-[var(--accent-blue)] transition-colors">
                              {item.title}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] mt-1 truncate max-w-[130px] select-none">
                              {item.target_role} • {item.skill_level}
                            </span>
                          </div>

                          <button
                            onClick={(e) => handleDeleteProject(item.id, e)}
                            className="text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer p-1 shrink-0"
                            title="Delete project"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

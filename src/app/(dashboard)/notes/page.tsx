'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  FileUp,
  Sparkles,
  Save,
  HelpCircle,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading,
  Quote,
  Eraser,
  Undo,
  Redo,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  GraduationCap,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// Interfaces
interface Note {
  id: string
  title: string
  content: string
  ai_summary: string | null
  created_at: string
}

interface BrainDocument {
  id: string
  file_name: string
  category: string
  processed: boolean
}

interface Citation {
  fileName: string
  pageNumber?: number
  contentSnippet: string
  confidence: number
}

interface Flashcard {
  front: string
  back: string
}

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface VivaQuestion {
  question: string
  answer: string
  explanation: string
}

interface InterviewQuestion {
  question: string
  idealAnswer: string
  category: string
  difficulty: string
}

export default function NotesPage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // State Management
  const [notes, setNotes] = useState<Note[]>([])
  const [documents, setDocuments] = useState<BrainDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  // Workspace Note
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Unified Source Selection
  const [selectedNotes, setSelectedNotes] = useState<Record<string, boolean>>({})
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({})

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Editor Ref
  const editorRef = useRef<HTMLDivElement>(null)

  // AI Workspace Panel State
  const [studyTab, setStudyTab] = useState<'summary' | 'flashcards' | 'quiz' | 'mcqs' | 'viva' | 'interview'>('summary')
  const [expandedCitations, setExpandedCitations] = useState(false)

  // AI Content Cache (Current Note assets)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryCitations, setSummaryCitations] = useState<Citation[]>([])

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [flashcardCitations, setFlashcardCitations] = useState<Citation[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizCitations, setQuizCitations] = useState<Citation[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [showQuizResults, setShowQuizResults] = useState(false)

  const [mcqQuestions, setMcqQuestions] = useState<QuizQuestion[]>([])
  const [mcqCitations, setMcqCitations] = useState<Citation[]>([])
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({})
  const [showMcqResults, setShowMcqResults] = useState(false)

  const [vivaQuestions, setVivaQuestions] = useState<VivaQuestion[]>([])
  const [vivaCitations, setVivaCitations] = useState<Citation[]>([])
  const [revealedViva, setRevealedViva] = useState<Record<number, boolean>>({})

  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([])
  const [interviewCitations, setInterviewCitations] = useState<Citation[]>([])
  const [revealedInterview, setRevealedInterview] = useState<Record<number, boolean>>({})

  // 1. Initial Load Notes & Documents
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Load Notes
          const { data: notesData, error: notesError } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false })

          if (notesError) {
            if (notesError.code === '42P01') {
              setDbError('Database tables not yet migrated. Local storage fallback activated.')
              loadLocalStorageFallback()
            } else {
              setDbError(notesError.message)
            }
          } else if (notesData) {
            setNotes(notesData as Note[])
            if (notesData.length > 0) {
              loadNoteIntoWorkspace(notesData[0] as Note)
            } else {
              handleNewNote()
            }
          }

          // Load Ingested Brain Documents
          const { data: docsData } = await supabase
            .from('brain_documents')
            .select('id, file_name, category, processed')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (docsData) {
            setDocuments(docsData as BrainDocument[])
          }
        } else {
          loadLocalStorageFallback()
        }
      } catch (err) {
        console.error('Failed to load initial data:', err)
        loadLocalStorageFallback()
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // Sync contentEditable content only when the activeNote shifts
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = activeNote?.content || ''
    }
  }, [activeNote])

  const loadLocalStorageFallback = () => {
    const saved = localStorage.getItem('campusos-notes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Note[]
        setNotes(parsed)
        if (parsed.length > 0) {
          loadNoteIntoWorkspace(parsed[0])
        } else {
          handleNewNote()
        }
      } catch {
        setNotes([])
        handleNewNote()
      }
    } else {
      const mockNotes: Note[] = [
        {
          id: 'mock-1',
          title: 'CS 101: Big O Complexity',
          content: '<h1>Big O Notation</h1><p>Big O notation describes the performance or complexity of an algorithm.</p><h2>Common Complexities</h2><ul><li><b>O(1)</b>: Constant time</li><li><b>O(log n)</b>: Logarithmic time (e.g. Binary Search)</li><li><b>O(n)</b>: Linear time</li><li><b>O(n^2)</b>: Quadratic time (e.g. Bubble Sort)</li></ul>',
          ai_summary: '### Core Big O Summary\n- **Algorithm Analysis**: Explains worst-case runtimes relative to input size growth.\n- **Benchmarks**: Compares O(log n) efficiency to O(n^2) nested execution limits.',
          created_at: new Date().toISOString()
        }
      ]
      setNotes(mockNotes)
      localStorage.setItem('campusos-notes', JSON.stringify(mockNotes))
      loadNoteIntoWorkspace(mockNotes[0])
    }
  }

  const loadNoteIntoWorkspace = (note: Note) => {
    setActiveNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setEditorMode('write')

    // Clean Workspace states
    setAiSummary(note.ai_summary)
    setSummaryCitations([])
    setFlashcards([])
    setFlashcardCitations([])
    setQuizQuestions([])
    setQuizCitations([])
    setQuizAnswers({})
    setShowQuizResults(false)
    setMcqQuestions([])
    setMcqCitations([])
    setMcqAnswers({})
    setShowMcqResults(false)
    setVivaQuestions([])
    setVivaCitations([])
    setRevealedViva({})
    setInterviewQuestions([])
    setInterviewCitations([])
    setRevealedInterview({})

    // Load persistent assets from Supabase note_generations
    if (!note.id.startsWith('mock-')) {
      loadGenerationsFromDatabase(note.id)
    }
  }

  const loadGenerationsFromDatabase = async (noteId: string) => {
    try {
      const { data, error } = await supabase
        .from('note_generations')
        .select('type, content, citations')
        .eq('note_id', noteId)

      interface SupabaseGenerationRecord {
        type: string
        content: {
          summary?: string
          flashcards?: Flashcard[]
          questions?: unknown[]
        }
        citations?: Citation[]
      }

      if (!error && data) {
        const typedData = data as unknown as SupabaseGenerationRecord[]
        typedData.forEach((gen) => {
          if (gen.type === 'summary') {
            setAiSummary(gen.content.summary || '')
            setSummaryCitations(gen.citations || [])
          } else if (gen.type === 'flashcards') {
            setFlashcards(gen.content.flashcards || [])
            setFlashcardCitations(gen.citations || [])
          } else if (gen.type === 'quiz') {
            setQuizQuestions((gen.content.questions as QuizQuestion[]) || [])
            setQuizCitations(gen.citations || [])
          } else if (gen.type === 'mcqs') {
            setMcqQuestions((gen.content.questions as QuizQuestion[]) || [])
            setMcqCitations(gen.citations || [])
          } else if (gen.type === 'viva') {
            setVivaQuestions((gen.content.questions as VivaQuestion[]) || [])
            setVivaCitations(gen.citations || [])
          } else if (gen.type === 'interview') {
            setInterviewQuestions((gen.content.questions as InterviewQuestion[]) || [])
            setInterviewCitations(gen.citations || [])
          }
        })
      }
    } catch (err) {
      console.warn('Failed to load note generations from db:', err)
    }
  }

  const saveGenerationToDatabase = async (type: string, content: unknown, citations: unknown) => {
    if (!activeNote || activeNote.id.startsWith('mock-') || dbError) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Clean up past generation of this type
      await supabase
        .from('note_generations')
        .delete()
        .eq('note_id', activeNote.id)
        .eq('type', type)

      // Save new generation
      await supabase
        .from('note_generations')
        .insert({
          note_id: activeNote.id,
          user_id: user.id,
          type,
          content,
          citations
        })
    } catch (err) {
      console.warn('Failed to save generation to database:', err)
    }
  }

  const handleNewNote = () => {
    setActiveNote(null)
    setNoteTitle('Untitled Study Note')
    setNoteContent('<h1>Untitled Study Note</h1><p>Start writing visual rich text notes...</p>')
    setEditorMode('write')

    setAiSummary(null)
    setSummaryCitations([])
    setFlashcards([])
    setFlashcardCitations([])
    setQuizQuestions([])
    setQuizCitations([])
    setQuizAnswers({})
    setShowQuizResults(false)
    setMcqQuestions([])
    setMcqCitations([])
    setMcqAnswers({})
    setShowMcqResults(false)
    setVivaQuestions([])
    setVivaCitations([])
    setRevealedViva({})
    setInterviewQuestions([])
    setInterviewCitations([])
    setRevealedInterview({})

    if (editorRef.current) {
      editorRef.current.innerHTML = '<h1>Untitled Study Note</h1><p>Start writing visual rich text notes...</p>'
    }
  }

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return
    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        title: noteTitle,
        content: noteContent,
        ai_summary: aiSummary
      }

      if (user && !dbError) {
        if (activeNote && !activeNote.id.startsWith('mock-')) {
          const { data, error } = await supabase
            .from('notes')
            .update(payload)
            .eq('id', activeNote.id)
            .select()
            .single()

          if (!error && data) {
            setNotes(prev => prev.map(n => n.id === activeNote.id ? (data as Note) : n))
            setActiveNote(data as Note)
          } else {
            throw new Error(error?.message || 'Database update error')
          }
        } else {
          const { data, error } = await supabase
            .from('notes')
            .insert({ ...payload, user_id: user.id })
            .select()
            .single()

          if (!error && data) {
            const newNote = data as Note
            setNotes(prev => [newNote, ...prev])
            setActiveNote(newNote)
          } else {
            throw new Error(error?.message || 'Database insert error')
          }
        }
      } else {
        // Fallback local storage saving
        const mockId = activeNote?.id || `mock-${Date.now()}`
        const updatedPayload = { ...payload, id: mockId, created_at: activeNote?.created_at || new Date().toISOString() }
        let newNotesList = [...notes]

        if (activeNote) {
          newNotesList = newNotesList.map(n => n.id === activeNote.id ? updatedPayload : n)
        } else {
          newNotesList = [updatedPayload, ...newNotesList]
        }

        setNotes(newNotesList)
        localStorage.setItem('campusos-notes', JSON.stringify(newNotesList))
        setActiveNote(updatedPayload)
      }
    } catch (err) {
      console.error('Note save failed:', err)
      alert('Failed to save study notes to cloud.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      if (!id.startsWith('mock-') && !dbError) {
        await supabase.from('notes').delete().eq('id', id)
      }

      const updatedNotes = notes.filter(n => n.id !== id)
      setNotes(updatedNotes)
      localStorage.setItem('campusos-notes', JSON.stringify(updatedNotes))

      if (activeNote?.id === id) {
        if (updatedNotes.length > 0) {
          loadNoteIntoWorkspace(updatedNotes[0])
        } else {
          handleNewNote()
        }
      }
    } catch (err) {
      console.error(err)
      alert('Failed to delete note.')
    }
  }

  // 2. Ingestion Upload handlers
  const handleFileUpload = async (file: File) => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'notes') // Save to brain files

      const res = await fetch('/api/brain/ingest', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'File Ingestion failed.')
      }

      // Success, refresh Ingested Sources list
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: docsData } = await supabase
          .from('brain_documents')
          .select('id, file_name, category, processed')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (docsData) {
          setDocuments(docsData as BrainDocument[])
          // Check this uploaded file by default for generating study metrics
          if (docsData.length > 0) {
            setSelectedDocs(prev => ({ ...prev, [docsData[0].id]: true }))
          }
        }
      }
      alert(`"${file.name}" has been successfully parsed and ingested into your Academic Brain knowledge base.`)
    } catch (err) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : String(err)
      alert(`Ingestion failed: ${errMsg}`)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  // 3. Visual Rich Text Toolbar Commands
  const executeFormatCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      setNoteContent(editorRef.current.innerHTML)
    }
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setNoteContent(editorRef.current.innerHTML)
    }
  }

  // 4. AI Generation Grounded Actions
  const getSelectedSourcesPayload = () => {
    const noteIds = Object.keys(selectedNotes).filter(id => selectedNotes[id])
    const docIds = Object.keys(selectedDocs).filter(id => selectedDocs[id])
    return { noteIds, docIds }
  }

  const handleSummarize = () => {
    const { noteIds, docIds } = getSelectedSourcesPayload()
    setAiSummary(null)
    setSummaryCitations([])

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'summarize',
            noteIds,
            docIds,
            currentNoteText: noteContent
          })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setAiSummary(data.summary)
        setSummaryCitations(data.citations || [])
        saveGenerationToDatabase('summary', { summary: data.summary }, data.citations)
      } catch (err) {
        console.error('Summary error:', err)
        setAiSummary('⚠️ Failed to compile grounded summary. Check API configuration.')
      }
    })
  }

  const handleGenerateFlashcards = () => {
    const { noteIds, docIds } = getSelectedSourcesPayload()
    setFlashcards([])
    setFlashcardCitations([])
    setCurrentCardIndex(0)
    setIsCardFlipped(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'flashcards',
            noteIds,
            docIds,
            currentNoteText: noteContent
          })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setFlashcards(data.flashcards || [])
        setFlashcardCitations(data.citations || [])
        saveGenerationToDatabase('flashcards', { flashcards: data.flashcards }, data.citations)
      } catch (err) {
        console.error(err)
        alert('Flashcards generation failed.')
      }
    })
  }

  const handleGenerateQuiz = () => {
    const { noteIds, docIds } = getSelectedSourcesPayload()
    setQuizQuestions([])
    setQuizCitations([])
    setQuizAnswers({})
    setShowQuizResults(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'quiz',
            noteIds,
            docIds,
            currentNoteText: noteContent
          })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setQuizQuestions(data.questions || [])
        setQuizCitations(data.citations || [])
        saveGenerationToDatabase('quiz', { questions: data.questions }, data.citations)
      } catch (err) {
        console.error(err)
        alert('Quiz generation failed.')
      }
    })
  }

  const handleGenerateMCQs = () => {
    const { noteIds, docIds } = getSelectedSourcesPayload()
    setMcqQuestions([])
    setMcqCitations([])
    setMcqAnswers({})
    setShowMcqResults(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mcqs',
            noteIds,
            docIds,
            currentNoteText: noteContent
          })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setMcqQuestions(data.questions || [])
        setMcqCitations(data.citations || [])
        saveGenerationToDatabase('mcqs', { questions: data.questions }, data.citations)
      } catch (err) {
        console.error(err)
        alert('MCQ generation failed.')
      }
    })
  }

  const handleGenerateViva = () => {
    const { noteIds, docIds } = getSelectedSourcesPayload()
    setVivaQuestions([])
    setVivaCitations([])
    setRevealedViva({})

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'viva',
            noteIds,
            docIds,
            currentNoteText: noteContent
          })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setVivaQuestions(data.questions || [])
        setVivaCitations(data.citations || [])
        saveGenerationToDatabase('viva', { questions: data.questions }, data.citations)
      } catch (err) {
        console.error(err)
        alert('Viva questions generation failed.')
      }
    })
  }

  const handleGenerateInterview = () => {
    const { noteIds, docIds } = getSelectedSourcesPayload()
    setInterviewQuestions([])
    setInterviewCitations([])
    setRevealedInterview({})

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'interview',
            noteIds,
            docIds,
            currentNoteText: noteContent
          })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setInterviewQuestions(data.questions || [])
        setInterviewCitations(data.citations || [])
        saveGenerationToDatabase('interview', { questions: data.questions }, data.citations)
      } catch (err) {
        console.error(err)
        alert('Interview preparation generation failed.')
      }
    })
  }

  const getActiveCitations = (): Citation[] => {
    switch (studyTab) {
      case 'summary': return summaryCitations
      case 'flashcards': return flashcardCitations
      case 'quiz': return quizCitations
      case 'mcqs': return mcqCitations
      case 'viva': return vivaCitations
      case 'interview': return interviewCitations
      default: return []
    }
  }

  const renderMarkdown = (markdownText: string) => {
    if (!markdownText) return null
    const lines = markdownText.split('\n')
    const renderedElements: React.ReactNode[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line === '') {
        renderedElements.push(<div key={`empty-${i}`} className="h-1.5" />)
        continue
      }
      if (line.startsWith('# ')) {
        renderedElements.push(<h1 key={i} className="text-sm font-bold text-[var(--text-primary)] mt-3 mb-1.5 border-b border-white/5 pb-0.5">{line.slice(2)}</h1>)
      } else if (line.startsWith('## ')) {
        renderedElements.push(<h2 key={i} className="text-xs font-semibold text-[var(--text-primary)] mt-2 mb-1">{line.slice(3)}</h2>)
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        renderedElements.push(<p key={i} className="text-[11px] text-[var(--text-secondary)] pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-cyan-400 my-0.5">{line.slice(2)}</p>)
      } else {
        renderedElements.push(<p key={i} className="text-[11px] text-[var(--text-secondary)] leading-relaxed my-0.5">{line}</p>)
      }
    }
    return renderedElements
  }

  const activeCitations = getActiveCitations()
  const checkedSourcesCount = 
    Object.values(selectedNotes).filter(Boolean).length +
    Object.values(selectedDocs).filter(Boolean).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 select-text">
      
      {/* Title Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col gap-1 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              <BookOpen size={18} />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Smart Notes & Study Hub
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Write structured study notes and index documents directly into your Academic Brain to generate citations-backed practice materials.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Notes & Document Explorer (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Note List Explorer */}
          <GlassCard className="p-4 border-[var(--border-glass)]/70 flex flex-col gap-3 max-h-[45vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border-glass)] pb-2 select-none">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">My Study Notes</h2>
              <Button
                onClick={handleNewNote}
                className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center p-0 hover:bg-white/10 hover:text-cyan-400 transition-colors"
                title="New Note"
              >
                <Plus size={11} />
              </Button>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col gap-2 justify-center items-center">
                <Loader2 className="animate-spin text-cyan-400" size={16} />
                <span className="text-[9px] text-[var(--text-muted)] font-semibold">Loading Notes...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5 max-h-[30vh]">
                {notes.map(note => {
                  const isActive = activeNote?.id === note.id
                  const isChecked = selectedNotes[note.id] ?? false
                  return (
                    <div
                      key={note.id}
                      onClick={() => loadNoteIntoWorkspace(note)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white/5 border-[var(--accent-blue)]/50 shadow-md'
                          : 'border-white/5 bg-black/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        {/* Source selector checkbox */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedNotes(prev => ({ ...prev, [note.id]: !prev[note.id] }))
                          }}
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-cyan-500 border-cyan-400 text-black' 
                              : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                          {isChecked && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                        </div>
                        <span className={`text-[11px] font-semibold truncate ${isActive ? 'text-cyan-400' : 'text-[var(--text-secondary)]'}`}>
                          {note.title}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
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

          {/* Academic Brain Material Uploader */}
          <GlassCard className="p-4 border-[var(--border-glass)]/70 space-y-3">
            <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-glass)] pb-2 select-none">
              Add Study Material
            </h2>

            {/* Drag & Drop uploader */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                dragOver 
                  ? 'border-emerald-400 bg-emerald-500/5' 
                  : 'border-white/10 bg-black/10 hover:border-white/20'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.pptx,.txt"
                className="hidden"
              />
              {uploadingFile ? (
                <>
                  <Loader2 className="animate-spin text-emerald-400" size={18} />
                  <span className="text-[10px] font-bold text-emerald-400">Extracting Knowledge...</span>
                </>
              ) : (
                <>
                  <FileUp size={18} className="text-[var(--text-secondary)]" />
                  <div className="space-y-0.5 select-none">
                    <p className="text-[10px] font-bold text-[var(--text-primary)]">Drag & Drop Study Files</p>
                    <p className="text-[8px] text-[var(--text-muted)]">PDF, DOCX, PPTX, TXT</p>
                  </div>
                </>
              )}
            </div>

            {/* Document checklist (Sources) */}
            <div className="space-y-2 mt-2">
              <h3 className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] select-none">Brain Documents</h3>
              {documents.length === 0 ? (
                <p className="text-[9px] text-[var(--text-muted)] leading-relaxed italic">No materials uploaded yet. Drop files above to parse them into your Academic Brain.</p>
              ) : (
                <div className="space-y-1.5 max-h-[22vh] overflow-y-auto custom-scrollbar pr-0.5">
                  {documents.map((doc) => {
                    const isChecked = selectedDocs[doc.id] ?? false
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocs(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.02] border border-transparent hover:border-white/5 cursor-pointer text-[10px] font-semibold text-[var(--text-secondary)]"
                      >
                        <div 
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isChecked 
                              ? 'bg-emerald-500 border-emerald-400 text-black' 
                              : 'border-white/20'
                          }`}
                        >
                          {isChecked && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                        </div>
                        <span className="truncate flex-1 select-all">{doc.file_name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </GlassCard>

        </div>

        {/* Center Column: Editor Workspace (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <GlassCard className="p-5 flex flex-col gap-4 min-h-[60vh] border-white/5 bg-[#12131A]/60">
            
            {/* Toolbar Header */}
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-glass)] pb-2 select-none">
                <div className="flex items-center bg-white/5 border border-[var(--border-glass)] rounded-lg p-0.5">
                  <button
                    onClick={() => setEditorMode('write')}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      editorMode === 'write' ? 'bg-white/10 text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Write Note
                  </button>
                  <button
                    onClick={() => setEditorMode('preview')}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      editorMode === 'preview' ? 'bg-white/10 text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Preview HTML
                  </button>
                </div>

                <Button
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold h-7 px-3 cursor-pointer text-[var(--text-primary)] rounded-lg shadow-sm"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save Note
                </Button>
              </div>

              {/* Title input */}
              <input
                type="text"
                aria-label="Note Title"
                placeholder="Note Title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="bg-transparent border-0 border-b border-transparent focus:border-[var(--border-glass)] outline-none text-sm font-bold text-[var(--text-primary)] px-1 py-1 w-full select-text placeholder-[var(--text-muted)]"
              />
            </div>

            {/* Rich Editor Area */}
            {editorMode === 'write' ? (
              <div className="flex-1 flex flex-col gap-2 min-h-[45vh]">
                
                {/* Visual rich text buttons toolbar */}
                <div className="flex items-center gap-1.5 bg-[#090a0f] border border-white/5 rounded-xl p-1.5 select-none overflow-x-auto scrollbar-none shadow-inner">
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('bold')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Bold"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('italic')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Italic"
                  >
                    <Italic size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('formatBlock', '<h1>')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer font-bold"
                    title="H1 Heading"
                  >
                    <Heading size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('insertUnorderedList')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Unordered List"
                  >
                    <List size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('insertOrderedList')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Ordered List"
                  >
                    <ListOrdered size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('formatBlock', '<blockquote>')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Blockquote"
                  >
                    <Quote size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('removeFormat')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Clear Formatting"
                  >
                    <Eraser size={13} />
                  </button>

                  <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

                  <button
                    type="button"
                    onClick={() => executeFormatCommand('undo')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Undo"
                  >
                    <Undo size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeFormatCommand('redo')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    title="Redo"
                  >
                    <Redo size={13} />
                  </button>
                </div>

                {/* contentEditable Container */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  className="w-full flex-1 min-h-[40vh] bg-black/15 border border-[var(--border-glass)] focus:border-cyan-500 rounded-xl p-4 text-xs text-[var(--text-primary)] leading-relaxed overflow-y-auto custom-scrollbar select-text outline-none prose prose-invert"
                  style={{ minHeight: '350px' }}
                />

              </div>
            ) : (
              // HTML preview pane
              <div 
                className="w-full flex-1 min-h-[45vh] max-h-[55vh] overflow-y-auto bg-[#090a0f] border border-[var(--border-glass)] rounded-xl p-4 custom-scrollbar select-text prose prose-invert text-xs leading-relaxed text-[var(--text-secondary)]"
                dangerouslySetInnerHTML={{ __html: noteContent }}
              />
            )}
          </GlassCard>
        </div>

        {/* Right Column: AI RAG workspace (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <GlassCard className="p-5 flex flex-col gap-4 min-h-[60vh] border-white/5 bg-[#12131A]/60">
            
            {/* AI tab selector bar */}
            <div className="flex items-center border-b border-[var(--border-glass)] pb-2 overflow-x-auto gap-1 scrollbar-none select-none">
              {(['summary', 'flashcards', 'quiz', 'mcqs', 'viva', 'interview'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStudyTab(tab)}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                    studyTab === tab
                      ? 'bg-white/5 border-[var(--border-glass-active)] text-cyan-400 shadow-sm'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {tab === 'quiz' ? 'Quiz' : tab === 'mcqs' ? 'MCQs' : tab}
                </button>
              ))}
            </div>

            {/* AI Source text indicator banner */}
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between text-[9px] select-none text-[var(--text-secondary)] font-semibold">
              <span className="truncate">Context: {checkedSourcesCount > 0 ? `${checkedSourcesCount} selected source(s)` : 'Active Workspace Note'}</span>
              <Sparkles size={11} className="text-cyan-400 shrink-0 ml-1" />
            </div>

            {/* Study Tab content layouts */}
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* TAB 1: SUMMARY */}
              {studyTab === 'summary' && (
                <div className="flex-1 flex flex-col gap-4 select-text">
                  {isPending && !aiSummary ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="animate-spin text-cyan-400" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Summarizing note key topics...</span>
                    </div>
                  ) : aiSummary ? (
                    <div className="flex-1 overflow-y-auto max-h-[38vh] pr-1 custom-scrollbar text-xs">
                      {renderMarkdown(aiSummary)}
                      <Button
                        onClick={handleSummarize}
                        disabled={isPending}
                        className="w-full mt-4 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold border border-white/10 h-8 select-none cursor-pointer rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Regenerate Summary
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <FileText size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">No AI summary generated for this note yet.</span>
                      <Button
                        onClick={handleSummarize}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-cyan-500 text-black text-[10px] font-bold shadow-lg border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Generate Summary
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FLASHCARDS */}
              {studyTab === 'flashcards' && (
                <div className="flex-1 flex flex-col gap-4 select-none">
                  {isPending && flashcards.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="animate-spin text-cyan-400" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Generating study cards...</span>
                    </div>
                  ) : flashcards.length > 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      {/* Flippable card */}
                      <div
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="w-full h-44 cursor-pointer relative"
                        style={{ perspective: '1000px' }}
                      >
                        <motion.div
                          className="w-full h-full rounded-xl border border-[var(--border-glass)] bg-black/40 flex items-center justify-center p-5 text-center shadow-lg relative"
                          animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          {/* Front side */}
                          <div
                            className="absolute inset-0 p-5 flex flex-col justify-center items-center select-text"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <Bookmark size={14} className="text-cyan-400 mb-2" />
                            <p className="text-xs font-semibold text-[var(--text-primary)] leading-relaxed select-text">
                              {flashcards[currentCardIndex]?.front}
                            </p>
                            <span className="text-[8px] text-[var(--text-muted)] mt-4">Click to flip</span>
                          </div>

                          {/* Back side */}
                          <div
                            className="absolute inset-0 p-5 flex flex-col justify-center items-center bg-black/85 rounded-xl select-text"
                            style={{ 
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)' 
                            }}
                          >
                            <CheckCircle size={14} className="text-emerald-400 mb-2" />
                            <p className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed select-text">
                              {flashcards[currentCardIndex]?.back}
                            </p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Navigator */}
                      <div className="flex items-center gap-4 text-xs font-bold select-none">
                        <Button
                          disabled={currentCardIndex === 0}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev - 1)
                            setIsCardFlipped(false)
                          }}
                          className="p-1 h-6 w-6 rounded bg-white/5 border border-white/10 flex items-center justify-center"
                        >
                          <ChevronLeft size={14} />
                        </Button>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {currentCardIndex + 1} / {flashcards.length}
                        </span>
                        <Button
                          disabled={currentCardIndex === flashcards.length - 1}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev + 1)
                            setIsCardFlipped(false)
                          }}
                          className="p-1 h-6 w-6 rounded bg-white/5 border border-white/10 flex items-center justify-center"
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>

                      <Button
                        onClick={handleGenerateFlashcards}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold border border-white/10 h-7 rounded-lg mt-1"
                      >
                        <Sparkles size={11} /> Regenerate Cards
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <Bookmark size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">Create active recall study decks for spaced repetition.</span>
                      <Button
                        onClick={handleGenerateFlashcards}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-cyan-500 text-black text-[10px] font-bold shadow-lg border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Generate Flashcards
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: QUIZ */}
              {studyTab === 'quiz' && (
                <div className="flex-1 flex flex-col gap-4 select-text">
                  {isPending && quizQuestions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="animate-spin text-cyan-400" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Generating practice quiz...</span>
                    </div>
                  ) : quizQuestions.length > 0 ? (
                    <div className="flex-1 overflow-y-auto max-h-[38vh] pr-1 custom-scrollbar space-y-4">
                      {quizQuestions.map((q, qIdx) => {
                        const isCorrectSelected = quizAnswers[qIdx] === q.correctIndex

                        return (
                          <div key={qIdx} className="p-3 bg-black/25 border border-white/5 rounded-xl space-y-2 text-xs">
                            <p className="font-bold text-[var(--text-primary)]">Q{qIdx + 1}: {q.question}</p>
                            
                            <div className="grid grid-cols-1 gap-1.5 pt-1.5 select-none">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = quizAnswers[qIdx] === optIdx
                                const isCorrect = q.correctIndex === optIdx

                                let optBg = 'bg-white/5 hover:bg-white/10 border-white/5'
                                if (showQuizResults) {
                                  if (isCorrect) optBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                                  else if (isSelected) optBg = 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold'
                                } else if (isSelected) {
                                  optBg = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-semibold'
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => !showQuizResults && setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                    className={`w-full text-left p-2 rounded-lg border text-[10px] transition-all cursor-pointer ${optBg}`}
                                  >
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>

                            {showQuizResults && (
                              <div className={`mt-2 p-2 rounded-lg text-[9px] leading-relaxed flex items-start gap-1.5 ${
                                isCorrectSelected ? 'bg-emerald-500/5 text-emerald-400/90' : 'bg-rose-500/5 text-rose-400/90'
                              }`}>
                                {isCorrectSelected ? <CheckCircle size={10} className="shrink-0 mt-0.5 text-emerald-400" /> : <XCircle size={10} className="shrink-0 mt-0.5 text-rose-400" />}
                                <div>
                                  <strong>{isCorrectSelected ? 'Correct!' : 'Incorrect.'}</strong> {q.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {!showQuizResults ? (
                          <Button
                            onClick={() => setShowQuizResults(true)}
                            className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-bold h-8 rounded-lg"
                          >
                            Grade Quiz
                          </Button>
                        ) : (
                          <Button
                            onClick={handleGenerateQuiz}
                            disabled={isPending}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold border border-white/10 h-8 rounded-lg"
                          >
                            New Quiz
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <HelpCircle size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">Generate 5 multiple choice questions matching core coursework facts.</span>
                      <Button
                        onClick={handleGenerateQuiz}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-cyan-500 text-black text-[10px] font-bold shadow-lg border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Generate Quiz
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MCQs */}
              {studyTab === 'mcqs' && (
                <div className="flex-1 flex flex-col gap-4 select-text">
                  {isPending && mcqQuestions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="animate-spin text-cyan-400" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Generating 10 comprehensive MCQs...</span>
                    </div>
                  ) : mcqQuestions.length > 0 ? (
                    <div className="flex-1 overflow-y-auto max-h-[38vh] pr-1 custom-scrollbar space-y-4">
                      {mcqQuestions.map((q, qIdx) => {
                        const isCorrectSelected = mcqAnswers[qIdx] === q.correctIndex

                        return (
                          <div key={qIdx} className="p-3 bg-black/25 border border-white/5 rounded-xl space-y-2 text-xs">
                            <p className="font-bold text-[var(--text-primary)]">Q{qIdx + 1}: {q.question}</p>
                            
                            <div className="grid grid-cols-1 gap-1.5 pt-1.5 select-none">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = mcqAnswers[qIdx] === optIdx
                                const isCorrect = q.correctIndex === optIdx

                                let optBg = 'bg-white/5 hover:bg-white/10 border-white/5'
                                if (showMcqResults) {
                                  if (isCorrect) optBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                                  else if (isSelected) optBg = 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold'
                                } else if (isSelected) {
                                  optBg = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-semibold'
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => !showMcqResults && setMcqAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                    className={`w-full text-left p-2 rounded-lg border text-[10px] transition-all cursor-pointer ${optBg}`}
                                  >
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>

                            {showMcqResults && (
                              <div className={`mt-2 p-2 rounded-lg text-[9px] leading-relaxed flex items-start gap-1.5 ${
                                isCorrectSelected ? 'bg-emerald-500/5 text-emerald-400/90' : 'bg-rose-500/5 text-rose-400/90'
                              }`}>
                                {isCorrectSelected ? <CheckCircle size={10} className="shrink-0 mt-0.5 text-emerald-400" /> : <XCircle size={10} className="shrink-0 mt-0.5 text-rose-400" />}
                                <div>
                                  <strong>{isCorrectSelected ? 'Correct!' : 'Incorrect.'}</strong> {q.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {!showMcqResults ? (
                          <Button
                            onClick={() => setShowMcqResults(true)}
                            className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-bold h-8 rounded-lg"
                          >
                            Grade MCQs
                          </Button>
                        ) : (
                          <Button
                            onClick={handleGenerateMCQs}
                            disabled={isPending}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold border border-white/10 h-8 rounded-lg"
                          >
                            Regenerate 10 MCQs
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <FileSpreadsheet size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">Generate 10 comprehensive MCQs for active exam self-assessment.</span>
                      <Button
                        onClick={handleGenerateMCQs}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-cyan-500 text-black text-[10px] font-bold shadow-lg border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Generate 10 MCQs
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: VIVA QUESTIONS */}
              {studyTab === 'viva' && (
                <div className="flex-1 flex flex-col gap-4 select-text">
                  {isPending && vivaQuestions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="animate-spin text-cyan-400" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Formulating verbal viva challenges...</span>
                    </div>
                  ) : vivaQuestions.length > 0 ? (
                    <div className="flex-1 overflow-y-auto max-h-[38vh] pr-1 custom-scrollbar space-y-4">
                      {vivaQuestions.map((v, vIdx) => {
                        const isRevealed = revealedViva[vIdx] ?? false
                        return (
                          <div key={vIdx} className="p-3 bg-black/25 border border-white/5 rounded-xl space-y-2 text-xs">
                            <p className="font-bold text-[var(--text-primary)]">Q{vIdx + 1}: {v.question}</p>
                            
                            {!isRevealed ? (
                              <button
                                onClick={() => setRevealedViva(prev => ({ ...prev, [vIdx]: true }))}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-white rounded-lg border border-white/10 text-[9px] font-bold transition-all cursor-pointer"
                              >
                                Reveal Ideal Answer & Explanation
                              </button>
                            ) : (
                              <div className="space-y-1.5 pt-1.5 animate-fadeIn select-text text-[10px]">
                                <div className="p-2 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-lg">
                                  <strong>Ideal Response:</strong> {v.answer}
                                </div>
                                <div className="p-2 bg-white/5 text-[var(--text-secondary)] rounded-lg">
                                  <strong>Examiner Notes:</strong> {v.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <Button
                        onClick={handleGenerateViva}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold border border-white/10 h-8 rounded-lg"
                      >
                        Regenerate Viva Questions
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <GraduationCap size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">Simulate verbal exams. Generate challenging questions asked by lab or course examiners.</span>
                      <Button
                        onClick={handleGenerateViva}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-cyan-500 text-black text-[10px] font-bold shadow-lg border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Generate Viva
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: INTERVIEW QUESTIONS */}
              {studyTab === 'interview' && (
                <div className="flex-1 flex flex-col gap-4 select-text">
                  {isPending && interviewQuestions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="animate-spin text-cyan-400" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Formulating interview preparation assets...</span>
                    </div>
                  ) : interviewQuestions.length > 0 ? (
                    <div className="flex-1 overflow-y-auto max-h-[38vh] pr-1 custom-scrollbar space-y-4">
                      {interviewQuestions.map((i, iIdx) => {
                        const isRevealed = revealedInterview[iIdx] ?? false
                        
                        // Style difficulty pills
                        let difficultyColor = 'text-green-400 bg-green-500/10 border-green-500/20'
                        if (i.difficulty.toLowerCase() === 'medium') {
                          difficultyColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                        } else if (i.difficulty.toLowerCase() === 'hard') {
                          difficultyColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                        }

                        return (
                          <div key={iIdx} className="p-3 bg-black/25 border border-white/5 rounded-xl space-y-2.5 text-xs">
                            
                            {/* Question meta */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[8px] font-bold uppercase tracking-wider">
                                {i.category}
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${difficultyColor}`}>
                                {i.difficulty}
                              </span>
                            </div>

                            <p className="font-bold text-[var(--text-primary)]">Q{iIdx + 1}: {i.question}</p>
                            
                            {!isRevealed ? (
                              <button
                                onClick={() => setRevealedInterview(prev => ({ ...prev, [iIdx]: true }))}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-white rounded-lg border border-white/10 text-[9px] font-bold transition-all cursor-pointer"
                              >
                                Reveal Ideal Answer Sheet
                              </button>
                            ) : (
                              <div className="pt-1.5 animate-fadeIn select-text text-[10px]">
                                <div className="p-2.5 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-lg leading-relaxed">
                                  <strong>Ideal Response Structure:</strong> {i.idealAnswer}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <Button
                        onClick={handleGenerateInterview}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold border border-white/10 h-8 rounded-lg"
                      >
                        Regenerate Interview Prep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <GraduationCap size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">Generate industry-style technical and behavioral questions grounded in your course materials.</span>
                      <Button
                        onClick={handleGenerateInterview}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-cyan-500 text-black text-[10px] font-bold shadow-lg border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Generate Interview Prep
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footnote citations overlay section */}
            {activeCitations.length > 0 && (
              <div className="border-t border-[var(--border-glass)]/60 pt-3 select-none mt-auto">
                <button
                  onClick={() => setExpandedCitations(!expandedCitations)}
                  className="w-full flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] hover:text-cyan-400 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <ShieldAlert size={10} className="text-cyan-400 shrink-0" />
                    Source Citations ({activeCitations.length} cited)
                  </span>
                  {expandedCitations ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>

                <AnimatePresence>
                  {expandedCitations && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2.5 max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar select-text text-[9px]">
                        {activeCitations.map((cit, idx) => (
                          <div key={idx} className="p-2 bg-black/45 border border-white/5 rounded-lg space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-cyan-400 truncate max-w-[160px]">
                                [{idx + 1}] {cit.fileName} {cit.pageNumber ? `(Page ${cit.pageNumber})` : ''}
                              </span>
                              <span className="text-emerald-400 text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5">
                                {cit.confidence}% match
                              </span>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed italic bg-white/[0.01] p-1.5 rounded border border-white/5">
                              &ldquo;{cit.contentSnippet}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </GlassCard>
        </div>

      </div>

    </div>
  )
}

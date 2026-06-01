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
  ChevronUp,
  Eye,
  Maximize2,
  Minimize2,
  Command,
  AlignLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [isFocusMode, setIsFocusMode] = useState(false)

  // Unified Source Selection
  const [selectedNotes, setSelectedNotes] = useState<Record<string, boolean>>({})
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({})

  // File Ingestion State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Editor Ref
  const editorRef = useRef<HTMLDivElement>(null)

  // Slash Command Palette State
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })

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
          content: '<h1>Big O Notation</h1><p>Big O notation describes the performance or complexity of an algorithm.</p><h2>Common Runtimes</h2><ul><li><b>O(1)</b>: Constant time</li><li><b>O(log n)</b>: Logarithmic time (e.g. Binary Search)</li><li><b>O(n)</b>: Linear time</li><li><b>O(n^2)</b>: Quadratic time (e.g. Bubble Sort)</li></ul>',
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
      formData.append('category', 'notes')

      const res = await fetch('/api/brain/ingest', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'File Ingestion failed.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: docsData } = await supabase
          .from('brain_documents')
          .select('id, file_name, category, processed')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (docsData) {
          setDocuments(docsData as BrainDocument[])
          if (docsData.length > 0) {
            setSelectedDocs(prev => ({ ...prev, [docsData[0].id]: true }))
          }
        }
      }
    } catch (err) {
      console.error(err)
      alert('Ingestion failed.')
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

  // Slash commands trigger logic (Notion style)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/') {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setSlashMenuPosition({
          top: rect.top + window.scrollY + 20,
          left: rect.left + window.scrollX
        })
        setSlashMenuOpen(true)
      }
    } else if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      setSlashMenuOpen(false)
    }
  }

  const handleSlashCommandSelect = (command: string) => {
    setSlashMenuOpen(false)
    
    // Remove the trailing slash character
    if (editorRef.current) {
      const inner = editorRef.current.innerHTML
      if (inner.endsWith('/')) {
        editorRef.current.innerHTML = inner.slice(0, -1)
      }
    }

    // Execute appropriate command
    switch (command) {
      case 'h1':
        executeFormatCommand('formatBlock', '<h1>')
        break
      case 'h2':
        executeFormatCommand('formatBlock', '<h2>')
        break
      case 'bold':
        executeFormatCommand('bold')
        break
      case 'italic':
        executeFormatCommand('italic')
        break
      case 'bullet':
        executeFormatCommand('insertUnorderedList')
        break
      case 'number':
        executeFormatCommand('insertOrderedList')
        break
      case 'summary':
        handleSummarize()
        break
      case 'flashcards':
        handleGenerateFlashcards()
        break
      case 'quiz':
        handleGenerateQuiz()
        break
      default:
        break
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
        renderedElements.push(<div key={`empty-${i}`} className="h-2" />)
        continue
      }
      if (line.startsWith('# ')) {
        renderedElements.push(<h3 key={i} className="text-sm font-bold text-white mt-4 mb-2 border-b border-white/5 pb-1 font-heading">{line.slice(2)}</h3>)
      } else if (line.startsWith('## ')) {
        renderedElements.push(<h4 key={i} className="text-xs font-semibold text-white mt-3 mb-1 font-heading">{line.slice(3)}</h4>)
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        renderedElements.push(<p key={i} className="text-[11px] text-[var(--text-secondary)] pl-3.5 relative before:content-['•'] before:absolute before:left-0.5 before:text-[var(--accent-blue)] my-1 leading-normal">{line.slice(2)}</p>)
      } else {
        renderedElements.push(<p key={i} className="text-[11px] text-[var(--text-secondary)] leading-relaxed my-1">{line}</p>)
      }
    }
    return renderedElements
  }

  const activeCitations = getActiveCitations()
  const checkedSourcesCount = 
    Object.values(selectedNotes).filter(Boolean).length +
    Object.values(selectedDocs).filter(Boolean).length

  return (
    <div className="max-w-7xl mx-auto p-2 md:p-6 pb-20 select-text flex flex-col gap-6 relative">
      
      {/* Notion-style Slash Command Autocomplete popup */}
      <AnimatePresence>
        {slashMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            style={{ top: slashMenuPosition.top, left: slashMenuPosition.left }}
            className="absolute z-50 bg-[#0d0f14]/95 border border-[var(--border-glass-active)] rounded-xl p-1.5 shadow-2xl w-48 flex flex-col gap-0.5 backdrop-blur-xl"
          >
            <span className="text-[8.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1 select-none">Blocks</span>
            <button onClick={() => handleSlashCommandSelect('h1')} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs text-white hover:bg-white/5 cursor-pointer">
              <Heading size={12} className="text-cyan-400" /> Heading 1
            </button>
            <button onClick={() => handleSlashCommandSelect('h2')} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs text-white hover:bg-white/5 cursor-pointer">
              <Heading size={12} className="text-purple-400" /> Heading 2
            </button>
            <button onClick={() => handleSlashCommandSelect('bullet')} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs text-white hover:bg-white/5 cursor-pointer">
              <List size={12} className="text-amber-400" /> Bullet List
            </button>
            
            <div className="h-px bg-white/5 my-1" />
            <span className="text-[8.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1 select-none">AI Functions</span>
            <button onClick={() => handleSlashCommandSelect('summary')} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs text-white hover:bg-white/5 cursor-pointer">
              <Sparkles size={12} className="text-emerald-400" /> Summarize
            </button>
            <button onClick={() => handleSlashCommandSelect('flashcards')} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs text-white hover:bg-white/5 cursor-pointer">
              <GraduationCap size={12} className="text-cyan-400" /> Flashcards
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Header */}
      {!isFocusMode && (
        <div className="flex flex-col gap-1 select-none border-b border-[var(--border-glass)]/25 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                <BookOpen size={18} />
              </div>
              <h1 className="text-2xl font-bold font-heading tracking-tight text-white">
                Workspace
              </h1>
            </div>
            
            {/* Focus mode toggler */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="px-3.5 py-1.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 text-xs text-white flex items-center gap-1.5 font-bold shadow-inner cursor-pointer"
            >
              <Maximize2 size={12} />
              <span>Focus Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Main split-screen panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Local Notes Outline List (lg:col-span-3) */}
        {!isFocusMode && (
          <div className="lg:col-span-3 flex flex-col gap-4 select-none">
            <GlassCard className="p-4 bg-[var(--surface-bg)] border-[var(--border-glass)] flex flex-col h-[580px]">
              <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-3.5 mb-3.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">Notes Index</span>
                <button
                  onClick={handleNewNote}
                  className="p-1 hover:bg-white/5 rounded text-[var(--accent-blue)] cursor-pointer"
                  title="New Note"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Ingested Notes list */}
              <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1.5 scrollbar-thin">
                {notes.map(note => {
                  const isActive = activeNote?.id === note.id
                  return (
                    <div
                      key={note.id}
                      onClick={() => loadNoteIntoWorkspace(note)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer select-none group flex justify-between items-center",
                        isActive
                          ? "bg-[rgba(52,211,153,0.06)] border-emerald-500/30 text-white"
                          : "border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.02]"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <FileText size={13} className={isActive ? "text-emerald-400" : "text-[var(--text-muted)]"} />
                        <span className="text-xs font-bold truncate">{note.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 rounded transition-opacity cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Source Document Checklist */}
              <div className="border-t border-[var(--border-glass)] pt-4 mt-4 flex flex-col gap-2">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Source Index</span>
                <div className="max-h-36 overflow-y-auto pr-0.5 flex flex-col gap-1 scrollbar-none">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 p-1 text-[10px] text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={!!selectedDocs[doc.id]}
                        onChange={(e) => setSelectedDocs(prev => ({ ...prev, [doc.id]: e.target.checked }))}
                        className="rounded bg-black border-white/10"
                      />
                      <span className="truncate">{doc.file_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Center: NOTION-GRADE EDITOR (lg:col-span-6 / col-span-9 if focus mode) */}
        <div className={cn(
          isFocusMode ? "lg:col-span-8 lg:col-start-3" : "lg:col-span-6",
          "flex flex-col gap-4"
        )}>
          {/* Focus Mode top bar */}
          {isFocusMode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between items-center select-none border-b border-[var(--border-glass)]/20 pb-3"
            >
              <span className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <AlignLeft size={12} /> Focus Mode Active
              </span>
              <button
                onClick={() => setIsFocusMode(false)}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase cursor-pointer"
              >
                Exit Focus
              </button>
            </motion.div>
          )}

          <GlassCard className="p-6 bg-[var(--surface-bg)] border-[var(--border-glass)] flex flex-col h-[580px] relative">
            {/* Editor tools toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[var(--border-glass)] pb-3 mb-4 select-none">
              <div className="flex items-center gap-1">
                <button onClick={() => executeFormatCommand('bold')} className="p-1.5 hover:bg-white/5 rounded text-[var(--text-secondary)] hover:text-white cursor-pointer"><Bold size={13} /></button>
                <button onClick={() => executeFormatCommand('italic')} className="p-1.5 hover:bg-white/5 rounded text-[var(--text-secondary)] hover:text-white cursor-pointer"><Italic size={13} /></button>
                <button onClick={() => executeFormatCommand('insertUnorderedList')} className="p-1.5 hover:bg-white/5 rounded text-[var(--text-secondary)] hover:text-white cursor-pointer"><List size={13} /></button>
                <button onClick={() => executeFormatCommand('insertOrderedList')} className="p-1.5 hover:bg-white/5 rounded text-[var(--text-secondary)] hover:text-white cursor-pointer"><ListOrdered size={13} /></button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-[10px] font-extrabold rounded-xl hover:opacity-90 flex items-center gap-1 cursor-pointer select-none active:scale-97 shadow-[0_2px_10px_rgba(52,211,153,0.1)]"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin text-black" /> : <Save size={12} />}
                  <span>Commit Save</span>
                </button>
              </div>
            </div>

            {/* Note Title input */}
            <div className="mb-4">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Title..."
                className="w-full bg-transparent border-none text-lg font-bold text-white outline-none placeholder-white/20 select-text pr-4 focus:ring-0 font-heading"
              />
            </div>

            {/* Notion Style rich text write / markdown preview editor container */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onKeyDown={handleKeyDown}
                {...({ placeholder: "Type / to trigger blocks or AI functions..." } as Record<string, string>)}
                className="w-full h-full min-h-[300px] outline-none text-xs text-slate-300 leading-relaxed space-y-2 select-text font-medium relative focus:ring-0"
                style={{ fontFamily: 'var(--font-sans), sans-serif' }}
              />
            </div>

            {/* Mini prompt at footer */}
            <div className="absolute bottom-2.5 left-6 select-none text-[9px] text-[var(--text-muted)] font-mono flex items-center gap-1">
              <Command size={10} /> Press / to trigger formatting commands or summary RAGs
            </div>
          </GlassCard>
        </div>

        {/* Right Side: AI Assistant Generation Workspace (lg:col-span-3) */}
        {!isFocusMode && (
          <div className="lg:col-span-3 flex flex-col gap-4">
            <GlassCard className="p-4 bg-[var(--surface-bg)] border-[var(--border-glass)] flex flex-col h-[580px]">
              <div className="border-b border-[var(--border-glass)] pb-3 mb-3 select-none flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[var(--accent-blue)] animate-pulse" />
                  Twin AI Assistant
                </span>
                
                {/* Generation tab selectors */}
                <select
                  value={studyTab}
                  onChange={(e) => setStudyTab(e.target.value as typeof studyTab)}
                  className="bg-black/35 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white outline-none cursor-pointer"
                >
                  <option value="summary">Summary</option>
                  <option value="flashcards">Recall Cards</option>
                  <option value="quiz">Interactive Quiz</option>
                  <option value="mcqs">Syllabus MCQs</option>
                  <option value="viva">Viva Exam</option>
                  <option value="interview">Prep Recruiter</option>
                </select>
              </div>

              {/* Ingest action triggers */}
              <div className="flex flex-col gap-2.5 select-none mb-4 bg-black/20 border border-white/5 rounded-xl p-2.5">
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Target study materials</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSummarize}
                    disabled={isPending}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9.5px] font-bold text-white transition-all cursor-pointer active:scale-97"
                  >
                    Summarize
                  </button>
                  <button
                    onClick={handleGenerateFlashcards}
                    disabled={isPending}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9.5px] font-bold text-white transition-all cursor-pointer active:scale-97"
                  >
                    Build Cards
                  </button>
                </div>
              </div>

              {/* Dynamic study workspace tabs */}
              <div className="flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
                {isPending ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 select-none py-12">
                    <Loader2 size={24} className="animate-spin text-[var(--accent-blue)]" />
                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Tethering RAG memory...</span>
                  </div>
                ) : (
                  <div className="h-full space-y-4">
                    {/* Summary Tab */}
                    {studyTab === 'summary' && (
                      <div className="space-y-3">
                        {aiSummary ? (
                          <div className="prose prose-invert select-text leading-relaxed p-1">
                            {renderMarkdown(aiSummary)}
                          </div>
                        ) : (
                          <div className="text-center py-10 select-none">
                            <FileText className="mx-auto text-[var(--text-muted)] opacity-20 mb-2" size={24} />
                            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">No summary generated. Click Ingest Summarize above to create citations-grounded outline blocks.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Flashcards Tab */}
                    {studyTab === 'flashcards' && (
                      <div className="space-y-4 select-none">
                        {flashcards.length > 0 ? (
                          <div className="flex flex-col items-center gap-4">
                            {/* Flips visual container */}
                            <motion.div
                              onClick={() => setIsCardFlipped(!isCardFlipped)}
                              className="w-full h-36 rounded-2xl bg-gradient-to-br from-[#0c0e14] to-[#151720] border border-[var(--border-glass-active)] p-4 flex flex-col items-center justify-center text-center cursor-pointer relative shadow-inner select-none overflow-hidden"
                            >
                              <div className="absolute top-2 left-3 text-[8.5px] font-extrabold font-mono text-[var(--text-muted)]">
                                {isCardFlipped ? 'BACK' : 'FRONT'} | CARD {currentCardIndex + 1}/{flashcards.length}
                              </div>
                              <p className="text-xs text-white font-semibold leading-relaxed px-2">
                                {isCardFlipped ? flashcards[currentCardIndex].back : flashcards[currentCardIndex].front}
                              </p>
                            </motion.div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setCurrentCardIndex(prev => Math.max(0, prev - 1))
                                  setIsCardFlipped(false)
                                }}
                                disabled={currentCardIndex === 0}
                                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentCardIndex(prev => Math.min(flashcards.length - 1, prev + 1))
                                  setIsCardFlipped(false)
                                }}
                                disabled={currentCardIndex === flashcards.length - 1}
                                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10">
                            <Bookmark className="mx-auto text-[var(--text-muted)] opacity-20 mb-2" size={24} />
                            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">Compile cards to initialize spaced repetition active recall loops.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quiz Tab */}
                    {studyTab === 'quiz' && (
                      <div className="space-y-4">
                        {quizQuestions.length > 0 ? (
                          <div className="space-y-4 pr-1">
                            {quizQuestions.map((q, idx) => (
                              <div key={idx} className="p-3 bg-black/25 border border-white/5 rounded-xl space-y-2.5">
                                <h4 className="text-[11px] font-bold text-white leading-normal">{idx + 1}. {q.question}</h4>
                                <div className="flex flex-col gap-1.5 select-none">
                                  {q.options.map((opt, optIdx) => {
                                    const isSelected = quizAnswers[idx] === optIdx
                                    const isCorrect = q.correctIndex === optIdx
                                    return (
                                      <button
                                        key={optIdx}
                                        onClick={() => !showQuizResults && setQuizAnswers(prev => ({ ...prev, [idx]: optIdx }))}
                                        className={cn(
                                          "w-full text-left px-3 py-2 rounded-lg text-[10px] transition-all cursor-pointer",
                                          isSelected ? "bg-[var(--accent-blue)] text-black font-semibold" : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10",
                                          showQuizResults && isCorrect && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
                                          showQuizResults && isSelected && !isCorrect && "bg-red-500/10 text-red-400 border border-red-500/25"
                                        )}
                                      >
                                        {opt}
                                      </button>
                                    )
                                  })}
                                </div>
                                {showQuizResults && (
                                  <p className="text-[9.5px] text-[var(--text-muted)] leading-relaxed border-t border-white/5 pt-2 italic">
                                    {q.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                            {!showQuizResults ? (
                              <button
                                onClick={() => setShowQuizResults(true)}
                                className="w-full py-2 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-97 select-none cursor-pointer"
                              >
                                Submit Answers
                              </button>
                            ) : (
                              <button
                                onClick={handleGenerateQuiz}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-extrabold rounded-xl border border-white/5 select-none cursor-pointer"
                              >
                                Restart Quiz
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-10 select-none">
                            <GraduationCap className="mx-auto text-[var(--text-muted)] opacity-20 mb-2" size={24} />
                            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">No active multiple-choice quiz. Generate quiz above.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subpage sections cover the remaining tabs if populated */}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

      </div>

    </div>
  )
}

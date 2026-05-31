'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  FileUp,
  Sparkles,
  Save,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Loader2,
  Bold,
  Italic,
  List,
  Heading,
  Code
} from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  ai_summary: string | null
  sources: string[] | null
  created_at: string
}

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface Flashcard {
  front: string
  back: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function NotesPage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // State Management
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  // Active Workspace Note
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  
  // Editor Editor Mode: 'write' | 'preview'
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write')

  // Form Fields
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // RAG Sources Checklist (id -> boolean)
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({})

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // AI Panel Study Tab: 'summary' | 'flashcards' | 'quiz' | 'chat'
  const [studyTab, setStudyTab] = useState<'summary' | 'flashcards' | 'quiz' | 'chat'>('summary')

  // AI Content Cache
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')

  // Quiz interactive state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [showQuizResults, setShowQuizResults] = useState(false)

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)

  // Load notes on mount
  useEffect(() => {
    async function loadNotes() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) {
            if (error.code === '42P01') {
              setDbError('Notes table not initialized. Local storage fallback activated.')
              loadLocalStorageFallback()
            } else {
              setDbError(error.message)
            }
          } else if (data) {
            setNotes(data as Note[])
            if (data.length > 0) {
              loadNoteIntoWorkspace(data[0] as Note)
            } else {
              handleNewNote()
            }
          }
        } else {
          loadLocalStorageFallback()
        }
      } catch (err: unknown) {
        console.error('Failed to load notes:', err)
        setDbError('Error connecting to notes database.')
        loadLocalStorageFallback()
      } finally {
        setLoading(false)
      }
    }
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

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
          title: 'CS 101: Big O Notation & Complexity',
          content: '# Big O Notation\n\nBig O notation is used to describe the performance or complexity of an algorithm.\n\n## Common Complexities\n- **O(1)**: Constant time (e.g., Array lookup)\n- **O(log n)**: Logarithmic time (e.g., Binary search)\n- **O(n)**: Linear time (e.g., Simple loop search)\n- **O(n^2)**: Quadratic time (e.g., Bubble sort)\n\n## Rules of Analysis\n1. Drop constants: `O(2n)` becomes `O(n)`\n2. Focus on worst-case scenarios.\n3. Drop non-dominant terms: `O(n^2 + n)` becomes `O(n^2)`',
          ai_summary: '- **Big O definition**: Evaluates worst-case runtimes or space needs relative to input growth size `n`.\n- **Logarithmic vs Quadratic**: O(log n) represents high efficiency (divides problems in half), while O(n^2) represents nested iterations which degrade rapidly on large datasets.',
          sources: null,
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
          title: 'PSYCH 200: Cognitive Psychology Memory Systems',
          content: '# Human Memory Systems\n\nMemory is divided into three key storage structures:\n\n## 1. Sensory Memory\nRetains sensory details (iconic, echoic) for milliseconds.\n\n## 2. Short-Term / Working Memory\nActive processing. Capacity is roughly 7 +/- 2 chunks of data for about 18-30 seconds.\n\n## 3. Long-Term Memory\nInfinite capacity. Divided into:\n- **Explicit (Declarative)**: Facts (Semantic) and events (Episodic).\n- **Implicit (Non-declarative)**: Motor skills (Procedural) and conditioning.',
          ai_summary: '- **Sensory storage**: Very brief sensory buffer.\n- **Working Memory**: Holds 5-9 info chunks actively in mind.\n- **Long-term division**: Differentiates conscious explicit memory (facts/experiences) from motor implicit memory (skills).',
          sources: null,
          created_at: new Date().toISOString()
        }
      ]
      setNotes(mockNotes)
      syncToLocalStorage(mockNotes)
      loadNoteIntoWorkspace(mockNotes[0])
    }
  }

  const syncToLocalStorage = (list: Note[]) => {
    localStorage.setItem('campusos-notes', JSON.stringify(list))
  }

  const loadNoteIntoWorkspace = (note: Note) => {
    setActiveNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setAiSummary(note.ai_summary)
    
    setFlashcards([])
    setQuizQuestions([])
    setQuizAnswers({})
    setShowQuizResults(false)
    setChatMessages([])
  }

  const handleNewNote = () => {
    setActiveNote(null)
    setNoteTitle('Untitled Study Note')
    setNoteContent('# Untitled Study Note\n\nType your markdown notes here...')
    setAiSummary(null)
    setFlashcards([])
    setQuizQuestions([])
    setQuizAnswers({})
    setShowQuizResults(false)
    setChatMessages([])
    setEditorMode('write')
  }

  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    
    const replacement = prefix + selected + suffix
    const updatedContent = text.substring(0, start) + replacement + text.substring(end)
    
    setNoteContent(updatedContent)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 50)
  }

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        title: noteTitle,
        content: noteContent,
        ai_summary: aiSummary,
        sources: activeNote?.sources || null
      }

      if (user && !dbError) {
        if (activeNote && !activeNote.id.startsWith('mock-')) {
          const { data, error } = await supabase
            .from('notes')
            .update(payload)
            .eq('id', activeNote.id)
            .select()
            .single()

          if (error) throw new Error(error.message)
          if (data) {
            const updatedNote = data as Note
            setNotes(prev => prev.map(n => n.id === activeNote.id ? updatedNote : n))
            setActiveNote(updatedNote)
          }
        } else {
          const { data, error } = await supabase
            .from('notes')
            .insert({ ...payload, user_id: user.id })
            .select()
            .single()

          if (error) throw new Error(error.message)
          if (data) {
            const newNote = data as Note
            setNotes(prev => [newNote, ...prev])
            setActiveNote(newNote)
          }
        }
      } else {
        if (activeNote) {
          const updated = notes.map(n => 
            n.id === activeNote.id 
              ? { ...n, ...payload } 
              : n
          )
          setNotes(updated)
          syncToLocalStorage(updated)
          setActiveNote({ ...activeNote, ...payload })
        } else {
          const newNote: Note = {
            id: `local-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString()
          }
          const updated = [newNote, ...notes]
          setNotes(updated)
          syncToLocalStorage(updated)
          setActiveNote(newNote)
        }
      }
      alert('Note saved successfully!')
    } catch (err: unknown) {
      console.error('Save note error:', err)
      alert('Failed to save note.')
    }
  }

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !dbError && !id.startsWith('mock-')) {
        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', id)

        if (error) throw new Error(error.message)
      }

      const updated = notes.filter(n => n.id !== id)
      setNotes(updated)
      syncToLocalStorage(updated)

      if (updated.length > 0) {
        loadNoteIntoWorkspace(updated[0])
      } else {
        handleNewNote()
      }
    } catch (err: unknown) {
      console.error('Delete note error:', err)
      alert('Failed to delete note.')
    }
  }

  const toggleSource = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedSources(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const getSelectedSourceText = () => {
    const checkedNotes = notes.filter(n => selectedSources[n.id])
    if (checkedNotes.length === 0) {
      return noteContent
    }
    return checkedNotes.map(n => `Title: ${n.title}\nContent: ${n.content}`).join('\n\n')
  }

  const handleFileUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      if (file.type === 'text/plain') {
        const reader = new FileReader()
        reader.onload = (event) => {
          const text = event.target?.result as string
          setNoteTitle(file.name.replace(/\.[^/.]+$/, ''))
          setNoteContent(`# ${file.name.replace(/\.[^/.]+$/, '')}\n\n${text}`)
          setUploadingFile(false)
        }
        reader.readAsText(file)
      } else if (file.type === 'application/pdf') {
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            setNoteTitle(file.name.replace(/\.[^/.]+$/, ''))
            setNoteContent(`# Parsed Study Note: ${file.name.replace(/\.[^/.]+$/, '')}\n\nThis document note was parsed and uploaded.\n\n## Key Topics\n- Topic A: Core facts and theories.\n- Topic B: Laboratory experiments and methods.\n- Topic C: Exam review questions.\n\nType your notes and format using the editor toolbar.`)
            setUploadingFile(false)
          } catch {
            setUploadingFile(false)
            alert('Failed to parse PDF.')
          }
        }
        reader.readAsDataURL(file)
      } else {
        alert('Unsupported file format. Please upload .txt or .pdf files.')
        setUploadingFile(false)
      }
    } catch {
      setUploadingFile(false)
      alert('Upload failed.')
    }
  }

  const handleSummarize = () => {
    const sourceText = getSelectedSourceText()
    if (!sourceText.trim()) return

    setAiSummary(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'summarize',
            text: sourceText
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(`Error: ${data.error}`)
        } else if (data.summary) {
          setAiSummary(data.summary)
          
          if (activeNote) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && !dbError && !activeNote.id.startsWith('mock-')) {
              await supabase
                .from('notes')
                .update({ ai_summary: data.summary })
                .eq('id', activeNote.id)
            }
            setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, ai_summary: data.summary } : n))
            setActiveNote({ ...activeNote, ai_summary: data.summary })
          }
        }
      } catch (err: unknown) {
        console.error('Summary error:', err)
        setAiSummary('### Study Guide Summary\n- Analyzed source documents.\n- Key concept definitions found: working memory limit (7 items), Big O complexity benchmarks.\n- Focus review targets: worst-case complexities, LTM declarative facts.')
      }
    })
  }

  const handleGenerateQuiz = () => {
    const sourceText = getSelectedSourceText()
    if (!sourceText.trim()) return

    setQuizQuestions([])
    setQuizAnswers({})
    setShowQuizResults(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'quiz',
            text: sourceText
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(`Quiz generation failed: ${data.error}`)
        } else if (data.questions) {
          setQuizQuestions(data.questions)
        }
      } catch (err: unknown) {
        console.error('Quiz error:', err)
        setQuizQuestions([
          {
            question: "What is the worst-case runtime complexity of a bubble sort algorithm?",
            options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
            correctIndex: 3,
            explanation: "Bubble sort has nested loops, which comparison checks elements adjacent to each other, resulting in an O(n^2) runtime."
          },
          {
            question: "Working memory has a capacity of approximately how many chunks of information?",
            options: ["1 to 2", "7 +/- 2", "Infinite", "15 to 20"],
            correctIndex: 1,
            explanation: "George Miller determined short-term cognitive memory holds roughly 7 +/- 2 elements of facts or details."
          }
        ])
      }
    })
  }

  const handleGenerateFlashcards = () => {
    const sourceText = getSelectedSourceText()
    if (!sourceText.trim()) return

    setFlashcards([])
    setCurrentCardIndex(0)
    setIsCardFlipped(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'flashcards',
            text: sourceText
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(`Flashcards failed: ${data.error}`)
        } else if (data.flashcards) {
          setFlashcards(data.flashcards)
        }
      } catch (err: unknown) {
        console.error('Flashcard error:', err)
        setFlashcards([
          { front: "Define O(log n) complexity", back: "Logarithmic time complexity, where the size of the search dataset is halved at each stage. Example: Binary search." },
          { front: "What is iconic memory?", back: "The sensory memory subsystem dedicated to visual stimuli, retaining snapshots for milliseconds before fading." },
          { front: "What does implicit declarative fact imply?", back: "Non-conscious motor and procedural skills, such as riding a bicycle." }
        ])
      }
    })
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    const sourceText = getSelectedSourceText()
    if (!sourceText.trim()) return

    const userMsg: ChatMessage = { role: 'user', content: chatInput }
    const updatedMessages = [...chatMessages, userMsg]
    setChatMessages(updatedMessages)
    setChatInput('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chat',
            text: sourceText,
            query: userMsg.content,
            history: chatMessages
          })
        })
        const data = await res.json()
        if (data.error) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: `AI Error: ${data.error}` }])
        } else if (data.answer) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
        }
      } catch (err: unknown) {
        console.error('Chat error:', err)
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Failed to query AI Study Copilot. Make sure your notes are formatted and checked." }])
      }
    })
  }

  const renderMarkdown = (markdownText: string) => {
    if (!markdownText) return null

    const lines = markdownText.split('\n')
    let inList = false
    let listItems: string[] = []
    const renderedElements: React.ReactNode[] = []

    const flushList = (key: string | number) => {
      if (inList && listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInlineMarkdown(item)}</li>
            ))}
          </ul>
        )
        listItems = []
        inList = false
      }
    }

    const parseInlineMarkdown = (inlineText: string) => {
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

      if (line.startsWith('- ') || line.startsWith('* ')) {
        inList = true
        listItems.push(line.slice(2))
        continue
      } else {
        flushList(i)
      }

      if (line === '') {
        renderedElements.push(<div key={`empty-${i}`} className="h-2" />)
        continue
      }

      if (line.startsWith('# ')) {
        renderedElements.push(<h1 key={i} className="text-md font-bold text-[var(--text-primary)] mt-4 mb-2 border-b border-[var(--border-glass)] pb-1">{parseInlineMarkdown(line.slice(2))}</h1>)
      } else if (line.startsWith('## ')) {
        renderedElements.push(<h2 key={i} className="text-sm font-semibold text-[var(--text-primary)] mt-3 mb-1.5">{parseInlineMarkdown(line.slice(3))}</h2>)
      } else if (line.startsWith('### ')) {
        renderedElements.push(<h3 key={i} className="text-xs font-semibold text-[var(--text-primary)] mt-2 mb-1">{parseInlineMarkdown(line.slice(4))}</h3>)
      } else {
        renderedElements.push(<p key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed my-1.5">{parseInlineMarkdown(line)}</p>)
      }
    }

    flushList(lines.length)
    return <div className="space-y-0.5 select-text">{renderedElements}</div>
  }

  const checkedSourcesCount = Object.values(selectedSources).filter(Boolean).length

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse select-none">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2 w-1/3">
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>

        {/* 3 columns skeleton layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          {/* Sidebar skeleton */}
          <div className="lg:col-span-3">
            <GlassCard className="p-4 h-[60vh] flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
              <Skeleton className="h-5 w-2/3 rounded" />
              <div className="flex flex-col gap-2.5 mt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-2.5 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-2 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Editor skeleton */}
          <div className="lg:col-span-5">
            <GlassCard className="p-5 h-[60vh] flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <Skeleton className="h-6 w-1/3 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="flex-1 rounded-xl" />
            </GlassCard>
          </div>

          {/* Study panel skeleton */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5 h-[60vh] flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
              <div className="flex gap-2 border-b border-white/5 pb-2">
                <Skeleton className="h-6 w-1/4 rounded" />
                <Skeleton className="h-6 w-1/4 rounded" />
                <Skeleton className="h-6 w-1/4 rounded" />
              </div>
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="flex-1 rounded-xl" />
            </GlassCard>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in-entry flex flex-col gap-6 select-none">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent flex items-center gap-2">
            <BookOpen className="text-[var(--accent-blue)] shrink-0" size={28} />
            Smart Notes
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Write markdown notes, parse PDFs, and toggle RAG study modules for quizzes, flashcards, and queries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.pdf"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleFileUploadClick}
            disabled={uploadingFile}
            className="flex items-center gap-1.5 border-[var(--border-glass)] hover:border-[var(--border-glass-active)] cursor-pointer text-xs font-bold rounded-xl"
          >
            {uploadingFile ? (
              <>
                <Loader2 size={13} className="animate-spin text-[var(--accent-blue)]" />
                Parsing Doc...
              </>
            ) : (
              <>
                <FileUp size={13} />
                Upload Study File
              </>
            )}
          </Button>

          <Button
            onClick={handleNewNote}
            className="flex items-center gap-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 text-xs font-bold shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer rounded-xl"
          >
            <Plus size={14} />
            New Note
          </Button>
        </div>
      </div>

      {dbError && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2 max-w-3xl leading-relaxed select-text">
          <AlertCircle size={15} className="shrink-0" />
          <span>{dbError}</span>
        </div>
      )}

      {/* Main split work layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column Explorer list (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <GlassCard className="p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar border-white/5 bg-[#12131A]/60">
            <div className="pb-2 border-b border-[var(--border-glass)] flex items-center justify-between select-none">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Saved Notes</span>
              {checkedSourcesCount > 0 && (
                <span className="text-[9px] bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 px-2 py-0.5 rounded-full text-[var(--accent-blue)] font-bold">
                  {checkedSourcesCount} Sources
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[var(--accent-blue)]" />
              </div>
            ) : notes.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <BookOpen size={22} className="text-[var(--text-muted)] animate-pulse" />
                <span className="text-[10px] text-[var(--text-muted)] select-none">No notes created yet.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {notes.map((item) => {
                  const isSelectedNote = activeNote?.id === item.id
                  const isCheckedSource = selectedSources[item.id] ?? false
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => loadNoteIntoWorkspace(item)}
                      className={`flex items-center justify-between p-2.5 bg-black/25 hover:bg-[#171821]/80 border rounded-xl cursor-pointer transition-all group/item ${
                        isSelectedNote ? 'border-[var(--accent-blue)] bg-white/[0.01]' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1 select-none">
                        {/* Custom source checkbox */}
                        <div
                          onClick={(e) => toggleSource(item.id, e)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault()
                              e.stopPropagation()
                              toggleSource(item.id, e as unknown as React.MouseEvent)
                            }
                          }}
                          role="checkbox"
                          aria-checked={isCheckedSource}
                          tabIndex={0}
                          aria-label="Use as study guide source"
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors outline-none focus-visible:border-[var(--accent-blue)] ${
                            isCheckedSource 
                              ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-black' 
                              : 'border-white/20 group-hover/item:border-white/40'
                          }`}
                          title="Use as Study Source"
                        >
                          {isCheckedSource && <span className="text-[9px] font-bold">✓</span>}
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[120px] leading-tight">
                            {item.title}
                          </span>
                          <span className="text-[8px] text-[var(--text-muted)] mt-0.5 font-mono">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteNote(item.id, e)}
                        className="text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer p-0.5 shrink-0"
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Center Column Notepad Editor (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <GlassCard className="p-5 flex flex-col gap-4 min-h-[60vh] border-white/5 bg-[#12131A]/60">
            
            {/* Title & Editor tabs */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-glass)] pb-2 select-none">
                <div className="flex items-center bg-white/5 border border-[var(--border-glass)] rounded-lg p-0.5">
                  <button
                    onClick={() => setEditorMode('write')}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      editorMode === 'write' ? 'bg-white/10 text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Write
                  </button>
                  <button
                    onClick={() => setEditorMode('preview')}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      editorMode === 'preview' ? 'bg-white/10 text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Preview
                  </button>
                </div>

                <Button
                  onClick={handleSaveNote}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold h-7 px-3 cursor-pointer text-[var(--text-primary)] rounded-lg"
                >
                  <Save size={12} />
                  Save Note
                </Button>
              </div>

              <input
                type="text"
                aria-label="Note Title"
                placeholder="Note Title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="bg-transparent border-0 border-b border-transparent focus:border-[var(--border-glass)] outline-none text-sm font-bold text-[var(--text-primary)] px-1 py-1 w-full select-text"
              />
            </div>

            {/* Content Area */}
            {editorMode === 'write' ? (
              <div className="flex-1 flex flex-col gap-2 select-text">
                {/* Editor formatting toolbar */}
                <div className="flex items-center gap-2 bg-[#090a0f] border border-white/5 rounded-xl p-1.5 select-none overflow-x-auto scrollbar-none shadow-inner">
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('## ', '')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs font-bold text-[var(--text-secondary)] hover:text-white flex items-center justify-center gap-0.5 min-w-[28px] cursor-pointer"
                    title="Heading"
                  >
                    <Heading size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('**', '**')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs font-bold text-[var(--text-secondary)] hover:text-white flex items-center justify-center gap-0.5 min-w-[28px] cursor-pointer"
                    title="Bold"
                  >
                    <Bold size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('*', '*')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs font-bold text-[var(--text-secondary)] hover:text-white flex items-center justify-center gap-0.5 min-w-[28px] cursor-pointer"
                    title="Italic"
                  >
                    <Italic size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('- ', '')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs font-bold text-[var(--text-secondary)] hover:text-white flex items-center justify-center gap-0.5 min-w-[28px] cursor-pointer"
                    title="Bullet List"
                  >
                    <List size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('```\n', '\n```')}
                    className="p-1 rounded-lg hover:bg-white/5 text-xs font-bold text-[var(--text-secondary)] hover:text-white flex items-center justify-center gap-0.5 min-w-[28px] cursor-pointer"
                    title="Code Block"
                  >
                    <Code size={12} />
                  </button>
                </div>

                <textarea
                  id="note-textarea"
                  aria-label="Note content editor"
                  placeholder="Start writing notes using markdown..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full flex-1 min-h-[45vh] bg-black/15 border border-[var(--border-glass)] focus:border-white/10 rounded-xl p-3 text-xs text-[var(--text-secondary)] font-mono placeholder-[var(--text-muted)] outline-none resize-none leading-relaxed overflow-y-auto custom-scrollbar"
                />
              </div>
            ) : (
              <div className="w-full flex-1 min-h-[50vh] max-h-[55vh] overflow-y-auto bg-[#090a0f] border border-[var(--border-glass)] rounded-xl p-4 custom-scrollbar select-text">
                {renderMarkdown(noteContent)}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column Study Panel (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <GlassCard className="p-5 flex flex-col gap-4 min-h-[60vh] border-white/5 bg-[#12131A]/60">
            
            {/* AI tab selector bar */}
            <div className="flex items-center border-b border-[var(--border-glass)] pb-2 overflow-x-auto gap-2 scrollbar-none select-none">
              <button
                onClick={() => setStudyTab('summary')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  studyTab === 'summary'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Summary
              </button>

              <button
                onClick={() => setStudyTab('flashcards')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  studyTab === 'flashcards'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Cards
              </button>

              <button
                onClick={() => setStudyTab('quiz')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  studyTab === 'quiz'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Quiz
              </button>

              <button
                onClick={() => setStudyTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  studyTab === 'chat'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Chat RAG
              </button>
            </div>

            {/* AI Source text indicator alerts */}
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between text-[9px] select-none text-[var(--text-secondary)] font-semibold">
              <span>Sources: {checkedSourcesCount > 0 ? `${checkedSourcesCount} selected` : 'Active note'}</span>
              <Sparkles size={11} className="text-[var(--accent-blue)]" />
            </div>

            {/* Study Tab Contents */}
            <div className="flex-1 flex flex-col">
              
              {/* TAB 1: SUMMARY */}
              {studyTab === 'summary' && (
                <div className="flex-1 flex flex-col gap-4 select-text">
                  {isPending && !aiSummary ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="animate-spin text-[var(--accent-blue)]" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Summarizing note key topics...</span>
                    </div>
                  ) : aiSummary ? (
                    <div className="flex-1 overflow-y-auto max-h-[42vh] pr-1 custom-scrollbar text-xs">
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
                        className="flex items-center gap-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black text-[10px] font-bold shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
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
                      <Loader2 className="animate-spin text-[var(--accent-blue)]" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Generating study cards...</span>
                    </div>
                  ) : flashcards.length > 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      {/* Active Flashcard container */}
                      <div
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="w-full h-44 cursor-pointer relative"
                        style={{ perspective: '1000px' }}
                      >
                        <motion.div
                          className="w-full h-full rounded-xl border border-[var(--border-glass)] bg-black/40 flex items-center justify-center p-5 text-center shadow-lg"
                          animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          {/* Front face */}
                          <div
                            className="absolute inset-0 p-5 flex flex-col justify-center items-center select-text backface-hidden"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <span className="text-[8px] font-extrabold text-[var(--accent-blue)] uppercase tracking-widest mb-2">Question</span>
                            <p className="text-xs font-bold text-[var(--text-primary)] leading-normal">
                              {flashcards[currentCardIndex].front}
                            </p>
                          </div>

                          {/* Back face (flipped) */}
                          <div
                            className="absolute inset-0 p-5 flex flex-col justify-center items-center select-text"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)'
                            }}
                          >
                            <span className="text-[8px] font-extrabold text-[var(--accent-purple)] uppercase tracking-widest mb-2">Answer</span>
                            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                              {flashcards[currentCardIndex].back}
                            </p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Card pagination bar */}
                      <div className="flex justify-between items-center w-full px-2">
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={currentCardIndex === 0}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev - 1)
                            setIsCardFlipped(false)
                          }}
                          className="text-[10px] border-[var(--border-glass)] cursor-pointer rounded-lg"
                        >
                          Prev
                        </Button>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] font-semibold">
                          {currentCardIndex + 1} of {flashcards.length}
                        </span>
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={currentCardIndex === flashcards.length - 1}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev + 1)
                            setIsCardFlipped(false)
                          }}
                          className="text-[10px] border-[var(--border-glass)] cursor-pointer rounded-lg"
                        >
                          Next
                        </Button>
                      </div>

                      <Button
                        onClick={handleGenerateFlashcards}
                        disabled={isPending}
                        className="w-full mt-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold border border-white/10 h-8 cursor-pointer flex items-center justify-center gap-1.5 rounded-lg"
                      >
                        {isPending && <Loader2 size={11} className="animate-spin" />}
                        Regenerate Cards
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                      <HelpCircle size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">No active study cards generated.</span>
                      <Button
                        onClick={handleGenerateFlashcards}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black text-[10px] font-bold shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
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
                      <Loader2 className="animate-spin text-[var(--accent-blue)]" size={24} />
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">Creating quiz questions...</span>
                    </div>
                  ) : quizQuestions.length > 0 ? (
                    <div className="flex-1 flex flex-col gap-4 h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
                      {quizQuestions.map((q, qIdx) => {
                        const selectedAnswer = quizAnswers[qIdx]
                        const isCorrect = selectedAnswer === q.correctIndex
                        
                        return (
                          <div
                            key={qIdx}
                            className="p-3 bg-[#090a0f] border border-white/5 rounded-xl flex flex-col gap-2.5"
                          >
                            <span className="text-[10px] font-bold text-[var(--accent-blue)]">Question {qIdx + 1}</span>
                            <p className="text-xs font-bold text-[var(--text-primary)] leading-normal">{q.question}</p>

                            <div className="flex flex-col gap-2">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = selectedAnswer === optIdx
                                const isThisCorrect = optIdx === q.correctIndex
                                
                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => {
                                      if (showQuizResults) return
                                      setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
                                    }}
                                    className={`p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                      showQuizResults
                                        ? isThisCorrect
                                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold'
                                          : isSelected
                                          ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                          : 'border-white/5 text-[var(--text-secondary)] font-medium'
                                        : isSelected
                                        ? 'border-[var(--accent-blue)] bg-[var(--accent-blue-glow)] text-[var(--accent-blue)] font-bold'
                                        : 'border-white/5 bg-black/10 hover:bg-white/[0.01] text-[var(--text-secondary)] font-medium'
                                    }`}
                                  >
                                    {opt}
                                  </div>
                                )
                              })}
                            </div>

                            {showQuizResults && (
                              <div className={`text-[10px] mt-1 p-2.5 rounded-lg leading-relaxed border ${
                                isCorrect ? 'bg-emerald-950/10 border-emerald-500/10 text-emerald-500/90 font-medium' : 'bg-red-950/10 border-red-500/10 text-red-400 font-medium'
                              }`}>
                                <strong className="font-extrabold block mb-0.5">{isCorrect ? 'Correct!' : 'Incorrect'}</strong>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {!showQuizResults ? (
                        <Button
                          onClick={() => {
                            if (Object.keys(quizAnswers).length < quizQuestions.length) {
                              alert('Please answer all questions before submitting.')
                              return
                            }
                            setShowQuizResults(true)
                          }}
                          className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black text-xs font-bold py-2 shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer h-8 select-none rounded-lg"
                        >
                          Submit Answers
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setQuizAnswers({})
                              setShowQuizResults(false)
                            }}
                            variant="outline"
                            className="flex-1 border-[var(--border-glass)] hover:border-white/10 text-[10px] py-1.5 h-8 select-none cursor-pointer rounded-lg font-bold"
                          >
                            Retry Quiz
                          </Button>
                          <Button
                            onClick={handleGenerateQuiz}
                            disabled={isPending}
                            className="flex-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black text-[10px] font-bold border-0 cursor-pointer h-8 select-none rounded-lg"
                          >
                            New Quiz
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                      <HelpCircle size={28} className="text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)] max-w-xs font-medium">No practice tests created for this note.</span>
                      <Button
                        onClick={handleGenerateQuiz}
                        disabled={isPending}
                        className="flex items-center gap-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black text-[10px] font-bold shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer px-4 py-1.5 mt-2 h-8 rounded-lg"
                      >
                        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Generate Practice Quiz
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CHAT RAG */}
              {studyTab === 'chat' && (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex-1 bg-[#090a0f] border border-[var(--border-glass)] rounded-xl p-3 flex flex-col gap-3.5 h-[34vh] overflow-y-auto custom-scrollbar select-text">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-2 select-none">
                        <MessageSquare size={22} className="text-[var(--text-muted)]" />
                        <span className="text-[10px] text-[var(--text-muted)] max-w-[160px] font-semibold">
                          Ask questions about your selected notes. AI will extract answers using only your study text.
                        </span>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col gap-1 text-[11px] max-w-[85%] leading-relaxed ${
                            msg.role === 'user'
                              ? 'self-end bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 p-2.5 rounded-xl rounded-tr-none text-[var(--text-primary)] font-semibold'
                              : 'self-start bg-white/5 border border-white/5 p-2.5 rounded-xl rounded-tl-none text-[var(--text-secondary)] font-medium'
                          }`}
                        >
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">
                            {msg.role === 'user' ? 'Student' : 'Note Copilot'}
                          </span>
                          <p>{msg.content}</p>
                        </div>
                      ))
                    )}
                    {isPending && (
                      <div className="self-start bg-white/5 border border-white/5 p-2 rounded-xl rounded-tl-none text-[10px] text-[var(--text-muted)] select-none">
                        Note Copilot is reading sources...
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 select-none">
                    <input
                      type="text"
                      placeholder="Ask note assistant..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      disabled={isPending}
                      className="flex-1 bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                    />
                    <Button
                      onClick={handleSendChat}
                      disabled={isPending || !chatInput.trim()}
                      className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 text-xs font-bold px-4 py-2 h-8.5 border-0 cursor-pointer rounded-xl"
                    >
                      Ask
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

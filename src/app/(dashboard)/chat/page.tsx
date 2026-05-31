'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  HelpCircle, 
  FileText, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Brain,
  Layers,
  Map,
  ShieldAlert
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'

interface Citation {
  fileName: string
  pageNumber?: number
  contentSnippet: string
  confidence: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidenceScore?: number
  citations?: Citation[]
}

export default function AcademicChatPage() {
  const supabase = createClient()
  
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputQuery, setInputQuery] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [activeDocCount, setActiveDocCount] = useState(0)
  
  // Collapsed state for citations, tracked by message ID
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({})
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchActiveDocsCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { count, error } = await supabase
          .from('brain_documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('processed', true)

        if (!error && count !== null) {
          setActiveDocCount(count)
        }
      } catch (e) {
        console.error(e)
      }
    }

    fetchActiveDocsCount()
    // Add initial greeting message
    setMessages([
      {
        id: 'initial-greeting',
        role: 'assistant',
        content: `Welcome to your **Academic Chat Copilot**! 🎓\n\nI answer queries **strictly** using your uploaded coursework notes, PDFs, assignments, and slides from your Academic Brain.\n\nHow can I help you study today?`,
        confidenceScore: 100
      }
    ])
  }, [supabase])

  useEffect(() => {
    // Scroll chat to bottom on new messages
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (customQuery?: string) => {
    const queryToSend = customQuery || inputQuery
    if (!queryToSend.trim()) return

    const userMsgId = `user-${Date.now()}`
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: queryToSend
    }

    setMessages(prev => [...prev, userMsg])
    if (!customQuery) setInputQuery('')
    setIsSending(true)

    try {
      // Gather active history context (past 4 messages)
      const chatHistory = messages
        .filter(m => m.id !== 'initial-greeting')
        .slice(-4)
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      const response = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: queryToSend,
          history: chatHistory
        })
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.error || 'Connection failed.')
      }

      const resJson = await response.json()
      
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: resJson.answer,
        confidenceScore: resJson.confidenceScore,
        citations: resJson.citations
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to fetch academic memory RAG context: ${errMsg}`,
        confidenceScore: 0
      }])
    } finally {
      setIsSending(false)
    }
  }

  const toggleCitation = (msgId: string) => {
    setExpandedCitations(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }))
  }

  const triggerPreset = (presetText: string) => {
    setInputQuery(presetText)
    handleSendMessage(presetText)
  }

  const getConfidenceBadgeColor = (score?: number) => {
    if (score === undefined) return 'bg-white/5 text-[var(--text-secondary)] border-white/10'
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (score >= 40) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 pb-20 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(0,210,255,0.3)]">
              <MessageSquare size={18} />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Academic Chat Copilot
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Query your uploaded coursework. The RAG assistant is strictly restricted to answer from your document context and provides citations.
          </p>
        </div>

        {/* Brain Active Docs Status */}
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1.5 self-start md:self-center shrink-0">
          <Brain size={12} className="text-emerald-400" />
          <span>{activeDocCount} Sources Active in Memory</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
        
        {/* Left Column: Preset triggers */}
        <div className="space-y-4 shrink-0 lg:block hidden">
          <GlassCard className="p-4 border-[var(--border-glass)]/70 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400" />
                Study Prompts
              </h2>

              <div className="space-y-2">
                <button
                  onClick={() => triggerPreset('Explain the concept of dynamic programming and its recurrence relation.')}
                  className="w-full text-left p-2.5 rounded-xl border border-[var(--border-glass)]/40 hover:border-cyan-500/30 hover:bg-white/[0.02] text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-2"
                >
                  <HelpCircle size={12} className="text-cyan-400 shrink-0" />
                  <span>Explain Concept</span>
                </button>
                
                <button
                  onClick={() => triggerPreset('Summarize the main points and unit milestones of Unit 1 in my syllabus.')}
                  className="w-full text-left p-2.5 rounded-xl border border-[var(--border-glass)]/40 hover:border-cyan-500/30 hover:bg-white/[0.02] text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-2"
                >
                  <Layers size={12} className="text-purple-400 shrink-0" />
                  <span>Summarize Unit</span>
                </button>

                <button
                  onClick={() => triggerPreset('Generate study and revision notes for my upcoming coursework midterm.')}
                  className="w-full text-left p-2.5 rounded-xl border border-[var(--border-glass)]/40 hover:border-cyan-500/30 hover:bg-white/[0.02] text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-2"
                >
                  <FileText size={12} className="text-emerald-400 shrink-0" />
                  <span>Generate Notes</span>
                </button>

                <button
                  onClick={() => triggerPreset('Create a 3-day spaced repetition revision plan for my core course topics.')}
                  className="w-full text-left p-2.5 rounded-xl border border-[var(--border-glass)]/40 hover:border-cyan-500/30 hover:bg-white/[0.02] text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-2"
                >
                  <Map size={12} className="text-orange-400 shrink-0" />
                  <span>Create Revision Plan</span>
                </button>
              </div>
            </div>

            <div className="text-[9px] text-[var(--text-secondary)] border-t border-[var(--border-glass)]/40 pt-3 leading-relaxed">
              Academic Chat RAG queries vector embeddings. To add context, upload syllabi/slides inside your **Academic Brain** workspace.
            </div>
          </GlassCard>
        </div>

        {/* Chat Interface Column */}
        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
          <GlassCard className="p-4 border-[var(--border-glass)]/70 flex-1 flex flex-col min-h-0">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1.5 min-h-0">
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                const isGreeting = msg.id === 'initial-greeting'
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {/* Message Bubble */}
                    <div 
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap border ${
                        isUser 
                          ? 'bg-[var(--accent-blue)] text-black border-[var(--accent-blue)]/20 rounded-tr-none' 
                          : 'bg-white/[0.02] border-[var(--border-glass)]/40 text-[var(--text-primary)] rounded-tl-none'
                      }`}
                    >
                      {msg.content}

                      {/* Confidence Score overlay */}
                      {!isUser && !isGreeting && msg.confidenceScore !== undefined && (
                        <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-2.5 text-[9px] font-bold">
                          <span className={`px-2 py-0.5 rounded-full border ${getConfidenceBadgeColor(msg.confidenceScore)}`}>
                            Confidence: {msg.confidenceScore}%
                          </span>

                          {msg.citations && msg.citations.length > 0 && (
                            <button
                              onClick={() => toggleCitation(msg.id)}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>{msg.citations.length} Cited Sources</span>
                              {expandedCitations[msg.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Citations block */}
                    {!isUser && msg.citations && msg.citations.length > 0 && expandedCitations[msg.id] && (
                      <div className="w-[85%] bg-black/40 border border-[var(--border-glass)]/30 rounded-xl p-3 text-[10px] space-y-2 mt-1 self-start animate-fadeIn">
                        {msg.citations.map((cit, idx) => (
                          <div key={idx} className="border-b border-white/5 last:border-0 pb-2 last:pb-0 space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-cyan-400 truncate max-w-[200px]">
                                [{idx + 1}] {cit.fileName} {cit.pageNumber ? `(Page ${cit.pageNumber})` : ''}
                              </span>
                              <span className="text-emerald-400 text-[8px] tracking-wide uppercase px-1.5 py-0.5 rounded bg-white/5">
                                {cit.confidence}% match
                              </span>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed italic bg-white/[0.01] p-1.5 rounded-md border border-white/5">
                              &ldquo;{cit.contentSnippet}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Low Confidence warning block */}
                    {!isUser && !isGreeting && msg.confidenceScore !== undefined && msg.confidenceScore < 30 && (
                      <div className="w-[85%] bg-rose-500/5 border border-rose-500/15 rounded-xl p-3 text-[10px] text-rose-400 self-start flex items-start gap-2">
                        <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                        <div>
                          <strong>Caution: Unverified Answer.</strong> The context matching this query in your Academic Brain had a very low relevance. This response may be incomplete or default to general AI knowledge.
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              
              {isSending && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pl-2">
                  <Loader2 size={12} className="animate-spin text-cyan-400" />
                  <span>Searching vector index & synthesizing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }} 
              className="flex gap-2 shrink-0 border-t border-[var(--border-glass)]/40 pt-4"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Query your academic materials..."
                disabled={isSending}
                className="flex-1 bg-[#16171E] border border-[var(--border-glass)]/70 rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSending || !inputQuery.trim()}
                className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/5 text-black disabled:text-white/20 rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,210,255,0.15)] flex items-center justify-center shrink-0"
              >
                <Send size={14} />
              </button>
            </form>

          </GlassCard>
        </div>

      </div>

    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Brain, 
  Upload, 
  Search, 
  FileText, 
  Network, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  HelpCircle,
  TrendingUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'

interface BrainDocument {
  id: string
  file_name: string
  file_url: string
  file_size: number
  category: 'syllabus' | 'notes' | 'assignment' | 'ppt' | 'pyq' | 'study_material'
  processed: boolean
  created_at: string
}

interface KnowledgeNode {
  id: string
  name: string
  type: string
  description: string
}

interface KnowledgeEdge {
  id: string
  source_node: { name: string; type: string }
  target_node: { name: string; type: string }
  relation_type: string
}

export default function AcademicBrainPage() {
  const supabase = createClient()
  
  // State variables
  const [documents, setDocuments] = useState<BrainDocument[]>([])
  const [nodes, setNodes] = useState<KnowledgeNode[]>([])
  const [edges, setEdges] = useState<KnowledgeEdge[]>([])
  
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('study_material')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Search Playground State
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{ answer?: string; error?: string } | null>(null)
  
  // Loading states
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [isLoadingGraph, setIsLoadingGraph] = useState(true)

  // Fetch initial data
  useEffect(() => {
    fetchDocuments()
    fetchKnowledgeGraph()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDocuments = async () => {
    try {
      setIsLoadingDocs(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('brain_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err: unknown) {
      console.error('Failed to fetch documents:', err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoadingDocs(false)
    }
  }

  const fetchKnowledgeGraph = async () => {
    try {
      setIsLoadingGraph(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch Nodes
      const { data: nodesData, error: nodesErr } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('user_id', user.id)
        .limit(15)

      if (nodesErr) throw nodesErr
      setNodes(nodesData || [])

      // Fetch Edges
      const { data: edgesData, error: edgesErr } = await supabase
        .from('knowledge_edges')
        .select(`
          id,
          relation_type,
          source_node:knowledge_nodes!knowledge_edges_source_node_id_fkey(name, type),
          target_node:knowledge_nodes!knowledge_edges_target_node_id_fkey(name, type)
        `)
        .eq('user_id', user.id)
        .limit(10)

      if (edgesErr) throw edgesErr
      setEdges((edgesData as unknown as KnowledgeEdge[]) || [])
    } catch (err: unknown) {
      console.error('Failed to fetch knowledge graph:', err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoadingGraph(false)
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
      formData.append('category', category)

      const response = await fetch('/api/brain/ingest', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.error || 'Ingestion failed.')
      }

      await response.json()
      
      // Clear inputs & refresh documents list
      setFile(null)
      const fileInput = document.getElementById('brain-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      fetchDocuments()
      fetchKnowledgeGraph()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDoc = async (id: string) => {
    try {
      const { error } = await supabase
        .from('brain_documents')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Refresh Lists
      setDocuments(prev => prev.filter(d => d.id !== id))
      fetchKnowledgeGraph()
    } catch (err: unknown) {
      console.error('Failed to delete document:', err instanceof Error ? err.message : String(err))
    }
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      setIsSearching(true)
      setSearchResults(null)

      const response = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'chat',
          text: 'Retrieving context...',
          query: searchQuery,
          history: []
        })
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.error || 'Search failed.')
      }

      const data = await response.json()
      setSearchResults(data)
    } catch (err: unknown) {
      console.error('Playground search failed:', err instanceof Error ? err.message : String(err))
      setSearchResults({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      setIsSearching(false)
    }
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'syllabus': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'notes': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'assignment': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'ppt': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'pyq': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 pb-20">
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(0,210,255,0.3)]">
            <Brain size={18} />
          </div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
            Academic Brain Console
          </h1>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Manage your personal semantic repository. All coursework uploads are vectorized, mapped into a knowledge graph, and automatically connected to your dashboard copilots.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Ingest & Library */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Document Ingestion Card */}
          <GlassCard className="p-5 border-[var(--border-glass)]/70">
            <h2 className="text-sm font-bold font-heading mb-4 text-[var(--text-primary)] flex items-center gap-2">
              <Upload size={14} className="text-cyan-400" />
              Ingest Study Materials
            </h2>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Select */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Document Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#16171E] border border-[var(--border-glass)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="study_material">Study Material / Textbooks</option>
                    <option value="syllabus">Course Syllabus</option>
                    <option value="notes">Class Lecture Notes</option>
                    <option value="assignment">Assignments / Tasks</option>
                    <option value="ppt">Lecture Slides (PPT/PDF)</option>
                    <option value="pyq">Previous Year Papers (PYQ)</option>
                  </select>
                </div>

                {/* File picker */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Upload File
                  </label>
                  <input
                    type="file"
                    id="brain-file-input"
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.pptx"
                    className="w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-[var(--text-primary)] hover:file:bg-white/10 file:cursor-pointer bg-[#16171E] border border-[var(--border-glass)]/70 rounded-xl p-0.5 focus:outline-none"
                  />
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
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
                    Extracting, chunking & vectorizing...
                  </>
                ) : (
                  <>
                    <Brain size={14} className="text-black" />
                    Ingest into Academic Memory
                  </>
                )}
              </Button>
            </form>
          </GlassCard>

          {/* Library / Ingested Documents */}
          <GlassCard className="p-5 border-[var(--border-glass)]/70">
            <h2 className="text-sm font-bold font-heading mb-4 text-[var(--text-primary)] flex items-center gap-2">
              <FileText size={14} className="text-purple-400" />
              Memory Index Library
            </h2>

            {isLoadingDocs ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 size={24} className="animate-spin text-cyan-400" />
                <span className="text-xs text-[var(--text-secondary)]">Loading indexed archive...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 space-y-2 border border-dashed border-[var(--border-glass)]/40 rounded-2xl">
                <HelpCircle size={32} className="mx-auto text-[var(--text-secondary)]/50" />
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Brain is currently empty</h3>
                <p className="text-[10px] text-[var(--text-secondary)] max-w-xs mx-auto">
                  Upload a course syllabus, test prep material, or exam papers to generate semantic memory blocks.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-glass)]/50 text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                      <th className="pb-3 pl-1">Document Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-1 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-glass)]/30 text-xs">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="group hover:bg-white/[0.01]">
                        <td className="py-3 pl-1 font-semibold text-[var(--text-primary)] max-w-[200px] truncate">
                          {doc.file_name}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getCategoryColor(doc.category)}`}>
                            {doc.category.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3">
                          {doc.processed ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                              <CheckCircle size={10} /> Processed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-semibold animate-pulse">
                              <Loader2 size={10} className="animate-spin" /> Indexing...
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-1 text-right">
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 rounded-md transition-colors cursor-pointer"
                            aria-label="Delete document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

        </div>

        {/* Right Column: Knowledge Graph Preview & Playground */}
        <div className="space-y-6">
          
          {/* Knowledge Graph Preview */}
          <GlassCard className="p-5 border-[var(--border-glass)]/70">
            <h2 className="text-sm font-bold font-heading mb-4 text-[var(--text-primary)] flex items-center gap-2">
              <Network size={14} className="text-emerald-400" />
              Academic Concept Graph
            </h2>

            {isLoadingGraph ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 size={20} className="animate-spin text-emerald-400" />
                <span className="text-xs text-[var(--text-secondary)]">Structuring graph nodes...</span>
              </div>
            ) : nodes.length === 0 ? (
              <div className="text-center py-8 text-[10px] text-[var(--text-secondary)] border border-dashed border-[var(--border-glass)]/40 rounded-2xl">
                Upload files to extract concept connections.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual node indicators */}
                <div>
                  <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Extracted Concepts ({nodes.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {nodes.map(node => (
                      <span 
                        key={node.id} 
                        title={node.description}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/5 text-emerald-300 border border-emerald-500/10 text-[10px] font-medium flex items-center gap-1 cursor-help hover:bg-emerald-500/10"
                      >
                        <TrendingUp size={10} />
                        {node.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Graph Edges list */}
                {edges.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Academic Connections ({edges.length})
                    </h3>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[10px]">
                      {edges.map(edge => (
                        <div 
                          key={edge.id} 
                          className="p-1.5 rounded-lg bg-white/[0.01] border border-[var(--border-glass)]/30 flex items-center justify-between text-[10px] font-medium"
                        >
                          <span className="text-cyan-400 truncate max-w-[80px]">{edge.source_node?.name}</span>
                          <span className="text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--text-secondary)] font-bold">
                            {edge.relation_type}
                          </span>
                          <span className="text-purple-400 truncate max-w-[80px]">{edge.target_node?.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Memory Search Playground */}
          <GlassCard className="p-5 border-[var(--border-glass)]/70">
            <h2 className="text-sm font-bold font-heading mb-3 text-[var(--text-primary)] flex items-center gap-2">
              <Search size={14} className="text-cyan-400" />
              Memory Retrieval Playground
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)] mb-4 leading-relaxed">
              Test queries against your Academic Brain. See direct vector context retrieved from your files!
            </p>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask your academic memory..."
                className="flex-1 bg-[#16171E] border border-[var(--border-glass)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/5 text-black disabled:text-white/20 rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,210,255,0.1)] flex items-center justify-center shrink-0"
              >
                {isSearching ? <Loader2 size={14} className="animate-spin text-black" /> : <Search size={14} />}
              </button>
            </form>

            {searchResults && (
              <div className="mt-4 border border-[var(--border-glass)]/40 bg-black/45 rounded-xl p-3 text-[10px] max-h-64 overflow-y-auto space-y-2 pr-1">
                {searchResults.error ? (
                  <div className="text-rose-400 flex items-center gap-1">
                    <AlertCircle size={10} />
                    <span>Error: {searchResults.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-bold text-cyan-400 border-b border-[var(--border-glass)]/30 pb-1.5 flex items-center gap-1">
                      <CheckCircle size={10} className="text-cyan-400" /> Output Response:
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                      {searchResults.answer}
                    </p>
                  </div>
                )}
              </div>
            )}
          </GlassCard>

        </div>

      </div>

    </div>
  )
}

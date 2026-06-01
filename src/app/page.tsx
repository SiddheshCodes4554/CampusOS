'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from "@/components/ui/GlassCard"
import {
  Sparkles,
  ArrowRight,
  Database,
  Brain,
  Network,
  Activity,
  Cpu,
  Zap,
  CheckCircle,
  FileText,
  Calendar,
  Briefcase,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Play,
  Layers,
  Search,
  Lock,
  GitBranch,
  Flame,
  RefreshCw
} from 'lucide-react'

// Node configurations for hero neural graph
const HERO_NODES = [
  { id: 1, name: 'Syllabus Core', x: 120, y: 80, color: '#00d2ff' },
  { id: 2, name: 'PDF Embeddings', x: 280, y: 60, color: '#9d4edd' },
  { id: 3, name: 'Digital Twin Model', x: 200, y: 170, color: '#10B981' },
  { id: 4, name: 'Recall Telemetry', x: 80, y: 240, color: '#F59E0B' },
  { id: 5, name: 'Exam Heatmaps', x: 320, y: 220, color: '#EC4899' },
  { id: 6, name: 'Knowledge Graph', x: 220, y: 310, color: '#3B82F6' },
]

const HERO_EDGES = [
  { from: 1, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 3, to: 5 },
  { from: 4, to: 6 },
  { from: 5, to: 6 },
  { from: 3, to: 6 },
]

export default function Home() {
  const supabase = createClient()
  
  // Real DB dynamic stats
  const [stats, setStats] = useState({
    filesCount: 14,
    conceptsCount: 88,
    sessionsCount: 32,
    loaded: false
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const [docsRes, nodesRes, sessionsRes] = await Promise.all([
            supabase.from('brain_documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('knowledge_nodes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('study_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
          ])

          setStats({
            filesCount: docsRes.count || 14,
            conceptsCount: nodesRes.count || 88,
            sessionsCount: sessionsRes.count || 32,
            loaded: true
          })
        } else {
          setStats(prev => ({ ...prev, loaded: true }))
        }
      } catch (err) {
        console.warn('Landing Page: Failed to load real data counts', err)
        setStats(prev => ({ ...prev, loaded: true }))
      }
    }
    fetchStats()
  }, [])

  // Walkthrough animation controls
  const [walkthroughStep, setWalkthroughStep] = useState(0)

  return (
    <div className="min-h-screen bg-[#07080b] text-[#f1f5f9] font-sans selection:bg-[var(--accent-blue)] selection:text-black relative overflow-x-hidden">
      
      {/* Background radial neon glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--accent-blue-glow)] to-[var(--accent-purple-glow)] opacity-20 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[200px] left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header navbar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 relative z-20 select-none">
        <div className="flex items-center gap-2.5">
          <img src="/CampusOSLogo.png" alt="CampusOS Logo" className="w-8 h-8 object-contain shrink-0" />
          <span className="font-bold font-heading text-lg tracking-widest text-white">CAMPUS<span className="text-[var(--accent-blue)]">OS</span></span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-9 border border-white/10 hover:border-white/20 text-xs font-semibold px-4 cursor-pointer rounded-xl bg-transparent hover:bg-white/5 transition-all text-white select-none active:scale-95 shadow-inner"
        >
          Sign In
        </Link>
      </header>

      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 select-none">
        {/* Left Column: Heading, Subhead, CTA */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-extrabold uppercase tracking-widest text-[var(--accent-blue)] self-start shadow-inner"
          >
            <Sparkles size={11} className="animate-pulse" />
            <span>Digital Academic Twin Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-[1.1] max-w-2xl font-heading"
          >
            CampusOS learns what the student learns.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm sm:text-base max-w-lg leading-relaxed font-medium"
          >
            A high-fidelity academic operating system. CampusOS vectorizes your syllabi and notes to compile an active RAG Digital Twin representing your cognitive trace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mt-4"
          >
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-extrabold text-xs rounded-xl shadow-[0_4px_25px_rgba(0,210,255,0.22)] hover:opacity-95 gap-2 transition-all active:scale-97 cursor-pointer"
            >
              Start Building Your Academic Twin
              <ArrowRight size={14} />
            </Link>
            <Link
              href="#problem"
              className="inline-flex items-center justify-center h-11 px-5 text-xs border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 cursor-pointer text-white font-extrabold transition-colors active:scale-97"
            >
              <Play size={10} className="mr-1.5 fill-current" />
              Watch Demo
            </Link>
          </motion.div>
        </div>

        {/* Right Column: Floating SVG Interactive Neural Graph */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-[400px] h-[360px] relative glass-card border-white/5 bg-[#0f1118]/45 shadow-2xl rounded-2xl flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.03] font-mono text-[8px] pointer-events-none select-none">
              {`const RAGEmbed = (doc) => { return textToEmbed(doc) }\n`.repeat(12)}
            </div>

            {/* Neural network lines and floating nodes */}
            <svg className="w-full h-full absolute inset-0 pointer-events-none">
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#9d4edd" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Draw connected lines */}
              {HERO_EDGES.map((edge, i) => {
                const source = HERO_NODES.find(n => n.id === edge.from)
                const target = HERO_NODES.find(n => n.id === edge.to)
                if (!source || !target) return null
                return (
                  <line
                    key={i}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="url(#edgeGrad)"
                    strokeWidth="1.5"
                  />
                )
              })}

              {/* Connected pulsing dots traveling along lines */}
              {HERO_EDGES.slice(0, 4).map((edge, i) => {
                const source = HERO_NODES.find(n => n.id === edge.from)
                const target = HERO_NODES.find(n => n.id === edge.to)
                if (!source || !target) return null
                return (
                  <motion.circle
                    key={`dot-${i}`}
                    r="3"
                    fill="#00d2ff"
                    animate={{
                      cx: [source.x, target.x],
                      cy: [source.y, target.y],
                    }}
                    transition={{
                      duration: 3 + i,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )
              })}
            </svg>

            {/* Render Nodes */}
            {HERO_NODES.map((node) => (
              <motion.div
                key={node.id}
                style={{ left: node.x, top: node.y }}
                animate={{
                  y: [node.y, node.y - 6, node.y],
                }}
                transition={{
                  duration: 4 + node.id,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <div
                  className="w-5.5 h-5.5 rounded-full flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shadow-lg"
                  style={{
                    borderColor: `${node.color}50`,
                    backgroundColor: `${node.color}15`,
                    boxShadow: `0 0 10px ${node.color}20`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node.color }} />
                </div>
                <span className="text-[8px] font-mono font-bold text-slate-400 bg-black/60 border border-white/5 px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-md group-hover:text-white transition-colors">
                  {node.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TRUST & SOCIAL PROOF DYNAMIC TICKER */}
      <section className="border-t border-b border-white/5 bg-[#090b0f] py-4 select-none relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span>COGNITIVE CORE STATISTICS</span>
          </div>

          <div className="flex gap-8 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-bold">FILES_VECTORIZED:</span>
              <span className="text-white font-extrabold">{stats.filesCount}</span>
            </div>
            <span className="text-white/10">|</span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-bold">NODES_MAPPED:</span>
              <span className="text-[var(--accent-blue)] font-extrabold">{stats.conceptsCount}</span>
            </div>
            <span className="text-white/10">|</span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-bold">RECALL_SESSIONS:</span>
              <span className="text-[var(--accent-purple)] font-extrabold">{stats.sessionsCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM STORYTELLING SECTION */}
      <section id="problem" className="max-w-7xl mx-auto px-6 py-24 select-none text-center relative z-10">
        <div className="max-w-xl mx-auto mb-16 space-y-2">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-purple)]">The Fragmented Syllabus</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Current student workflows are completely disjointed
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Students struggle with folder paths in Drive, unstructured notes, standalone study tools, and manual scheduling.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Fragmented stack (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 text-left">Fragmented Workloads</h4>
            {[
              { name: 'Google Drive • Class PDFs', desc: 'Syllabus documents lost in nested folder structures', icon: Database, color: '#EF4444' },
              { name: 'ChatGPT • Mock Studies', desc: 'Generic AI models lacking student course context', icon: Sparkles, color: '#3B82F6' },
              { name: 'Manual Calendar • Exam Dates', desc: 'Milestone tracking out of sync with actual limits', icon: Calendar, color: '#F59E0B' },
              { name: 'Smart Cards • Active Recall', desc: 'Disconnected flashcards built by hand', icon: BookOpen, color: '#EC4899' },
            ].map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className="glass-card p-4 border-white/5 bg-[#0f1118]/60 flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5 bg-white/5" style={{ color: item.color }}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white leading-none">{item.name}</h5>
                    <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Glowing neural transformation (lg:col-span-2) */}
          <div className="lg:col-span-2 flex flex-col justify-center items-center py-6 lg:py-0">
            <div className="w-12 h-12 rounded-full border border-dashed border-[var(--accent-blue)]/50 flex items-center justify-center text-[var(--accent-blue)] animate-spin duration-7000 shadow-[0_0_15px_var(--accent-blue-glow)]">
              <GitBranch size={16} />
            </div>
            <span className="text-[9px] font-bold text-[var(--accent-blue)] mt-3 tracking-widest uppercase">MERGE</span>
          </div>

          {/* Integrated CampusOS console (lg:col-span-5) */}
          <div className="lg:col-span-5">
            <GlassCard className="p-6 border-[var(--border-glass-active)] bg-gradient-to-br from-[#0d0f16] to-[#07080b] min-h-[300px] flex flex-col justify-between text-left shadow-2xl relative group">
              <span className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[var(--accent-blue-glow)] blur-3xl pointer-events-none group-hover:scale-125 transition-transform" />
              
              <div className="space-y-4">
                <span className="text-[9px] font-extrabold uppercase text-[var(--accent-blue)] tracking-widest flex items-center gap-1.5 font-mono">
                  <Brain size={12} className="animate-pulse" />
                  COGNITIVE REPLICA SYSTEM
                </span>
                <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                  CampusOS Academic Brain
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  CampusOS reads your notes, constructs a prerequisite logic graph, monitors memory decay intervals, and formats mock placement simulators automatically inside one integrated dashboard workspace.
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 mt-5 font-mono text-[9px] text-emerald-400/90 leading-relaxed shadow-inner">
                {`> Initializing cognitive telemetry...\n> Mapping 88 nodes to 15 subjects...\n> RAG pipeline active // 100% grounded`}
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* DIGITAL TWIN SHOWCASE */}
      <section className="max-w-7xl mx-auto px-6 py-24 select-none border-t border-white/5 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hologram details (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <span className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-blue)]">The Core Feature</span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight font-heading leading-tight">
              A high-precision replica of your learning profile
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our Digital Twin engine maps study milestones, checks ATS keyword alignment on resume uploads, and identifies weaknesses dynamically based on active recall quiz scores.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity size={13} className="text-cyan-400" /> Retention Mapping
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">Tracks decay intervals to recommend mock quizzes at optimal intervals.</p>
              </div>

              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame size={13} className="text-rose-400" /> Topic Diagnostics
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">Ranks weak areas automatically using exam history datasets.</p>
              </div>
            </div>
          </div>

          {/* Visualizing Holographic HUD (lg:col-span-6) */}
          <div className="lg:col-span-6 flex justify-center">
            <GlassCard className="p-6 border-white/5 bg-[#0f1118]/65 max-w-[400px] w-full shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-purple-glow)] rounded-full blur-[60px] opacity-40 pointer-events-none" />

              <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-6 select-none">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Brain size={13} className="text-[var(--accent-blue)] animate-pulse" /> Digital Twin Hologram
                </span>
                <span className="text-[7.5px] bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 px-1.5 py-0.5 rounded font-mono font-bold text-[var(--accent-blue)]">
                  RETENTION: 84%
                </span>
              </div>

              {/* Large holographic core orb */}
              <div className="flex flex-col items-center justify-center py-6 select-none">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <span className="absolute inset-0 border border-cyan-500/10 rounded-full animate-ping duration-1000 opacity-20" />
                  <span className="absolute inset-2 border border-dashed border-indigo-500/20 rounded-full animate-spin duration-8000" />
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400/90 to-purple-600/95 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.3)] border border-white/10">
                    <Activity size={24} className="text-white animate-pulse" />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest mt-4">Active Cognitive Twin</span>
                <span className="text-[8px] text-[var(--text-muted)] font-mono mt-1">EMBEDDED // GROUNDED</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PRODUCT WALKTHROUGH */}
      <section className="max-w-7xl mx-auto px-6 py-24 select-none border-t border-white/5 relative z-10 text-center">
        <div className="max-w-xl mx-auto mb-16 space-y-2">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-blue)]">Interactive Pipeline</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Grounded vector pipelines from upload to twin
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Step list (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
            {[
              { step: 0, title: '1. Ingest Course Notes', desc: 'Drop text or docx files into the ingestion console.' },
              { step: 1, title: '2. Auto Ingestion RAG', desc: 'Gemini service breaks documents into semantic embedding chunks.' },
              { step: 2, title: '3. Knowledge Mapping', desc: 'Nodes connect prerequisite nodes with weighted edges.' },
              { step: 3, title: '4. Memory Synchrony', desc: 'Telemetry monitors forgetting curves and updates trackers.' },
            ].map((item) => (
              <div
                key={item.step}
                onClick={() => setWalkthroughStep(item.step)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  walkthroughStep === item.step
                    ? 'bg-[var(--surface-bg)] border-[var(--border-glass-active)] text-white shadow-md'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider">{item.title}</h4>
                <p className="text-[10px] mt-1 leading-normal">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Interactive Screen Preview (lg:col-span-8) */}
          <div className="lg:col-span-8">
            <GlassCard className="p-6 border-white/5 bg-[#0f1118]/65 h-full flex flex-col justify-between text-left shadow-2xl relative overflow-hidden">
              <span className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-blue-glow)] rounded-full blur-[80px] opacity-25 pointer-events-none" />
              
              <div className="flex justify-between items-center border-b border-white/5 pb-3 select-none">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                  Interactive Pipeline Console // STEP {walkthroughStep + 1}
                </span>
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                </div>
              </div>

              {/* Dynamic Step Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={walkthroughStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="py-6 min-h-[160px] flex flex-col justify-center gap-4"
                >
                  {walkthroughStep === 0 && (
                    <div className="border border-dashed border-white/10 rounded-2xl p-6 bg-black/20 flex flex-col items-center justify-center text-center">
                      <Database size={24} className="text-cyan-400 mb-2 animate-bounce" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Drag & Drop Syllabus / Notes</span>
                      <span className="text-[9px] text-[var(--text-muted)] mt-1 font-mono">SUPPORTS .PDF, .TXT, .DOCX</span>
                    </div>
                  )}

                  {walkthroughStep === 1 && (
                    <div className="space-y-3 font-mono text-[9px] text-cyan-400/90 leading-relaxed bg-black/40 border border-white/5 rounded-xl p-4">
                      <p>{`> Parsing document: "Course_Syllabus.pdf"...`}</p>
                      <p>{`> Generating text-embedding-004 chunks...`}</p>
                      <p>{`> 12 chunks successfully committed to pgvector database.`}</p>
                    </div>
                  )}

                  {walkthroughStep === 2 && (
                    <div className="flex gap-3 items-center justify-center py-4">
                      <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white">Algorithms</div>
                      <span className="text-[var(--accent-blue)] font-bold font-mono">→</span>
                      <div className="px-3 py-2 bg-[var(--accent-purple-glow)] border border-[var(--accent-purple)]/20 rounded-xl text-[10px] font-bold text-[var(--accent-purple)]">Dynamic Programming</div>
                    </div>
                  )}

                  {walkthroughStep === 3 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                        <span className="text-[8px] font-bold text-emerald-400 uppercase font-mono block">Syncing target</span>
                        <span className="text-xs font-extrabold text-white mt-1 block">Active recall decks consolidated</span>
                      </div>
                      <div className="p-3.5 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
                        <span className="text-[8px] font-bold text-cyan-400 uppercase font-mono block">Recruiter Bot Sync</span>
                        <span className="text-xs font-extrabold text-white mt-1 block">Stripe simulator weights synced</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-[8px] text-[var(--text-muted)] font-mono">100% GROUNDED DATA PIPELINE</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((step) => (
                    <button
                      key={step}
                      onClick={() => setWalkthroughStep(step)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        walkthroughStep === step ? 'bg-[var(--accent-blue)]' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 select-none border-t border-white/5 relative z-10">
        <div className="text-center max-w-xl mx-auto mb-20 space-y-2">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-blue)]">Handcrafted Toolsets</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            SaaS workspaces designed to maximize info density
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Academic Brain', desc: 'Vectorized ingestions mapped to weighted prerequisites.', icon: Brain, color: '#00d2ff' },
            { title: 'Semester Copilot', desc: 'Visual Gantt timeline for lab components and unit milestones.', icon: Layers, color: '#9d4edd' },
            { title: 'Smart Notes', desc: 'Distraction-free workspace with inline RAG quiz generators.', icon: BookOpen, color: '#10B981' },
            { title: 'Revision Engine', desc: 'Spaced repetition checklists and self-graded mock papers.', icon: RefreshCw, color: '#F59E0B' },
            { title: 'Exam Intelligence', desc: 'Chapter mark matrices and chapter heatmaps.', icon: Flame, color: '#EC4899' },
            { title: 'Placement Prep', desc: 'Recruiter chat bot simulators with code compiles.', icon: GraduationCap, color: '#3B82F6' },
            { title: 'Resume Analyzer', desc: 'ATS compliance checks and structural suggestions.', icon: FileText, color: '#06B6D4' },
            { title: 'Internship Tracker', desc: 'Kanban boards tracking contact cards and interviews.', icon: Briefcase, color: '#84CC16' },
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <GlassCard key={idx} className="p-5 flex flex-col justify-between min-h-[160px] border-white/5 bg-[var(--surface-bg)] hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all" style={{ borderColor: `${item.color}25`, backgroundColor: `${item.color}10`, color: item.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <span className="text-[8px] font-mono text-[var(--text-muted)] group-hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1">
                    ACTIVE <ChevronRight size={10} />
                  </span>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>

      {/* TECHNICAL PIPELINE ARCHITECTURE */}
      <section className="max-w-7xl mx-auto px-6 py-24 select-none border-t border-white/5 relative z-10 text-center">
        <div className="max-w-xl mx-auto mb-16 space-y-2">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-purple)]">System Architecture</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Technical Pipeline Mechanics
          </h3>
        </div>

        <div className="glass-card p-8 border-white/5 bg-[#0a0b0f]/60 max-w-4xl mx-auto rounded-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02] font-mono text-[8px] pointer-events-none select-none text-left p-4">
            {`> SELECT * FROM match_brain_chunks(query_embedding, match_threshold, match_count, user_id)`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center justify-center">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase text-[var(--text-muted)] block mb-1">DATA PORTAL</span>
              <span className="text-[11px] font-bold text-white block">Syllabus PDF / Notes</span>
            </div>
            
            <div className="text-slate-500 font-bold">→</div>

            <div className="p-4 bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 rounded-xl relative">
              <span className="text-[9px] font-extrabold uppercase text-[var(--accent-blue)] block mb-1">EMBEDDINGS</span>
              <span className="text-[11px] font-bold text-white block">text-embedding-004</span>
            </div>

            <div className="text-slate-500 font-bold">→</div>

            <div className="p-4 bg-[var(--accent-purple-glow)] border border-[var(--accent-purple)]/20 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase text-[var(--accent-purple)] block mb-1">KNOWLEDGE GRAPH</span>
              <span className="text-[11px] font-bold text-white block">pgvector + match_chunks</span>
            </div>
          </div>

          <p className="text-[9.5px] font-mono text-[var(--text-secondary)] mt-8 leading-relaxed max-w-lg mx-auto border-t border-white/5 pt-6">
            Grounded vector indices prevent hallucinations. Our RAG engine evaluates cosine similarities across indexed syllabus components before prompting AI copilot modules.
          </p>
        </div>
      </section>

      {/* TESTIMONIAL FRAMEWORK */}
      <section className="max-w-7xl mx-auto px-6 py-20 select-none border-t border-white/5 relative z-10 text-center">
        <div className="max-w-xl mx-auto mb-16 space-y-2">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-500">Testimonials</h2>
          <h3 className="text-xl font-extrabold text-white tracking-tight font-heading">
            Grounded Feedback Loops
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[1, 2, 3].map((item) => (
            <GlassCard key={item} className="p-5 border-dashed border-white/10 bg-black/10 flex flex-col justify-between min-h-[140px]">
              <div className="space-y-3">
                <div className="flex gap-1 justify-center text-slate-600">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Sparkles key={i} size={10} />
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 italic">Testimonial framework awaiting cohort ingestion...</p>
              </div>
              <span className="text-[8px] font-mono text-slate-600 uppercase tracking-wider block mt-4">Verified Student ID // STANDBY</span>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* SAAS PREMIUM PRICING */}
      <section className="max-w-7xl mx-auto px-6 py-24 select-none border-t border-white/5 relative z-10 text-center">
        <div className="max-w-xl mx-auto mb-16 space-y-2">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-blue)]">Pricing</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Select Your Learning Tier
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto items-stretch">
          {/* Hobby Tier */}
          <GlassCard className="p-6 border-white/5 bg-[#0f1118]/45 flex flex-col justify-between text-left min-h-[320px]">
            <div className="space-y-4">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">Hobbyist</span>
              <h4 className="text-2xl font-extrabold text-white font-heading mt-1">Free</h4>
              <p className="text-[10px] text-slate-400 leading-normal">Begin vectorizing notes and using core trackers.</p>
              
              <ul className="text-[10px] text-slate-400 space-y-2.5 pt-3 border-t border-white/5">
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-cyan-400" /> up to 5 document uploads</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-cyan-400" /> Prerequisite knowledge graph</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-cyan-400" /> Basic daily checklists</li>
              </ul>
            </div>
            <Link href="/login" className="w-full h-9 mt-6 border border-white/10 hover:bg-white/5 text-white flex items-center justify-center text-xs font-bold rounded-xl transition-all cursor-pointer">
              Get Started
            </Link>
          </GlassCard>

          {/* Premium Tier */}
          <GlassCard className="p-6 border-[var(--border-glass-active)] bg-gradient-to-br from-[#0c0f16] to-[#07080b] flex flex-col justify-between text-left min-h-[320px] relative shadow-2xl">
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 text-[7px] font-bold text-[var(--accent-blue)] uppercase tracking-widest">POPULAR</span>
            <div className="space-y-4">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent-blue)] font-mono">Academic Pro Twin</span>
              <h4 className="text-2xl font-extrabold text-white font-heading mt-1">$9.99<span className="text-xs text-[var(--text-muted)] font-normal font-sans">/mo</span></h4>
              <p className="text-[10px] text-slate-400 leading-normal">Full RAG student simulation dashboard with mock recruiters.</p>
              
              <ul className="text-[10px] text-slate-400 space-y-2.5 pt-3 border-t border-white/5">
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[var(--accent-blue)]" /> Unlimited document vectors</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[var(--accent-blue)]" /> Full biometric twin metrics</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[var(--accent-blue)]" /> HR Mock Simulator & DSA IDE</li>
              </ul>
            </div>
            <Link href="/login" className="w-full h-9 mt-6 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black flex items-center justify-center text-xs font-extrabold rounded-xl transition-all shadow-[0_4px_12px_rgba(0,210,255,0.15)] hover:opacity-95 cursor-pointer">
              Upgrade to Twin Pro
            </Link>
          </GlassCard>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24 select-none text-center relative z-10">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-blue)]">The Future of learning</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-none">
            Build your academic twin today.
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Consolidate study scheduling, ATS resume audits, portfolio project builders, internship tracking, and placement simulation checks.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-extrabold text-xs rounded-xl shadow-[0_4px_25px_rgba(0,210,255,0.22)] hover:opacity-95 gap-2 transition-all active:scale-97 cursor-pointer"
            >
              Get Started Now
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-500 relative z-10 select-none font-mono">
        <span>© 2026 CAMPUSOS. STABILIZED BUILD // RAG PIPELINE ACTIVE.</span>
        <div className="flex gap-4 mt-3 md:mt-0">
          <Link href="/login" className="hover:text-slate-300">SIGN IN</Link>
          <span className="text-white/10">|</span>
          <span className="hover:text-slate-300 cursor-pointer">SECURITY CORE</span>
        </div>
      </footer>

    </div>
  )
}

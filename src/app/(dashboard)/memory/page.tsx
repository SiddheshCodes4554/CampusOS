'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Brain,
  Loader2,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  Sliders,
  History,
  BookOpen,
  Activity,
  Battery,
  Hourglass,
  Cpu,
  ArrowRight
} from 'lucide-react'

// Interfaces
interface CognitiveProfile {
  learningStyle: string
  repetitionScale: string
}

interface StudentMemory {
  user_id: string
  preferred_study_time: string
  weak_areas: string[]
  strong_areas: string[]
  average_focus_duration: number
  cognitive_profile: CognitiveProfile
  recent_topics_studied: string[]
  last_sync_at: string
}

interface MemoryLog {
  id: string
  event_type: 'notes_upload' | 'quiz_completed' | 'revision_done' | 'study_habit' | 'goal_reached'
  details: {
    summary?: string
    topics_detected?: number
    subject?: string
    duration?: number
    grade?: number
  }
  created_at: string
}

interface TwinProjection {
  monologue: string
  decayAlerts: string[]
  priorityAction: string
  projectRelevance: string
  telemetry: {
    forgettingIndex: number
    focusBattery: number
    latencyMs: number
    density: number
  }
}

export default function MemoryProfilePage() {
  const [isPending, startTransition] = useTransition()

  // State Management
  const [loading, setLoading] = useState(true)
  const [loadingTwin, setLoadingTwin] = useState(true)
  const [profile, setProfile] = useState<StudentMemory>({
    user_id: '',
    preferred_study_time: 'evening',
    weak_areas: [],
    strong_areas: [],
    average_focus_duration: 45,
    cognitive_profile: {
      learningStyle: 'Active Recall',
      repetitionScale: 'Medium'
    },
    recent_topics_studied: [],
    last_sync_at: ''
  })
  
  const [logs, setLogs] = useState<MemoryLog[]>([])

  // Twin Projections State
  const [twinData, setTwinData] = useState<TwinProjection>({
    monologue: "Analyzing our cognitive data structure...",
    decayAlerts: [],
    priorityAction: "Synchronize learning states",
    projectRelevance: "Correlating active project requirements",
    telemetry: {
      forgettingIndex: 80,
      focusBattery: 90,
      latencyMs: 140,
      density: 45
    }
  })

  // Twin Simulated State Values (HUD reactive states)
  const [simStamina, setSimStamina] = useState(90)
  const [simRetention, setSimRetention] = useState(82)
  const [simLatency, setSimLatency] = useState(140)
  const [simDensity, setSimDensity] = useState(45)

  // Editable fields
  const [editMode, setEditMode] = useState(false)
  const [studyTime, setStudyTime] = useState('evening')
  const [focusDur, setFocusDur] = useState('45')
  const [learningStyle, setLearningStyle] = useState('Active Recall')
  const [repetitionScale, setRepetitionScale] = useState('Medium')

  useEffect(() => {
    fetchMemoryData()
    fetchTwinProjections()
  }, [])

  const fetchMemoryData = async () => {
    try {
      const profileRes = await fetch('/api/memory/profile')
      const profileData = await profileRes.json()
      if (profileData && !profileData.error) {
        setProfile(profileData)
        setStudyTime(profileData.preferred_study_time)
        setFocusDur(String(profileData.average_focus_duration))
        setLearningStyle(profileData.cognitive_profile?.learningStyle || 'Active Recall')
        setRepetitionScale(profileData.cognitive_profile?.repetitionScale || 'Medium')
      }

      const storedLogs = localStorage.getItem('campusos_local_memory_logs')
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs))
      } else {
        const initialLogs: MemoryLog[] = [
          {
            id: '1',
            event_type: 'notes_upload',
            details: { summary: 'Ingested "Operating Systems Coursework.docx" into Academic Brain', topics_detected: 8 },
            created_at: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: '2',
            event_type: 'quiz_completed',
            details: { summary: 'Completed "Binary Search Trees" Practice Quiz', grade: 85 },
            created_at: new Date(Date.now() - 3600000 * 24).toISOString()
          },
          {
            id: '3',
            event_type: 'revision_done',
            details: { summary: 'Checked off 1-Day revision timeline milestones for Database Systems' },
            created_at: new Date(Date.now() - 3600000 * 48).toISOString()
          }
        ]
        setLogs(initialLogs)
        localStorage.setItem('campusos_local_memory_logs', JSON.stringify(initialLogs))
      }
    } catch (err) {
      console.error('Failed to load cognitive memory:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTwinProjections = async () => {
    try {
      setLoadingTwin(true)
      const res = await fetch('/api/memory/twin-recommendation')
      const data = await res.json()
      if (data && !data.error) {
        setTwinData(data)
        setSimStamina(data.telemetry?.focusBattery || 90)
        setSimRetention(data.telemetry?.forgettingIndex || 82)
        setSimLatency(data.telemetry?.latencyMs || 140)
        setSimDensity(data.telemetry?.density || 45)
      }
    } catch (e) {
      console.error('Failed to fetch twin projections:', e)
    } finally {
      setLoadingTwin(false)
    }
  }

  // Sync Rebuild Memory Action
  const handleRebuildMemory = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/memory/sync', {
          method: 'POST'
        })
        const updated = await res.json()
        if (updated && !updated.error) {
          setProfile(updated)
          setStudyTime(updated.preferred_study_time)
          setFocusDur(String(updated.average_focus_duration))
          setLearningStyle(updated.cognitive_profile?.learningStyle || 'Active Recall')
          setRepetitionScale(updated.cognitive_profile?.repetitionScale || 'Medium')

          // Add a local log audit item
          const newLog: MemoryLog = {
            id: `local-log-${Date.now()}`,
            event_type: 'study_habit',
            details: { summary: 'Synchronized cognitive student profile and rebuilt RAG parameters.' },
            created_at: new Date().toISOString()
          }
          const updatedLogs = [newLog, ...logs]
          setLogs(updatedLogs)
          localStorage.setItem('campusos_local_memory_logs', JSON.stringify(updatedLogs))
          
          // Re-fetch twin projections
          fetchTwinProjections()
        } else {
          alert('Sync failed: ' + (updated.error || 'Server error.'))
        }
      } catch (err) {
        console.error(err)
        alert('Server error executing memory rebuild sync.')
      }
    })
  }

  // Update profile PATCH
  const handleUpdateProfile = () => {
    const payload = {
      preferredStudyTime: studyTime,
      averageFocusDuration: parseInt(focusDur, 10),
      cognitiveProfile: {
        learningStyle,
        repetitionScale
      }
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/memory/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const result = await res.json()
        if (result && !result.error) {
          setProfile(prev => ({
            ...prev,
            preferred_study_time: studyTime,
            average_focus_duration: parseInt(focusDur, 10),
            cognitive_profile: {
              learningStyle,
              repetitionScale
            }
          }))
          setEditMode(false)
          fetchTwinProjections()
        } else {
          setProfile(prev => ({
            ...prev,
            preferred_study_time: studyTime,
            average_focus_duration: parseInt(focusDur, 10),
            cognitive_profile: {
              learningStyle,
              repetitionScale
            }
          }))
          setEditMode(false)
        }
      } catch (err) {
        console.error(err)
      }
    })
  }

  // Simulation Triggers
  const triggerStudySession = () => {
    setSimStamina(prev => Math.max(10, prev - 20))
    setSimRetention(prev => Math.min(100, prev + 8))
    setSimLatency(prev => Math.max(90, prev - 25))
    setSimDensity(prev => Math.min(100, prev + 2))

    const newLog: MemoryLog = {
      id: `sim-log-${Date.now()}`,
      event_type: 'revision_done',
      details: { summary: 'Simulated 1 Hour Intense Recall Session. Cognitive stamina depleted, retention index boosted.' },
      created_at: new Date().toISOString()
    }
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem('campusos_local_memory_logs', JSON.stringify(updatedLogs))
  }

  const triggerRestCycle = () => {
    setSimStamina(100)
    setSimLatency(prev => Math.max(100, prev - 10))

    const newLog: MemoryLog = {
      id: `sim-log-${Date.now()}`,
      event_type: 'study_habit',
      details: { summary: 'Simulated sleep/rest cycle. Cognitive double focus battery fully recharged.' },
      created_at: new Date().toISOString()
    }
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem('campusos_local_memory_logs', JSON.stringify(updatedLogs))
  }

  const triggerTimeSkip = () => {
    setSimRetention(prev => Math.max(30, prev - 12))
    setSimLatency(prev => Math.min(300, prev + 40))

    const newLog: MemoryLog = {
      id: `sim-log-${Date.now()}`,
      event_type: 'study_habit',
      details: { summary: 'Skipped 24 Hours. Spaced repetition decay applied. Memory retention decayed.' },
      created_at: new Date().toISOString()
    }
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem('campusos_local_memory_logs', JSON.stringify(updatedLogs))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 select-text">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Brain size={18} />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              AI Student Digital Twin HUD
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            A real-time cognitive replica representing your memory retention, study stamina, and retrieval health derived from notes and tests.
          </p>
        </div>

        {/* Sync Rebuild trigger in header */}
        <div className="flex items-center gap-3">
          {profile.last_sync_at && (
            <span className="text-[9px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">
              Twin Synced: {new Date(profile.last_sync_at).toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleRebuildMemory}
            disabled={isPending}
            className="bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-xs font-bold py-1.5 h-8 select-none shadow-[0_2px_10px_rgba(6,182,212,0.18)] border-0 cursor-pointer rounded-xl flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Syncing Twin...
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                Sync Twin State
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col gap-3 justify-center items-center select-none">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
          <span className="text-xs text-[var(--text-muted)] font-semibold">Retrieving Cognitive Maps...</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 1. DIGITAL TWIN HOLOGRAM CORE & TELEMETRY HUD (NEW PREMIM FEATURE) */}
          <GlassCard className="p-6 border-white/5 bg-[#12131A]/60">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Twin Consciousness Pulsing Orbe (lg:col-span-4) */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center py-6 border-b lg:border-b-0 lg:border-r border-white/5 pr-0 lg:pr-8 select-none">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Outer breathing shell */}
                  <span className="absolute w-40 h-40 rounded-full border border-cyan-500/20 animate-ping duration-1000 opacity-20" />
                  {/* Scanning ring */}
                  <span className="absolute w-36 h-36 rounded-full border border-dashed border-indigo-500/30 animate-spin duration-10000" />
                  
                  {/* Rotating orbital core particles */}
                  <div className="absolute inset-0 flex items-center justify-center animate-spin duration-7000">
                    <span className="absolute w-2 h-2 rounded-full bg-cyan-400 -top-1" />
                    <span className="absolute w-2 h-2 rounded-full bg-indigo-400 -bottom-1" />
                  </div>
                  
                  {/* Floating Glowing Core Orb */}
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-400/90 via-indigo-600/80 to-purple-600/95 flex flex-col items-center justify-center text-center shadow-[0_0_40px_rgba(6,182,212,0.4)] border border-white/20 relative group">
                    <Activity size={28} className="text-white animate-pulse" />
                    <span className="text-[8px] font-mono font-bold tracking-widest text-cyan-200 mt-2 uppercase">
                      TWIN ACTIVE
                    </span>
                    <span className="text-[7px] text-white/50 font-mono">
                      SYNC_OK
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-extrabold font-heading text-white tracking-widest mt-4 uppercase">
                  Cognitive Double Telemetry
                </h3>
                <p className="text-[9px] text-[var(--text-muted)] text-center max-w-xs mt-1 leading-relaxed">
                  Pulsating core indicators display synchronous learning loops and memory trace consolidation.
                </p>
              </div>

              {/* Dynamic Telemetry Ring Gauges (lg:col-span-8) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 select-none">
                  
                  {/* Gauge 1: Forgetting Index */}
                  <div className="flex flex-col items-center p-3 bg-black/25 border border-white/5 rounded-2xl relative">
                    <div className="relative w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" className="stroke-white/5 fill-transparent" strokeWidth="6" />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className="fill-transparent stroke-rose-500"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={(2 * Math.PI * 32) * (1 - simRetention / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-white">{simRetention}%</span>
                        <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider">RETENTION</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-rose-400 mt-2 flex items-center gap-1">
                      <Hourglass size={10} /> Spaced Interval
                    </span>
                  </div>

                  {/* Gauge 2: Focus Battery */}
                  <div className="flex flex-col items-center p-3 bg-black/25 border border-white/5 rounded-2xl relative">
                    <div className="relative w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" className="stroke-white/5 fill-transparent" strokeWidth="6" />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className="fill-transparent stroke-emerald-500"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={(2 * Math.PI * 32) * (1 - simStamina / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-white">{simStamina}%</span>
                        <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider">BATTERY</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 mt-2 flex items-center gap-1">
                      <Battery size={10} /> Focus Stamina
                    </span>
                  </div>

                  {/* Gauge 3: Retrieval Latency */}
                  <div className="flex flex-col items-center p-3 bg-black/25 border border-white/5 rounded-2xl relative">
                    <div className="relative w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" className="stroke-white/5 fill-transparent" strokeWidth="6" />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className="fill-transparent stroke-cyan-400"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 32}
                          // normalized latency visual scale (map 50-300ms to offset)
                          strokeDashoffset={(2 * Math.PI * 32) * (1 - Math.min(100, (simLatency / 300) * 100) / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-white">{simLatency}ms</span>
                        <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider">LATENCY</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-cyan-400 mt-2 flex items-center gap-1">
                      <Zap size={10} /> Recall Delay
                    </span>
                  </div>

                  {/* Gauge 4: Concept Index Density */}
                  <div className="flex flex-col items-center p-3 bg-black/25 border border-white/5 rounded-2xl relative">
                    <div className="relative w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" className="stroke-white/5 fill-transparent" strokeWidth="6" />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className="fill-transparent stroke-purple-500"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={(2 * Math.PI * 32) * (1 - simDensity / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-white">{simDensity}%</span>
                        <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider">DENSITY</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-purple-400 mt-2 flex items-center gap-1">
                      <Cpu size={10} /> Knowledge Base
                    </span>
                  </div>

                </div>

                {/* Simulation Control Console */}
                <div className="bg-black/15 p-4 rounded-xl border border-white/5 space-y-3">
                  <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">
                    Cognitive State Simulator (Interactive Sandbox)
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={triggerStudySession}
                      disabled={simStamina <= 10}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 disabled:bg-white/5 text-emerald-400 disabled:text-white/20 border border-emerald-500/20 disabled:border-white/5 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Simulate Study Session
                    </button>
                    <button
                      onClick={triggerRestCycle}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Simulate Rest & Sleep
                    </button>
                    <button
                      onClick={triggerTimeSkip}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Fast-Forward 24 Hours
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </GlassCard>

          {/* 2. PROACTIVE TWIN PROJECTIONS & RECENT TOPICS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Proactive Twin Projections Monologue (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              
              <GlassCard className="p-6 border-white/5 bg-[#12131A]/60 flex flex-col justify-between min-h-[300px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1.5 select-none">
                      <Cpu size={12} className="text-cyan-400" />
                      Twin Cognitive Projections
                    </h3>
                    <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold">
                      GEMINI ENGINE
                    </span>
                  </div>

                  {loadingTwin ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 select-none">
                      <Loader2 size={24} className="animate-spin text-cyan-400" />
                      <span className="text-[10px] text-[var(--text-secondary)]">Analyzing recall cycles...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Monologue first person voice block */}
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-4 relative">
                        <span className="absolute -top-3 left-4 text-3xl font-serif text-cyan-400/30 select-none">&ldquo;</span>
                        <p className="text-xs text-white leading-relaxed italic pr-2 pl-1 select-text">
                          {twinData.monologue}
                        </p>
                      </div>

                      {/* Memory Decay Warning Chips */}
                      {twinData.decayAlerts && twinData.decayAlerts.length > 0 && (
                        <div className="space-y-2 select-none">
                          <span className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)] tracking-wider flex items-center gap-1">
                            <AlertTriangle size={11} className="text-rose-400" /> Projected Memory Decay Candidates
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {twinData.decayAlerts.map((topic, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-xl bg-rose-500/[0.03] text-rose-400 border border-rose-500/15 text-[9px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.05)]"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Priority action trigger */}
                {!loadingTwin && twinData.priorityAction && (
                  <div className="mt-6 border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex flex-col select-none">
                      <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Twin Study Goal</span>
                      <span className="text-xs font-bold text-white mt-0.5">{twinData.priorityAction}</span>
                    </div>
                    <button
                      onClick={() => window.location.href = '/planner'}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-[10px] font-extrabold rounded-xl hover:opacity-90 flex items-center gap-1 cursor-pointer transition-all shrink-0 select-none"
                    >
                      Execute Priority Task <ArrowRight size={11} />
                    </button>
                  </div>
                )}
              </GlassCard>

            </div>

            {/* Right Column: Project Relevance & Study parameters (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Project Builder Academic Relevance */}
              <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-secondary)] border-b border-white/5 pb-2 flex items-center gap-1.5 select-none">
                  <Cpu size={12} className="text-indigo-400" />
                  Portfolio Relevance Loop
                </h3>
                {loadingTwin ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-1">
                    <Loader2 size={16} className="animate-spin text-indigo-400" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      {twinData.projectRelevance}
                    </p>
                    <div className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg p-2.5 leading-relaxed font-semibold">
                      Pro Tip: Completing tasks on your active portfolio project will strengthen recall in corresponding DSA and Database courses.
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Editable parameters card */}
              <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 select-none">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Sliders size={12} className="text-cyan-400" />
                    Cognitive Parameters
                  </h3>
                  <button
                    onClick={() => {
                      if (editMode) handleUpdateProfile()
                      else setEditMode(true)
                    }}
                    className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase cursor-pointer"
                  >
                    {editMode ? 'Save Settings' : 'Modify'}
                  </button>
                </div>

                {editMode ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5 select-none">
                      <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Preferred Study Hours</label>
                      <select
                        value={studyTime}
                        onChange={(e) => setStudyTime(e.target.value)}
                        className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="morning">Morning (6 AM - 12 PM)</option>
                        <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                        <option value="evening">Evening (5 PM - 10 PM)</option>
                        <option value="night">Night (10 PM - 6 AM)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Average Focus Duration (mins)</label>
                      <input 
                        type="number"
                        value={focusDur}
                        onChange={(e) => setFocusDur(e.target.value)}
                        className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1.5 select-none">
                      <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Preferred Learning Style</label>
                      <select
                        value={learningStyle}
                        onChange={(e) => setLearningStyle(e.target.value)}
                        className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="Active Recall">Active Recall Flashcards</option>
                        <option value="Spaced Repetition">Spaced Repetition Checklist</option>
                        <option value="Visual Maps">Visual Mind Maps</option>
                        <option value="Code Boilerplate">Boilerplate Monospace Coding</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 select-none">
                      <label className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)]">Revision Repetition Intensity</label>
                      <select
                        value={repetitionScale}
                        onChange={(e) => setRepetitionScale(e.target.value)}
                        className="w-full bg-[#16171E] border border-[var(--border-glass)] rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="Low">Low (1-3 Cycles)</option>
                        <option value="Medium">Medium (3-7 Cycles)</option>
                        <option value="High">High (7-15 Cycles)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 select-none">
                    <div className="flex items-center justify-between p-2.5 bg-black/15 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-cyan-400" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-extrabold uppercase text-[var(--text-muted)]">Study Hours</span>
                          <span className="text-xs font-bold text-white uppercase">{profile.preferred_study_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-black/15 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-indigo-400" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-extrabold uppercase text-[var(--text-muted)]">Focus stamina</span>
                          <span className="text-xs font-bold text-white">{profile.average_focus_duration} Minutes</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-black/15 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Zap size={13} className="text-emerald-400" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-extrabold uppercase text-[var(--text-muted)]">Learning Style</span>
                          <span className="text-xs font-bold text-white">{profile.cognitive_profile?.learningStyle || 'Active Recall'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>

            </div>

          </div>

          {/* 3. DYNAMIC CONCEPT MASTERY & LOGS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Mastery Maps (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-secondary)] border-b border-white/5 pb-2 select-none">
                  Concept Mastery Mapping
                </h3>

                <div className="space-y-4">
                  {/* Strong areas */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)] tracking-widest flex items-center gap-1.5 select-none">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      Mastered Concepts (High Trace)
                    </span>
                    {profile.strong_areas && profile.strong_areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.strong_areas.map((topic, idx) => (
                          <div 
                            key={idx} 
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/[0.03] text-emerald-400 border border-emerald-500/15 text-[9px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                          >
                            {topic}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-[var(--text-muted)] italic select-none">Database Normalization, API Design, HTTP protocol.</p>
                    )}
                  </div>

                  {/* Weak areas */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)] tracking-widest flex items-center gap-1.5 select-none">
                      <AlertTriangle size={12} className="text-rose-400" />
                      Vulnerable Concepts (Decaying Trace)
                    </span>
                    {profile.weak_areas && profile.weak_areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.weak_areas.map((topic, idx) => (
                          <div 
                            key={idx} 
                            className="px-2.5 py-1 rounded-xl bg-rose-500/[0.03] text-rose-400 border border-rose-500/15 text-[9px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.05)]"
                          >
                            {topic}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-[var(--text-muted)] italic select-none">Recursive Algorithms, Memory Allocation.</p>
                    )}
                  </div>
                </div>
              </GlassCard>

              {/* Ingested Documents List */}
              <GlassCard className="p-4 border-white/5 bg-[#12131A]/60 space-y-3 select-none">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2">
                  Twin Ingested Modules
                </h4>
                {profile.recent_topics_studied && profile.recent_topics_studied.length > 0 ? (
                  <div className="space-y-1.5">
                    {profile.recent_topics_studied.map((topic, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs p-1">
                        <BookOpen size={12} className="text-cyan-400 shrink-0" />
                        <span className="font-bold text-[var(--text-primary)]">{topic}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs p-1">
                      <BookOpen size={12} className="text-cyan-400 shrink-0" />
                      <span className="font-bold text-[var(--text-secondary)]">Syllabus: Advanced Operating Systems</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs p-1">
                      <BookOpen size={12} className="text-cyan-400 shrink-0" />
                      <span className="font-bold text-[var(--text-secondary)]">Notes: Binary Trees & Heaps</span>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Logs Timeline (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-secondary)] border-b border-white/5 pb-2 flex items-center gap-1.5 select-none">
                  <History size={12} className="text-indigo-400" />
                  Twin Cognitive Log Timeline
                </h3>

                <div className="space-y-4 relative pl-4 border-l border-white/5 max-h-[350px] overflow-y-auto pr-1">
                  {logs.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No timeline logged.</p>
                  ) : (
                    logs.map((log) => {
                      const isSim = log.id.startsWith('sim-log-')
                      const isLocal = log.id.startsWith('local-log-')
                      return (
                        <div key={log.id} className="relative space-y-1">
                          {/* Bullet point indicator */}
                          <div className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-cyan-400 border-2 border-[#12131A] shadow-sm" />
                          
                          <div className="flex items-center justify-between select-none">
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider ${
                              isSim 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {log.event_type.replace('_', ' ')}
                            </span>
                            <span className="text-[8px] font-mono text-[var(--text-muted)]">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-[10px] leading-relaxed text-[var(--text-secondary)] font-medium">
                            {log.details.summary}
                          </p>

                          {log.details.grade !== undefined && (
                            <span className="text-[9px] text-emerald-400 font-bold block select-none">Assessment Score: {log.details.grade}%</span>
                          )}

                          {(isLocal || isSim) && (
                            <span className="text-[8.5px] text-[var(--text-muted)] italic select-none">
                              {isSim ? 'Simulated inside HUD console' : 'Synchronized during sync'}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </GlassCard>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}

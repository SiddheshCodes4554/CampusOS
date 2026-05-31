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
  BookOpen
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

export default function MemoryProfilePage() {
  const [isPending, startTransition] = useTransition()

  // State Management
  const [loading, setLoading] = useState(true)
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

  // Editable fields
  const [editMode, setEditMode] = useState(false)
  const [studyTime, setStudyTime] = useState('evening')
  const [focusDur, setFocusDur] = useState('45')
  const [learningStyle, setLearningStyle] = useState('Active Recall')
  const [repetitionScale, setRepetitionScale] = useState('Medium')

  useEffect(() => {
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
          setLogs([
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
          ])
        }
      } catch (err) {
        console.error('Failed to load cognitive memory:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMemoryData()
  }, [])

  // Rebuild Memory Sync POST
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
        } else {
          // Fallback update
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
              CampusOS Memory
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            A persistent student learning memory profile tracking your study habits, quiz performance, and concept strengths to customize future AI plans.
          </p>
        </div>

        {/* Sync Rebuild trigger in header */}
        <div className="flex items-center gap-3">
          {profile.last_sync_at && (
            <span className="text-[9px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">
              Last Synced: {new Date(profile.last_sync_at).toLocaleTimeString()}
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
                Syncing Memory...
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                Rebuild Profile
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Cognitive Profile Card & Config Form (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Cognitive Profile visual stats */}
            <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2 select-none">
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Sliders size={12} className="text-cyan-400" />
                  Cognitive Learning Profile
                </h3>
                <button
                  onClick={() => {
                    if (editMode) handleUpdateProfile()
                    else setEditMode(true)
                  }}
                  className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase cursor-pointer"
                >
                  {editMode ? 'Save Changes' : 'Customize'}
                </button>
              </div>

              {editMode ? (
                // Edit controls Form
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
                // Visual presentation of parameters
                <div className="space-y-4 select-none">
                  
                  {/* Parameter: Study Hours */}
                  <div className="flex items-center justify-between p-3 bg-black/15 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-cyan-400" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider">Preferred Study Hours</span>
                        <span className="text-xs font-bold text-white uppercase">{profile.preferred_study_time}</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 uppercase font-bold">Synchronized</span>
                  </div>

                  {/* Parameter: Focus Stamina */}
                  <div className="flex items-center justify-between p-3 bg-black/15 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-indigo-400" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider">Focus Duration Stamina</span>
                        <span className="text-xs font-bold text-white">{profile.average_focus_duration} Minutes</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-bold">Measured</span>
                  </div>

                  {/* Parameter: Learning Style */}
                  <div className="flex items-center justify-between p-3 bg-black/15 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-emerald-400" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider">Preferred Learning Style</span>
                        <span className="text-xs font-bold text-white">{profile.cognitive_profile?.learningStyle || 'Active Recall'}</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-bold">Active</span>
                  </div>

                  {/* Parameter: Repetition Intensity */}
                  <div className="flex items-center justify-between p-3 bg-black/15 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Sliders size={14} className="text-amber-400" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider">Repetition Intensity Scale</span>
                        <span className="text-xs font-bold text-white">{profile.cognitive_profile?.repetitionScale || 'Medium'} Intensity</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-bold">Standard</span>
                  </div>

                </div>
              )}
            </GlassCard>

            {/* Ingested Documents Nodes Card */}
            <GlassCard className="p-4 border-white/5 bg-[#12131A]/60 space-y-3 select-none">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2">
                Recently Studied Courses
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
                <p className="text-[10px] text-[var(--text-muted)] italic py-2">No recently studied courses logged.</p>
              )}
            </GlassCard>

          </div>

          {/* Right Column: Knowledge Concept Map & Timeline logs (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* dynamic Knowledge Map Matrix */}
            <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 select-none">
                Dynamic Concept Mastery Map
              </h3>

              <div className="space-y-4">
                
                {/* 1. Strong Areas */}
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)] tracking-widest flex items-center gap-1 select-none">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    Areas of Mastery (High Competency)
                  </span>
                  {profile.strong_areas && profile.strong_areas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.strong_areas.map((topic, idx) => (
                        <div 
                          key={idx} 
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/[0.03] text-emerald-400 border border-emerald-500/15 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                        >
                          {topic}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-[var(--text-muted)] italic select-none">No strengths identified yet. Perform well on practice quizzes to log strengths.</p>
                  )}
                </div>

                {/* 2. Weak Areas */}
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)] tracking-widest flex items-center gap-1 select-none">
                    <AlertTriangle size={12} className="text-rose-400" />
                    Areas of Vulnerability (Under Review)
                  </span>
                  {profile.weak_areas && profile.weak_areas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.weak_areas.map((topic, idx) => (
                        <div 
                          key={idx} 
                          className="px-2.5 py-1 rounded-xl bg-rose-500/[0.03] text-rose-400 border border-rose-500/15 text-[10px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.05)]"
                        >
                          {topic}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-[var(--text-muted)] italic select-none">No weaknesses diagnosed yet. Study plans will customize topics evenly.</p>
                  )}
                </div>

              </div>
            </GlassCard>

            {/* Event logs Timeline */}
            <GlassCard className="p-5 border-white/5 bg-[#12131A]/60 space-y-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/5 pb-2 flex items-center gap-1.5 select-none">
                <History size={12} className="text-indigo-400" />
                Memory Activity Logs & Syncs
              </h3>

              <div className="space-y-4 relative pl-4 border-l border-white/5">
                {logs.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6 select-none">No logs registered yet.</p>
                ) : (
                  logs.map((log) => {
                    const isLocal = log.id.startsWith('local-log-')
                    return (
                      <div key={log.id} className="relative space-y-1">
                        {/* Bullet point indicator */}
                        <div className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-cyan-400 border-2 border-[#12131A] shadow-sm" />
                        
                        <div className="flex items-center justify-between select-none">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[7px] font-bold uppercase tracking-wider">
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
                          <span className="text-[9px] text-emerald-400 font-bold block select-none">Quiz Score: {log.details.grade}%</span>
                        )}

                        {isLocal && (
                          <span className="text-[8.5px] text-[var(--text-muted)] italic select-none">Synchronized during session sync</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </GlassCard>

          </div>

        </div>
      )}

    </div>
  )
}

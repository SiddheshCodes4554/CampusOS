'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  GraduationCap,
  Code2,
  Brain,
  Sparkles,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Terminal,
  Loader2,
  Award,
  RotateCcw,
  FileText
} from 'lucide-react'

// Score record type
interface ScoreRecord {
  id: string
  type: 'aptitude' | 'dsa' | 'hr' | 'interview_simulator'
  topic: string
  score: number
  total_questions: number | null
  details: {
    feedback?: string
    strengths?: string[]
    weaknesses?: string[]
    summary?: string
  } | null
  created_at: string
}

// Aptitude MCQ question type
interface AptitudeQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// DSA Coding problem type
interface DsaProblem {
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  inputOutput: string
  approach: string
  boilerplate: string
}

// HR Question type
interface HrQuestion {
  question: string
  starModel: {
    situation: string
    task: string
    action: string
    result: string
  }
  idealOutline: string
}

// Simulated interview dialog message
interface SimulatorMessage {
  role: 'interviewer' | 'candidate'
  content: string
  score?: number
  feedback?: string
}

export default function PlacementPage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // State Management
  const [scores, setScores] = useState<ScoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  // Active module tab: 'aptitude' | 'dsa' | 'hr' | 'simulator'
  const [activeModule, setActiveModule] = useState<'aptitude' | 'dsa' | 'hr' | 'simulator'>('aptitude')

  // --- Module 1: Aptitude Practice State ---
  const [aptitudeTopic, setAptitudeTopic] = useState('Quantitative')
  const [aptitudeQuestions, setAptitudeQuestions] = useState<AptitudeQuestion[]>([])
  const [aptitudeAnswers, setAptitudeAnswers] = useState<Record<number, number>>({})
  const [showAptitudeResults, setShowAptitudeResults] = useState(false)

  // --- Module 2: DSA Coding State ---
  const [dsaTopic, setDsaTopic] = useState('Arrays')
  const [dsaProblems, setDsaProblems] = useState<DsaProblem[]>([])
  const [selectedProblemIndex, setSelectedProblemIndex] = useState<number | null>(null)
  const [dsaViewMode, setDsaViewMode] = useState<'editor' | 'solution'>('editor')
  const [userCodeBoilerplate, setUserCodeBoilerplate] = useState('')
  const [completedDsaCount, setCompletedDsaCount] = useState<Record<string, boolean>>({})

  // --- Module 3: HR Questions State ---
  const [hrQuestions, setHrQuestions] = useState<HrQuestion[]>([])
  const [expandedStarQuestionIndex, setExpandedStarQuestionIndex] = useState<number | null>(null)

  // --- Module 4: AI Interview Simulator State ---
  const [jobRole, setJobRole] = useState('Software Engineer')
  const [simulatorStatus, setSimulatorStatus] = useState<'idle' | 'interviewing' | 'completed'>('idle')
  const [dialogHistory, setDialogHistory] = useState<SimulatorMessage[]>([])
  const [candidateResponse, setCandidateResponse] = useState('')
  
  // Final simulator summary statistics
  const [simulationResult, setSimulationResult] = useState<{
    overallScore: number
    strengths: string[]
    weaknesses: string[]
    summary: string
  } | null>(null)

  // Fetch past attempts on mount
  useEffect(() => {
    async function loadPlacementScores() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('placement_scores')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            if (error.code === '42P01') {
              setDbError('Scores table not initialized. Storing score logs in local session state.')
              loadLocalStorageFallback()
            } else {
              setDbError(error.message)
            }
          } else if (data) {
            setScores(data as ScoreRecord[])
          }
        } else {
          loadLocalStorageFallback()
        }
      } catch (err: unknown) {
        console.error('Failed to load placement scores:', err)
        setDbError('Error connecting to placement database.')
        loadLocalStorageFallback()
      } finally {
        setLoading(false)
      }
    }
    loadPlacementScores()
  }, [supabase])

  const loadLocalStorageFallback = () => {
    const saved = localStorage.getItem('campusos-placement-scores')
    if (saved) {
      try {
        setScores(JSON.parse(saved))
      } catch {
        setScores([])
      }
    } else {
      // Mock history log
      const mockScores: ScoreRecord[] = [
        {
          id: 'mock-1',
          type: 'aptitude',
          topic: 'Quantitative Aptitude',
          score: 100.0,
          total_questions: 3,
          details: null,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'mock-2',
          type: 'interview_simulator',
          topic: 'Software Engineer Interview',
          score: 84.0,
          total_questions: null,
          details: {
            summary: 'Good conversational engagement, clearly formulated logic schemas. Needs minor vocabulary polish.',
            strengths: ['Analytical logic', 'STAR method structure', 'Confidence'],
            weaknesses: ['Word choice pacing', 'Self-interruption', 'Detail explanations']
          },
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      setScores(mockScores)
      localStorage.setItem('campusos-placement-scores', JSON.stringify(mockScores))
    }
  }

  const syncToLocalStorage = (list: ScoreRecord[]) => {
    localStorage.setItem('campusos-placement-scores', JSON.stringify(list))
  }

  // Handle attempt deletion
  const handleDeleteAttempt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this score record?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !dbError && !id.startsWith('mock-')) {
        const { error } = await supabase
          .from('placement_scores')
          .delete()
          .eq('id', id)

        if (error) throw new Error(error.message)
      }

      const updated = scores.filter(s => s.id !== id)
      setScores(updated)
      syncToLocalStorage(updated)
    } catch (err: unknown) {
      console.error('Delete score attempt error:', err)
      alert('Failed to delete score record.')
    }
  }

  // --- SAVE SCORE CONTROLLER ---
  const saveScoreRecord = async (
    type: 'aptitude' | 'dsa' | 'hr' | 'interview_simulator',
    topic: string,
    scoreVal: number,
    totalQ: number | null,
    detailsVal: ScoreRecord['details']
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const scorePayload = {
        type,
        topic,
        score: scoreVal,
        total_questions: totalQ,
        details: detailsVal
      }

      if (user && !dbError) {
        const { data, error } = await supabase
          .from('placement_scores')
          .insert({ ...scorePayload, user_id: user.id })
          .select()
          .single()

        if (error) throw new Error(error.message)
        if (data) {
          setScores(prev => [data as ScoreRecord, ...prev])
        }
      } else {
        // Fallback local save
        const newRecord: ScoreRecord = {
          id: `local-${Date.now()}`,
          ...scorePayload,
          created_at: new Date().toISOString()
        }
        const updated = [newRecord, ...scores]
        setScores(updated)
        syncToLocalStorage(updated)
      }
    } catch (err: unknown) {
      console.error('Save score error:', err)
    }
  }

  // --- MODULE 1: APTITUDE CONTROLLER ---
  const handleGenerateAptitude = () => {
    setAptitudeQuestions([])
    setAptitudeAnswers({})
    setShowAptitudeResults(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/placement/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'aptitude',
            topic: aptitudeTopic
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(`Aptitude error: ${data.error}`)
        } else if (data.questions) {
          setAptitudeQuestions(data.questions)
        }
      } catch (err: unknown) {
        console.error('Aptitude generating error:', err)
        // Fallback Quant
        setAptitudeQuestions([
          {
            question: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
            options: ["120 meters", "150 meters", "180 meters", "324 meters"],
            correctIndex: 1,
            explanation: "Speed = 60 * (5/18) m/sec = 50/3 m/sec. Length of train = Speed * Time = (50/3) * 9 = 150 meters."
          },
          {
            question: "The average age of a class of 30 students is 15 years. If the age of the teacher is included, the average age increases by 1 year. What is the age of the teacher?",
            options: ["31 years", "45 years", "46 years", "50 years"],
            correctIndex: 2,
            explanation: "Sum of student ages = 30 * 15 = 450. New average with teacher = 16. Total sum with teacher = 31 * 16 = 496. Teacher age = 496 - 450 = 46 years."
          }
        ])
      }
    })
  }

  const submitAptitudeAnswers = () => {
    if (Object.keys(aptitudeAnswers).length < aptitudeQuestions.length) {
      alert('Please answer all questions before submitting.')
      return
    }

    let correctCount = 0
    aptitudeQuestions.forEach((q, idx) => {
      if (aptitudeAnswers[idx] === q.correctIndex) {
        correctCount++
      }
    })

    const finalPercent = Math.round((correctCount / aptitudeQuestions.length) * 100)
    setShowAptitudeResults(true)
    
    // Save to DB
    saveScoreRecord('aptitude', `${aptitudeTopic} Aptitude Practice`, finalPercent, aptitudeQuestions.length, null)
  }

  // --- MODULE 2: DSA CONTROLLER ---
  const handleGenerateDsa = () => {
    setDsaProblems([])
    setSelectedProblemIndex(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/placement/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'dsa',
            topic: dsaTopic
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(`DSA generate error: ${data.error}`)
        } else if (data.problems) {
          setDsaProblems(data.problems)
        }
      } catch (err: unknown) {
        console.error('DSA generation error:', err)
        // Fallback problems
        setDsaProblems([
          {
            title: "Two Sum",
            difficulty: "Easy",
            description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
            inputOutput: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].",
            approach: "Optimal Approach:\nHash Map search technique. Store elements as keys and their index as value. Compute difference: `diff = target - nums[i]`. If `diff` exists in hash map, return `[map.get(diff), i]`. O(n) runtime, O(n) space.",
            boilerplate: "function twoSum(nums, target) {\n  // Write your javascript code here\n  \n}"
          },
          {
            title: "Container With Most Water",
            difficulty: "Medium",
            description: "You are given an integer array `height` of length `n`. Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.",
            inputOutput: "Input: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49\nExplanation: The max water is formed between index 1 (height 8) and index 8 (height 7). Width is 8 - 1 = 7. Area = min(8, 7) * 7 = 49.",
            approach: "Optimal Approach:\nTwo-pointer technique. Place pointers at the beginning (`left`) and end (`right`). Compute area: `area = min(height[left], height[right]) * (right - left)`. Move the pointer pointing to the shorter height. O(n) time, O(1) space.",
            boilerplate: "function maxArea(height) {\n  // Write your code here\n  \n}"
          }
        ])
      }
    })
  }

  // Mark DSA coding problem solved
  const toggleDsaSolved = (problemTitle: string) => {
    const updated = {
      ...completedDsaCount,
      [problemTitle]: !completedDsaCount[problemTitle]
    }
    setCompletedDsaCount(updated)
    
    // Save record to DB history
    if (updated[problemTitle]) {
      saveScoreRecord('dsa', `DSA: ${problemTitle}`, 100.0, null, null)
    }
  }

  // --- MODULE 3: HR BEHAVIORAL CONTROLLER ---
  const handleGenerateHrQuestions = () => {
    setHrQuestions([])
    setExpandedStarQuestionIndex(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/placement/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'hr'
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(`HR questions failed: ${data.error}`)
        } else if (data.questions) {
          setHrQuestions(data.questions)
        }
      } catch (err: unknown) {
        console.error('HR questions error:', err)
        // Fallback HR Behavioral questions
        setHrQuestions([
          {
            question: "Describe a conflict you had with a team member during a university project and how you resolved it.",
            starModel: {
              situation: "A team member stopped contributing to a final semester machine learning project due to overlapping schedule constraints.",
              task: "We needed to complete the feature engineering pipeline and model training within 5 days to preserve our grade weights.",
              action: "I scheduled a 1-on-1 calls call to understand their workload. We compromised by shifting their duties to code documentation and visual slides which fit their hours, while I took over features.",
              result: "We integrated the model pipeline in time, scored an A grade, and maintained a collaborative friendly working relationship."
            },
            idealOutline: "Outline:\n1. State the project details and the issue neutrally (no personal blaming).\n2. Highlight your initiative to communicate directly and compromise.\n3. Show how workload re-distribution balanced capabilities.\n4. Close with key learning metrics (communication is prior to execution)."
          },
          {
            question: "Tell me about a time you failed to meet a deadline. What did you do and what were your key learnings?",
            starModel: {
              situation: "During an internship, I was tasked with migrating backend API controllers from Python to Node.js under a 2-week schedule.",
              task: "I under-estimated migration complexities (converting schema validations and third-party integrations).",
              action: "Once I realized I was running behind (Day 10), I notified my manager with a revised checklist, pushed overtime, and requested review assistance from a senior dev.",
              result: "The API migration completed 2 days late but was thoroughly audited, avoiding downtime. I learned to estimate task hours with a 20% complexity buffer."
            },
            idealOutline: "Outline:\n1. Admit the failure directly; take accountability.\n2. Detail proactive steps taken (early notification, escalating assistance request).\n3. Emphasize the final successful release without bugs.\n4. Highlight the professional growth (complexity estimations, communication buffer)."
          }
        ])
      }
    })
  }

  // --- MODULE 4: MOCK INTERVIEW SIMULATOR ---
  const handleStartInterview = () => {
    setDialogHistory([])
    setCandidateResponse('')
    setSimulationResult(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/placement/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'simulator_start',
            simulatorRole: jobRole
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(`Simulator failed: ${data.error}`)
        } else if (data.question) {
          setDialogHistory([
            { role: 'interviewer', content: data.message || 'Welcome to your simulated mock interview.' },
            { role: 'interviewer', content: data.question }
          ])
          setSimulatorStatus('interviewing')
        }
      } catch (err: unknown) {
        console.error('Simulator start error:', err)
        setDialogHistory([
          { role: 'interviewer', content: `Welcome to your simulated mock interview for the role of ${jobRole}.` },
          { role: 'interviewer', content: "Let's start. Tell me about a challenging coding or engineering project you completed recently. What tech stack did you use, and what was the main technical difficulty?" }
        ])
        setSimulatorStatus('interviewing')
      }
    })
  }

  const handleSendResponse = () => {
    if (!candidateResponse.trim()) return

    const userMsg: SimulatorMessage = { role: 'candidate', content: candidateResponse }
    const updatedHistory = [...dialogHistory, userMsg]
    setDialogHistory(updatedHistory)
    setCandidateResponse('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/placement/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'simulator_respond',
            topic: jobRole,
            message: userMsg.content,
            history: dialogHistory
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(data.error)
        } else {
          setDialogHistory(prev => [
            ...prev,
            { 
              role: 'interviewer', 
              content: data.nextQuestion,
              score: data.score,
              feedback: data.feedback
            }
          ])
        }
      } catch (err: unknown) {
        console.error('Simulator respond error:', err)
        // Recruiter bot fallback response
        setDialogHistory(prev => [
          ...prev,
          {
            role: 'interviewer',
            content: "Excellent points. How do you handle code documentation and git workflows when collaborating under tight milestones?",
            score: 80,
            feedback: "Detailed answer, but try to speak more about concrete git commands or pull request audit conventions."
          }
        ])
      }
    })
  }

  const handleFinishInterview = () => {
    if (dialogHistory.length < 4) {
      alert('Please answer at least two questions before completing the simulation.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/placement/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'simulator_evaluate_final',
            history: dialogHistory
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(data.error)
        } else {
          setSimulationResult(data)
          setSimulatorStatus('completed')
          
          // Save to database
          saveScoreRecord('interview_simulator', `${jobRole} Simulation Interview`, data.overallScore, null, {
            summary: data.summary,
            strengths: data.strengths,
            weaknesses: data.weaknesses
          })
        }
      } catch (err: unknown) {
        console.error('Evaluation error:', err)
        // Fallback final card
        const mockResult = {
          overallScore: 82,
          strengths: ["Structured STAR reasoning", "Clear technical context references", "Proactive communication style"],
          weaknesses: ["Estimating buffers details", "Recruiter greeting tone pacing", "Code complexity optimizations"],
          summary: "Outstanding interview simulation. Candidate demonstrated firm logic andSTAR structural formats. Refine delivery speed and Big O optimization explanations."
        }
        setSimulationResult(mockResult)
        setSimulatorStatus('completed')
        saveScoreRecord('interview_simulator', `${jobRole} Simulation Interview`, 82.0, null, {
          summary: mockResult.summary,
          strengths: mockResult.strengths,
          weaknesses: mockResult.weaknesses
        })
      }
    })
  }

  // --- STATS CALCULATIONS ---
  const pastSimulations = scores.filter(s => s.type === 'interview_simulator')
  const avgSimulatorScore = pastSimulations.length > 0
    ? Math.round(pastSimulations.reduce((acc, curr) => acc + curr.score, 0) / pastSimulations.length)
    : 0

  const pastAptitude = scores.filter(s => s.type === 'aptitude')
  const avgAptitudeScore = pastAptitude.length > 0
    ? Math.round(pastAptitude.reduce((acc, curr) => acc + curr.score, 0) / pastAptitude.length)
    : 0

  const completedDsaCountDb = scores.filter(s => s.type === 'dsa').length
  const totalSolvedDSA = Object.keys(completedDsaCount).length + completedDsaCountDb

  // Placement readiness percentage rating
  const readinessRating = Math.min(
    Math.round(
      (avgSimulatorScore * 0.4) + 
      (avgAptitudeScore * 0.3) + 
      (Math.min(totalSolvedDSA * 10, 100) * 0.3)
    ),
    100
  )

  return (
    <div className="fade-in-entry flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent flex items-center gap-2">
            <GraduationCap className="text-[var(--accent-blue)] shrink-0" size={28} />
            Placement Preparation
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Practice quantitative aptitude quizes, review coding DSA problems, read HR behavioral guidelines, and run mock interview simulations.
          </p>
        </div>
      </div>

      {dbError && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2 max-w-3xl leading-relaxed">
          <AlertCircle className="shrink-0" size={15} />
          <span>{dbError}</span>
        </div>
      )}

      {/* Main split dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column Stats & History Sidebar (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Preparation metrics */}
          <GlassCard className="p-5 flex flex-col gap-4.5 select-none">
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Prep Metrics</span>
            
            {/* Readiness circular dial */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" className="stroke-white/5 fill-transparent" strokeWidth="8" />
                  <circle cx="56" cy="56" r="48" className="fill-transparent stroke-[var(--accent-blue)] transition-all duration-500" strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={(2 * Math.PI * 48) * (1 - (readinessRating || 1) / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">{readinessRating}%</span>
                  <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Readiness</span>
                </div>
              </div>
            </div>

            <hr className="border-[var(--border-glass)]" />

            {/* Sub stats row */}
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Avg Interview Score:</span>
                <span className="font-semibold text-[var(--text-primary)]">{avgSimulatorScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Avg Aptitude Score:</span>
                <span className="font-semibold text-[var(--text-primary)]">{avgAptitudeScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">DSA Solved:</span>
                <span className="font-semibold text-[var(--text-primary)]">{totalSolvedDSA} problems</span>
              </div>
            </div>
          </GlassCard>

          {/* Scores History panel */}
          <GlassCard className="p-4 flex flex-col gap-4 max-h-[48vh] overflow-y-auto custom-scrollbar">
            <div className="pb-2 border-b border-[var(--border-glass)] flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <History size={14} className="text-[var(--text-secondary)]" />
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Attempt History</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-[var(--accent-blue)]" />
              </div>
            ) : scores.length === 0 ? (
              <div className="py-6 text-center text-[10px] text-[var(--text-muted)] select-none">
                No attempt records log found. Start practice practice.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 select-text">
                {scores.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-black/25 hover:bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between group/item transition-colors"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[120px]">{log.topic}</span>
                      <span className="text-[8px] text-[var(--text-muted)] font-mono mt-0.5 capitalize">
                        {log.type.replace('_', ' ')} • {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-[var(--accent-blue)]">
                        {log.score}%
                      </span>
                      <button
                        onClick={(e) => handleDeleteAttempt(log.id, e)}
                        className="text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 cursor-pointer"
                        title="Delete log"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Center/Right Main Preparation Hub (lg:col-span-9) */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          <GlassCard className="p-6 min-h-[60vh] flex flex-col gap-6">
            
            {/* Top Workspace Tab Navs */}
            <div className="flex items-center border-b border-[var(--border-glass)] pb-2 overflow-x-auto gap-2 scrollbar-none select-none">
              <button
                onClick={() => setActiveModule('aptitude')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  activeModule === 'aptitude'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Brain size={13} />
                  Aptitude Practice
                </span>
              </button>

              <button
                onClick={() => setActiveModule('dsa')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  activeModule === 'dsa'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Code2 size={13} />
                  DSA Coding
                </span>
              </button>

              <button
                onClick={() => setActiveModule('hr')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  activeModule === 'hr'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={13} />
                  HR STAR Accordion
                </span>
              </button>

              <button
                onClick={() => setActiveModule('simulator')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer shrink-0 ${
                  activeModule === 'simulator'
                    ? 'bg-white/5 border-[var(--border-glass-active)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  AI Recruiter Simulator
                </span>
              </button>
            </div>

            {/* Active module renderer */}
            <div className="flex-1">
              
              {/* TAB 1: APTITUDE PRACTICE */}
              {activeModule === 'aptitude' && (
                <div className="flex flex-col gap-5 select-text">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Quantitative & Logical Assessments</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">Select your target category and request AI exam questions.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={aptitudeTopic}
                        onChange={(e) => setAptitudeTopic(e.target.value)}
                        className="bg-black/35 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] text-xs rounded-lg px-2.5 py-1 text-[var(--text-primary)] outline-none cursor-pointer"
                      >
                        <option value="Quantitative">Quantitative Aptitude</option>
                        <option value="Logical Reasoning">Logical Reasoning</option>
                        <option value="Verbal Ability">Verbal Ability</option>
                        <option value="Data Interpretation">Data Interpretation</option>
                      </select>

                      <Button
                        onClick={handleGenerateAptitude}
                        disabled={isPending}
                        className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white text-xs py-1.5 h-8 border-0 cursor-pointer shadow-lg shadow-[var(--accent-blue-glow)]"
                      >
                        {isPending ? (
                          <span className="flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          'Request Quiz'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Aptitude Question list */}
                  {aptitudeQuestions.length > 0 ? (
                    <div className="flex flex-col gap-4 mt-2">
                      {aptitudeQuestions.map((q, idx) => {
                        const selectedAnswer = aptitudeAnswers[idx]
                        const isCorrect = selectedAnswer === q.correctIndex
                        
                        return (
                          <div
                            key={idx}
                            className="p-4 bg-black/20 border border-white/5 rounded-lg flex flex-col gap-3"
                          >
                            <span className="text-[10px] font-bold text-[var(--accent-purple)] uppercase tracking-wider">Question {idx + 1}</span>
                            <p className="text-xs font-semibold text-[var(--text-primary)] leading-normal">{q.question}</p>

                            {/* Options */}
                            <div className="flex flex-col gap-2">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = selectedAnswer === optIdx
                                const isThisCorrect = optIdx === q.correctIndex
                                
                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => {
                                      if (showAptitudeResults) return
                                      setAptitudeAnswers(prev => ({ ...prev, [idx]: optIdx }))
                                    }}
                                    className={`p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                      showAptitudeResults
                                        ? isThisCorrect
                                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium'
                                          : isSelected
                                          ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                          : 'border-white/5 text-[var(--text-secondary)]'
                                        : isSelected
                                        ? 'border-[var(--accent-blue)] bg-[var(--accent-blue-glow)] text-[var(--accent-blue)] font-medium'
                                        : 'border-white/5 bg-black/10 hover:bg-white/[0.01] text-[var(--text-secondary)]'
                                    }`}
                                  >
                                    {opt}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Question Correction Details */}
                            {showAptitudeResults && (
                              <div className={`text-[10px] mt-1 p-3 rounded leading-relaxed border ${
                                isCorrect ? 'bg-emerald-950/10 border-emerald-500/10 text-emerald-500/90' : 'bg-red-950/10 border-red-500/10 text-red-400'
                              }`}>
                                <strong className="font-bold block mb-0.5">{isCorrect ? 'Correct!' : 'Incorrect'}</strong>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Score control actions */}
                      {!showAptitudeResults ? (
                        <Button
                          onClick={submitAptitudeAnswers}
                          className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white text-xs font-semibold py-2 shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer h-9 mt-2"
                        >
                          Submit Quiz Answers
                        </Button>
                      ) : (
                        <div className="flex gap-3 mt-2 select-none">
                          <Button
                            onClick={() => {
                              setAptitudeAnswers({})
                              setShowAptitudeResults(false)
                            }}
                            variant="outline"
                            className="flex-1 border-[var(--border-glass)] hover:border-white/10 text-xs py-2 h-9 cursor-pointer"
                          >
                            Retry Quiz
                          </Button>
                          <Button
                            onClick={handleGenerateAptitude}
                            disabled={isPending}
                            className="flex-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white text-xs border-0 cursor-pointer h-9"
                          >
                            Generate New Quiz
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 gap-3 select-none">
                      <Brain size={32} className="text-[var(--text-muted)] animate-pulse" />
                      <span className="text-xs text-[var(--text-muted)] max-w-sm">
                        No active aptitude questions loaded. Select a topic and request questions from the examiner.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DSA CODING INTERVIEW */}
              {activeModule === 'dsa' && (
                <div className="flex flex-col gap-4 select-text">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Technical Coding Problems</h3>
                      <p className="text-[10px] text-[var(--text-muted)] font-sans">Solve algorithm milestones and review execution boilerplates.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={dsaTopic}
                        onChange={(e) => setDsaTopic(e.target.value)}
                        className="bg-black/35 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] text-xs rounded-lg px-2.5 py-1 text-[var(--text-primary)] outline-none cursor-pointer"
                      >
                        <option value="Arrays">Arrays & Hashing</option>
                        <option value="Strings">String Manipulation</option>
                        <option value="Linked Lists">Linked Lists</option>
                        <option value="Trees">Trees & Graphs</option>
                        <option value="Dynamic Programming">Dynamic Programming</option>
                      </select>

                      <Button
                        onClick={handleGenerateDsa}
                        disabled={isPending}
                        className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white text-xs py-1.5 h-8 border-0 cursor-pointer shadow-lg shadow-[var(--accent-blue-glow)]"
                      >
                        {isPending ? (
                          <span className="flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" />
                            Compiling...
                          </span>
                        ) : (
                          'Request Problems'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Problem selection grids */}
                  {dsaProblems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start mt-2">
                      
                      {/* Left list of problems (md:col-span-1) */}
                      <div className="md:col-span-1 flex flex-col gap-2.5 select-none">
                        {dsaProblems.map((prob, idx) => {
                          const isSelected = selectedProblemIndex === idx
                          const isSolved = completedDsaCount[prob.title] ?? false
                          
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedProblemIndex(idx)
                                setDsaViewMode('editor')
                                setUserCodeBoilerplate(prob.boilerplate)
                              }}
                              className={`p-3 bg-black/25 hover:bg-white/[0.02] border rounded-lg cursor-pointer flex flex-col gap-1.5 transition-colors ${
                                isSelected ? 'border-[var(--accent-blue)] bg-white/[0.01]' : 'border-white/5'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 leading-none">
                                <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[100px]">{prob.title}</span>
                                <span className={`text-[8px] font-bold ${
                                  prob.difficulty === 'Easy' ? 'text-emerald-400' : prob.difficulty === 'Medium' ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {prob.difficulty}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1.5">
                                <span>JavaScript</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleDsaSolved(prob.title)
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${
                                    isSolved 
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                      : 'border-white/10 hover:border-white/20 text-[var(--text-muted)] hover:text-white'
                                  }`}
                                >
                                  {isSolved ? 'Solved' : 'Mark Solved'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Right coding workspace editor split screen (md:col-span-3) */}
                      <div className="md:col-span-3">
                        {selectedProblemIndex !== null ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 select-none">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                <Terminal size={14} className="text-[var(--accent-blue)]" />
                                {dsaProblems[selectedProblemIndex].title}
                              </h4>
                              
                              <div className="flex items-center bg-white/5 border border-[var(--border-glass)] rounded-lg p-0.5">
                                <button
                                  onClick={() => setDsaViewMode('editor')}
                                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                                    dsaViewMode === 'editor' ? 'bg-white/10 text-[var(--accent-blue)]' : 'text-[var(--text-secondary)]'
                                  }`}
                                >
                                  Code
                                </button>
                                <button
                                  onClick={() => setDsaViewMode('solution')}
                                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                                    dsaViewMode === 'solution' ? 'bg-white/10 text-[var(--accent-blue)]' : 'text-[var(--text-secondary)]'
                                  }`}
                                >
                                  Solution
                                </button>
                              </div>
                            </div>

                            {/* Split code screen layout contents */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                              {/* Left specs detail box */}
                              <div className="p-4 bg-black/15 border border-[var(--border-glass)] rounded-lg flex flex-col gap-3 min-h-[30vh] max-h-[44vh] overflow-y-auto custom-scrollbar">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Problem Description</span>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                  {dsaProblems[selectedProblemIndex].description}
                                </p>
                                
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1.5">Examples</span>
                                <pre className="p-3 bg-black/40 rounded border border-white/5 text-[10px] font-mono text-cyan-400 whitespace-pre-wrap leading-relaxed">
                                  {dsaProblems[selectedProblemIndex].inputOutput}
                                </pre>
                              </div>

                              {/* Right workspace interactive box */}
                              {dsaViewMode === 'editor' ? (
                                <div className="rounded-lg border border-[var(--border-glass)] bg-[#090a0f] overflow-hidden flex flex-col font-mono text-[10px] text-[var(--text-secondary)]">
                                  {/* Terminal Bar header */}
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-[var(--border-glass)] select-none">
                                    <div className="flex items-center gap-1">
                                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                    </div>
                                    <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">main.js</span>
                                    <button
                                      onClick={() => setUserCodeBoilerplate(dsaProblems[selectedProblemIndex].boilerplate)}
                                      className="text-[8px] text-[var(--text-muted)] hover:text-white flex items-center gap-0.5 border border-white/5 px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      <RotateCcw size={8} />
                                      Reset
                                    </button>
                                  </div>

                                  <textarea
                                    value={userCodeBoilerplate}
                                    onChange={(e) => setUserCodeBoilerplate(e.target.value)}
                                    className="w-full flex-1 p-3 bg-transparent border-0 outline-none resize-none font-mono text-[10px] leading-relaxed min-h-[26vh] max-h-[36vh] text-emerald-400/90 custom-scrollbar"
                                    placeholder="// Start writing coding solution..."
                                  />
                                </div>
                              ) : (
                                <div className="p-4 bg-black/15 border border-[var(--border-glass)] rounded-lg flex flex-col gap-2 min-h-[30vh] max-h-[44vh] overflow-y-auto custom-scrollbar">
                                  <span className="text-[10px] font-bold text-[var(--accent-blue)] uppercase tracking-wider">Walkthrough Guide</span>
                                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                    {dsaProblems[selectedProblemIndex].approach}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-lg text-xs text-[var(--text-muted)] select-none">
                            Select a problem from the list to launch coding terminal workspace.
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 gap-3 select-none">
                      <Code2 size={32} className="text-[var(--text-muted)] animate-pulse" />
                      <span className="text-xs text-[var(--text-muted)] max-w-sm">
                        No coding problems loaded. Select a DSA topic and request interview coding problems.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HR BEHAVIORAL QUESTIONS */}
              {activeModule === 'hr' && (
                <div className="flex flex-col gap-4 select-text">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Behavioral Interview Questions</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">Practice STAR method formulas (Situation, Task, Action, Result) for HR reviews.</p>
                    </div>

                    <Button
                      onClick={handleGenerateHrQuestions}
                      disabled={isPending}
                      className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white text-xs py-1.5 h-8 border-0 cursor-pointer shadow-lg shadow-[var(--accent-blue-glow)] self-start sm:self-center"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" />
                          Formulating...
                        </span>
                      ) : (
                        'Request Questions'
                      )}
                    </Button>
                  </div>

                  {/* STAR questions accordions list */}
                  {hrQuestions.length > 0 ? (
                    <div className="flex flex-col gap-3 mt-2">
                      {hrQuestions.map((hr, idx) => {
                        const isExpanded = expandedStarQuestionIndex === idx
                        
                        return (
                          <div
                            key={idx}
                            className="border border-[var(--border-glass)] bg-black/10 rounded-lg overflow-hidden transition-colors"
                          >
                            {/* Accordion header bar */}
                            <div
                              onClick={() => setExpandedStarQuestionIndex(isExpanded ? null : idx)}
                              className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors select-none"
                            >
                              <div className="flex items-center gap-3 pr-2 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--accent-blue)] shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[480px]">
                                  {hr.question}
                                </span>
                              </div>
                              <div>
                                {isExpanded ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                              </div>
                            </div>

                            {/* STAR Breakdown body */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden bg-black/5 border-t border-[var(--border-glass)]"
                                >
                                  <div className="p-4 flex flex-col gap-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Left Columns: STAR variables */}
                                      <div className="flex flex-col gap-3">
                                        <span className="text-[9px] font-bold text-[var(--accent-blue)] uppercase tracking-wider">STAR Formulation</span>
                                        
                                        <div className="flex flex-col gap-1 text-xs">
                                          <strong className="text-[10px] text-[var(--text-primary)] uppercase">Situation</strong>
                                          <p className="text-[var(--text-secondary)] leading-relaxed pl-2 border-l border-[var(--accent-blue)]/30">{hr.starModel.situation}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 text-xs">
                                          <strong className="text-[10px] text-[var(--text-primary)] uppercase">Task</strong>
                                          <p className="text-[var(--text-secondary)] leading-relaxed pl-2 border-l border-[var(--accent-blue)]/30">{hr.starModel.task}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 text-xs">
                                          <strong className="text-[10px] text-[var(--text-primary)] uppercase">Action</strong>
                                          <p className="text-[var(--text-secondary)] leading-relaxed pl-2 border-l border-[var(--accent-blue)]/30">{hr.starModel.action}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 text-xs">
                                          <strong className="text-[10px] text-[var(--text-primary)] uppercase">Result</strong>
                                          <p className="text-[var(--text-secondary)] leading-relaxed pl-2 border-l border-[var(--accent-blue)]/30">{hr.starModel.result}</p>
                                        </div>
                                      </div>

                                      {/* Right Columns: Ideal outline summary */}
                                      <div className="flex flex-col gap-2.5 p-3.5 bg-white/[0.01] border border-[var(--border-glass)] rounded-lg">
                                        <span className="text-[9px] font-bold text-[var(--accent-purple)] uppercase tracking-wider">Recruiter Tips & Outlines</span>
                                        <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                                          {hr.idealOutline}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 gap-3 select-none">
                      <FileText size={32} className="text-[var(--text-muted)] animate-pulse" />
                      <span className="text-xs text-[var(--text-muted)] max-w-sm">
                        No HR behavioral questions loaded. Request mock behavior questions from the recruitment database.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AI RECRUITER INTERVIEW SIMULATOR */}
              {activeModule === 'simulator' && (
                <div className="flex flex-col gap-4">
                  {simulatorStatus === 'idle' && (
                    <div className="flex flex-col items-center justify-center text-center py-10 gap-5 max-w-md mx-auto select-none">
                      <Award size={36} className="text-[var(--accent-blue)] animate-pulse" />
                      
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">AI Mock Interview Simulator</h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          Test your answers in real-time. Pick your career role, start simulation, and get graded feedback scores.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 w-full text-left">
                        <label htmlFor="simulatorRole" className="text-xs font-semibold text-[var(--text-primary)]">Target Placement Job Role</label>
                        <select
                          id="simulatorRole"
                          value={jobRole}
                          onChange={(e) => setJobRole(e.target.value)}
                          className="w-full bg-black/35 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] text-xs rounded-lg px-3 py-2 text-[var(--text-primary)] outline-none cursor-pointer"
                        >
                          <option value="Software Engineer">Software Engineer (General)</option>
                          <option value="Frontend Engineer">Frontend Engineer</option>
                          <option value="Backend Developer">Backend Developer</option>
                          <option value="Product Manager">Product Manager</option>
                          <option value="Data Analyst">Data Analyst</option>
                          <option value="Consultant">Management Consultant</option>
                        </select>
                      </div>

                      <Button
                        onClick={handleStartInterview}
                        disabled={isPending}
                        className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white hover:opacity-95 text-xs font-semibold py-2 h-9 border-0 cursor-pointer shadow-lg shadow-[var(--accent-blue-glow)]"
                      >
                        {isPending ? (
                          <span className="flex items-center gap-1.5 justify-center">
                            <Loader2 size={13} className="animate-spin" />
                            Establishing Sim Connection...
                          </span>
                        ) : (
                          'Launch Simulator'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Simulator Interaction state */}
                  {simulatorStatus === 'interviewing' && (
                    <div className="flex flex-col gap-4">
                      
                      {/* Interaction controls header bar */}
                      <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 select-none">
                        <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Sim Active
                        </span>

                        <Button
                          variant="outline"
                          size="xs"
                          onClick={handleFinishInterview}
                          disabled={isPending || dialogHistory.length < 4}
                          className="border-[var(--border-glass)] text-[10px] cursor-pointer text-amber-400 hover:border-amber-400/20"
                          title="Finish interview to request grade reports"
                        >
                          {isPending ? <Loader2 size={10} className="animate-spin" /> : 'Finish & Grade Interview'}
                        </Button>
                      </div>

                      {/* Dialogue Transcript viewport */}
                      <div className="bg-black/25 border border-[var(--border-glass)] rounded-xl p-4 flex flex-col gap-4 min-h-[35vh] max-h-[46vh] overflow-y-auto custom-scrollbar select-text">
                        {dialogHistory.map((chat, idx) => (
                          <div key={idx} className="flex flex-col gap-2">
                            {/* Dialogue bubbles */}
                            <div
                              className={`flex flex-col gap-1 text-[11px] max-w-[85%] leading-relaxed ${
                                chat.role === 'candidate'
                                  ? 'self-end bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 p-3 rounded-xl rounded-tr-none text-[var(--text-primary)]'
                                  : 'self-start bg-white/5 border border-white/5 p-3 rounded-xl rounded-tl-none text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                                {chat.role === 'candidate' ? 'Candidate (You)' : 'AI Interviewer'}
                              </span>
                              <p>{chat.content}</p>
                            </div>

                            {/* Recruiter feedback overlay on candidate responses */}
                            {chat.role === 'interviewer' && chat.feedback && (
                              <div className="self-start p-2.5 bg-amber-400/5 border border-amber-400/10 rounded-lg text-[9px] text-amber-400 max-w-[80%] leading-relaxed mt-1 flex flex-col gap-1 select-text">
                                <span className="font-bold flex items-center gap-1">
                                  <Sparkles size={9} />
                                  Recruiter Feedback (Accuracy Grade: {chat.score}/100)
                                </span>
                                <p>{chat.feedback}</p>
                              </div>
                            )}
                          </div>
                        ))}
                        {isPending && (
                          <div className="self-start bg-white/5 border border-white/5 p-2 rounded-xl rounded-tl-none text-[9px] text-[var(--text-muted)] select-none">
                            Recruiter is evaluating response...
                          </div>
                        )}
                      </div>

                      {/* Chat Input Controls */}
                      <div className="flex gap-2 select-none">
                        <input
                          type="text"
                          placeholder="Type your response and hit Send..."
                          value={candidateResponse}
                          onChange={(e) => setCandidateResponse(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendResponse()}
                          disabled={isPending}
                          className="flex-1 bg-black/35 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                        />
                        <Button
                          onClick={handleSendResponse}
                          disabled={isPending || !candidateResponse.trim()}
                          className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white hover:opacity-95 text-xs font-semibold px-4 py-2 h-9 border-0 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Send size={12} />
                          Send
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Simulator Evaluation finished card state */}
                  {simulatorStatus === 'completed' && simulationResult && (
                    <div className="flex flex-col gap-5 select-text">
                      <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 select-none">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Mock Interview Evaluation report</span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setSimulatorStatus('idle')}
                          className="border-[var(--border-glass)] text-[10px] cursor-pointer"
                        >
                          New Session
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Overall score radial summary card */}
                        <div className="md:col-span-1 flex flex-col gap-4 p-4 bg-white/[0.01] border border-[var(--border-glass)] rounded-xl items-center justify-center">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">Sim Performance</span>
                          
                          <div className="relative w-28 h-28 shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="56" cy="56" r="48" className="stroke-white/5 fill-transparent" strokeWidth="8" />
                              <circle cx="56" cy="56" r="48" className="fill-transparent stroke-[var(--accent-purple)] transition-all duration-500" strokeWidth="8"
                                strokeDasharray={2 * Math.PI * 48}
                                strokeDashoffset={(2 * Math.PI * 48) * (1 - simulationResult.overallScore / 100)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                              <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">{simulationResult.overallScore}%</span>
                              <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Recruit score</span>
                            </div>
                          </div>
                        </div>

                        {/* Details strengths/weaknesses */}
                        <div className="md:col-span-2 flex flex-col gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Strengths card */}
                            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex flex-col gap-2 text-xs">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                Strengths
                              </span>
                              <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                                {simulationResult.strengths.map((str, sIdx) => (
                                  <li key={sIdx}>{str}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Weaknesses card */}
                            <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-lg flex flex-col gap-2 text-xs">
                              <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                <XCircle size={10} />
                                Areas to Improve
                              </span>
                              <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                                {simulationResult.weaknesses.map((wk, wIdx) => (
                                  <li key={wIdx}>{wk}</li>
                                ))}
                              </ul>
                            </div>

                          </div>
                        </div>

                      </div>

                      {/* Summary textbox */}
                      <div className="p-4 bg-black/25 border border-white/5 rounded-lg text-xs leading-relaxed text-[var(--text-secondary)] flex flex-col gap-1.5 mt-2">
                        <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Evaluation Executive Summary</span>
                        <p>{simulationResult.summary}</p>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Upload,
  Sparkles,
  Zap,
  Target
} from 'lucide-react'

interface AnalysisReport {
  subjects: string[]
  units: string[]
  topics: string[]
  strengths: string[]
  weaknesses: string[]
}

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSyncing, setIsSyncing] = useState(false)

  // Step 1: Personal Profile
  const [firstName, setFirstName] = useState('')
  const [prefName, setPrefName] = useState('')
  const [age, setAge] = useState('')
  const [country, setCountry] = useState('')
  const [university, setUniversity] = useState('')
  const [degree, setDegree] = useState('')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')

  // Step 2: Academic Profile
  const [cgpa, setCgpa] = useState('')
  const [currentSubjects, setCurrentSubjects] = useState('')
  const [backlogs, setBacklogs] = useState('no')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  // Step 3: Learning Style
  const [learningStyle, setSelectedLearningStyle] = useState<string[]>([])
  const [studyHours, setStudyHours] = useState('3')
  const [productiveTime, setProductiveTime] = useState('evening')

  // Step 4: Career Goals
  const [careerGoals, setSelectedCareerGoals] = useState<string[]>([])
  const [dreamRole, setDreamRole] = useState('')
  const [targetCompanies, setTargetCompanies] = useState('')

  // Step 5: Knowledge Import (File upload states)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; category: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Step 6: AI Analysis states
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null)

  const academicGoalOptions = [
    'Pass semester',
    'Improve GPA',
    'Crack placements',
    'Prepare for higher studies',
    'Learn AI',
    'Become Full Stack Developer'
  ]

  const learningStyleOptions = [
    'Reading',
    'Videos',
    'Practice Questions',
    'Flashcards',
    'Group Learning',
    'Projects'
  ]

  const careerGoalOptions = [
    'Placements',
    'Internships',
    'Higher Studies',
    'Government Exams',
    'Freelancing',
    'Startup Building',
    'Research'
  ]

  const handleToggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  const handleToggleLearning = (style: string) => {
    setSelectedLearningStyle(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    )
  }

  const handleToggleCareer = (goal: string) => {
    setSelectedCareerGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  // File Uploader
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const file = files[0]
    
    // Guess category from file name or default to notes
    let category = 'notes'
    const nameLower = file.name.toLowerCase()
    if (nameLower.includes('syllabus')) category = 'syllabus'
    else if (nameLower.includes('pyq') || nameLower.includes('paper')) category = 'pyq'
    else if (nameLower.includes('assignment')) category = 'assignment'

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)

    try {
      const res = await fetch('/api/brain/ingest', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      if (result.success) {
        setUploadedFiles(prev => [...prev, { name: file.name, size: file.size, category }])
      } else {
        alert('File upload failed: ' + (result.error || 'Check document types.'))
      }
    } catch (err) {
      console.error(err)
      alert('Network upload error.')
    } finally {
      setIsUploading(false)
    }
  }

  // Trigger Gemini Analysis step
  const triggerAIAnalysis = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/onboarding/analyze', {
        method: 'POST'
      })
      const report = await res.json()
      setAnalysisReport(report)
      setCurrentStep(7) // Go to twin completion presentation
    } catch (err) {
      console.error(err)
      alert('AI Scanning failed. Proceeding with basic twin config.')
      setCurrentStep(7)
    } finally {
      setIsSyncing(false)
    }
  }

  // Save onboarding status POST
  const finishOnboarding = async () => {
    setIsSyncing(true)
    const payload = {
      firstName,
      preferredName: prefName || firstName,
      age,
      country,
      university,
      degree,
      branch,
      semester,
      cgpa,
      currentSubjects,
      backlogs,
      academicGoals: selectedGoals,
      learningStyle,
      studyHours,
      productiveTime,
      careerGoals,
      dreamRole,
      targetCompanies
    }

    try {
      await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      onComplete()
    } catch (err) {
      console.error(err)
      onComplete() // fallback
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0e12]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="w-full max-w-2xl my-auto">
        <GlassCard className="p-6 md:p-8 border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] space-y-6">
          
          {/* Header Progress Indicators */}
          <div className="flex justify-between items-center select-none">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-semibold shadow-sm">
                <Brain size={13} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400">Academic Twin Setup</span>
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] font-mono">
              Step {currentStep} / 7
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>

          <div className="min-h-[40vh] py-2">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: Personal Profile */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Personal Learning Profile</h2>
                    <p className="text-[10px] text-[var(--text-muted)] italic">Let&apos;s build your Academic Twin. Who are you?</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">First Name</label>
                      <input 
                        type="text" 
                        placeholder="First Name" 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Preferred Name / Alias</label>
                      <input 
                        type="text" 
                        placeholder="Preferred Name" 
                        value={prefName} 
                        onChange={e => setPrefName(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Age</label>
                      <input 
                        type="number" 
                        placeholder="Age" 
                        value={age} 
                        onChange={e => setAge(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Country</label>
                      <input 
                        type="text" 
                        placeholder="Country" 
                        value={country} 
                        onChange={e => setCountry(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">University Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Stanford University" 
                        value={university} 
                        onChange={e => setUniversity(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Degree Program</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Bachelor of Science" 
                        value={degree} 
                        onChange={e => setDegree(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Branch / Major</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Computer Science" 
                        value={branch} 
                        onChange={e => setBranch(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Semester / Academic Year</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Semester 4" 
                        value={semester} 
                        onChange={e => setSemester(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Academic Profile */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Academic Profile</h2>
                    <p className="text-[10px] text-[var(--text-muted)] italic">Establish your current metrics and goals.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Current CGPA / GPA (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 3.8 / 10.0" 
                        value={cgpa} 
                        onChange={e => setCgpa(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1 select-none">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Active Backlogs</label>
                      <div className="grid grid-cols-2 gap-2 bg-black/20 border border-white/10 rounded-lg p-0.5 h-8.5">
                        {['no', 'yes'].map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setBacklogs(opt)}
                            className={`rounded text-[10px] font-bold uppercase ${
                              backlogs === opt ? 'bg-white/10 text-cyan-400' : 'text-white/40'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Current Course Subjects (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Operating Systems, Computer Networks, Database Management" 
                      value={currentSubjects} 
                      onChange={e => setCurrentSubjects(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)] select-none">Primary Academic Goals</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {academicGoalOptions.map(goal => {
                        const active = selectedGoals.includes(goal)
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => handleToggleGoal(goal)}
                            className={`p-2 rounded-xl border text-[9.5px] font-bold text-left transition-all ${
                              active 
                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-sm'
                                : 'bg-black/15 border-white/5 text-[var(--text-secondary)] hover:bg-white/[0.01]'
                            }`}
                          >
                            {goal}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Learning Style */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="space-y-1">
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Learning Style</h2>
                    <p className="text-[10px] text-[var(--text-muted)] italic">Customize how the AI should organize study checklists and cards.</p>
                  </div>

                  <div className="space-y-2 select-none">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">How do you learn best?</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {learningStyleOptions.map(style => {
                        const active = learningStyle.includes(style)
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => handleToggleLearning(style)}
                            className={`p-2.5 rounded-xl border text-[10px] font-bold text-left transition-all ${
                              active 
                                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-sm'
                                : 'bg-black/15 border-white/5 text-[var(--text-secondary)] hover:bg-white/[0.01]'
                            }`}
                          >
                            {style}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2 select-none">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        <span>Study Duration / Day</span>
                        <span className="text-cyan-400">{studyHours} Hours</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="12" 
                        value={studyHours} 
                        onChange={e => setStudyHours(e.target.value)}
                        className="w-full accent-cyan-400" 
                      />
                    </div>

                    <div className="space-y-2 select-none">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Most Productive Study Time</label>
                      <div className="grid grid-cols-4 gap-1 bg-black/20 border border-white/10 rounded-lg p-0.5">
                        {['morning', 'afternoon', 'evening', 'night'].map(time => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setProductiveTime(time)}
                            className={`py-1 rounded text-[8px] font-bold uppercase transition-all ${
                              productiveTime === time ? 'bg-white/10 text-cyan-400' : 'text-white/40'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Career Goals */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Career & Placements Goals</h2>
                    <p className="text-[10px] text-[var(--text-muted)] italic">Establish target placements and roles to adjust career simulations.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)] select-none">What are you preparing for?</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {careerGoalOptions.map(opt => {
                        const active = careerGoals.includes(opt)
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleToggleCareer(opt)}
                            className={`p-2 rounded-xl border text-[9px] font-bold text-center transition-all ${
                              active 
                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-sm'
                                : 'bg-black/15 border-white/5 text-[var(--text-secondary)] hover:bg-white/[0.01]'
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Dream Job Role</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Machine Learning Engineer" 
                        value={dreamRole} 
                        onChange={e => setDreamRole(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Target Companies (comma separated)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Google, Stripe, OpenAI" 
                        value={targetCompanies} 
                        onChange={e => setTargetCompanies(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Knowledge Import */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Knowledge Ingestion (Ground Truth)</h2>
                    <p className="text-[10px] text-[var(--text-muted)] italic">
                      Upload your syllabus, notes, PDFs, or previous year papers. The more material you provide, the smarter your Academic Twin becomes.
                    </p>
                  </div>

                  {/* Upload Box Dropzone */}
                  <div className="border border-dashed border-white/10 hover:border-cyan-500/50 bg-black/15 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 transition-colors relative cursor-pointer select-none">
                    <input 
                      type="file" 
                      accept=".txt,.pdf,.docx,.pptx"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin text-cyan-400" size={32} />
                        <span className="text-xs text-[var(--text-primary)] font-bold">Vectorizing Document Context...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="text-[var(--text-muted)] animate-bounce" size={32} />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-[var(--text-primary)] block">Select Course Syllabus or Notes</span>
                          <span className="text-[9px] text-[var(--text-muted)] leading-relaxed block">Accepts PDF, DOCX, PPTX, TXT. File will be vectorized immediately.</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Uploaded files checklist */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      <h4 className="text-[9px] font-extrabold uppercase text-[var(--text-secondary)] tracking-widest">Grounding Files Active ({uploadedFiles.length})</h4>
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-semibold text-[var(--text-secondary)]">
                          <span className="truncate max-w-[280px]">{file.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[7px] uppercase font-bold tracking-widest border border-emerald-500/20">{file.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 6: AI Analysis Loader */}
              {currentStep === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center justify-center text-center py-8 space-y-4 select-none"
                >
                  <Loader2 className="animate-spin text-cyan-400" size={44} />
                  <div className="space-y-1">
                    <h2 className="text-md font-bold text-[var(--text-primary)]">Building Academic Twin Neural Maps</h2>
                    <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                      AI is performing real diagnostics over your uploaded syllabus, extracting units, classifying topics, and mapping exam patterns. Never using mock data.
                    </p>
                  </div>
                  
                  {/* scanning indicators checklist */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-left text-[9.5px] font-bold text-[var(--text-secondary)] space-y-2 min-w-[280px] font-mono select-none">
                    <div className="flex items-center gap-1.5 text-cyan-400">
                      <Sparkles size={11} className="animate-pulse" />
                      <span>Scanning syllabus chapters...</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <Sparkles size={11} className="animate-pulse" />
                      <span>Vectorizing knowledge nodes...</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={11} />
                      <span>Ingestion parameters set!</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 7: Twin building overview */}
              {currentStep === 7 && (
                <motion.div
                  key="step7"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 select-text"
                >
                  <div className="space-y-1 text-center select-none">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-2 animate-bounce">
                      <CheckCircle2 size={20} />
                    </div>
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Academic Twin Online</h2>
                    <p className="text-[10px] text-[var(--text-muted)] italic">
                      Your cognitive profile has been compiled from real study metrics and materials.
                    </p>
                  </div>

                  {/* Twin details visualization card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-3">
                      <h4 className="text-[9px] font-extrabold uppercase text-cyan-400 tracking-wider flex items-center gap-1 select-none">
                        <Zap size={11} /> Cognitive Configuration
                      </h4>
                      <div className="space-y-1.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                        <div className="flex justify-between">
                          <span>Name:</span>
                          <span className="text-white font-bold">{firstName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>University:</span>
                          <span className="text-white font-bold truncate max-w-[120px]">{university}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Learning Style:</span>
                          <span className="text-white font-bold">{learningStyle.length > 0 ? learningStyle.join(', ') : 'Active Recall'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Focus Stamina:</span>
                          <span className="text-white font-bold">{studyHours} Hours / Day</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-3">
                      <h4 className="text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1 select-none">
                        <Target size={11} /> Extracted Twin Scope
                      </h4>
                      <div className="space-y-2 text-[9.5px] font-bold text-[var(--text-secondary)]">
                        <div className="space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] uppercase block">Detected Strengths:</span>
                          <div className="flex flex-wrap gap-1">
                            {analysisReport?.strengths && (analysisReport.strengths as string[]).slice(0, 3).map((st, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold">{st}</span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] uppercase block">Detected Weak Areas:</span>
                          <div className="flex flex-wrap gap-1">
                            {analysisReport?.weaknesses && (analysisReport.weaknesses as string[]).slice(0, 3).map((wk, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-bold">{wk}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Stepper Navigation buttons */}
          <div className="flex items-center justify-between border-t border-[var(--border-glass)] pt-4 select-none">
            {currentStep > 1 && currentStep < 6 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={isSyncing}
                className="bg-transparent border border-white/10 hover:bg-white/5 text-[10px] font-bold uppercase tracking-wider h-9 px-4 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={12} />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <Button
                onClick={() => {
                  if (currentStep === 1 && !firstName.trim()) {
                    alert('Please enter your first name to begin.')
                    return
                  }
                  setCurrentStep(prev => prev + 1)
                }}
                className="bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-[10px] font-bold uppercase tracking-wider h-9 px-4 flex items-center gap-1 border-0 cursor-pointer shadow-sm ml-auto"
              >
                Next
                <ChevronRight size={12} />
              </Button>
            ) : currentStep === 5 ? (
              <Button
                onClick={() => {
                  setCurrentStep(6)
                  triggerAIAnalysis()
                }}
                className="bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-[10px] font-bold uppercase tracking-wider h-9 px-4 flex items-center gap-1 border-0 cursor-pointer shadow-sm ml-auto"
              >
                Run AI Twin Analysis
                <Sparkles size={12} />
              </Button>
            ) : currentStep === 7 ? (
              <Button
                onClick={finishOnboarding}
                disabled={isSyncing}
                className="w-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-[10px] font-bold uppercase tracking-wider h-9 border-0 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                {isSyncing ? <Loader2 size={12} className="animate-spin" /> : "Sync & Enter CampusOS"}
                <CheckCircle2 size={12} />
              </Button>
            ) : (
              <div />
            )}
          </div>

        </GlassCard>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Briefcase,
  Calendar,
  Clock,
  Plus,
  List,
  Kanban,
  BarChart3,
  AlertCircle,
  Trash2,
  Edit,
  X,
  DollarSign,
  MapPin,
  TrendingUp,
  CheckCircle2,
  FileText,
  Loader2
} from 'lucide-react'

// Application Status Types
type ApplicationStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected'

interface InternshipApplication {
  id: string
  company_name: string
  role: string
  status: ApplicationStatus
  applied_date: string
  follow_up_date: string | null
  notes: string | null
  salary: string | null
  location: string | null
  created_at: string
}

export default function InternshipsPage() {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // State Management
  const [applications, setApplications] = useState<InternshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  
  // View Toggle State: 'kanban' | 'list' | 'analytics'
  const [currentView, setCurrentView] = useState<'kanban' | 'list' | 'analytics'>('kanban')

  // Form / Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<InternshipApplication | null>(null)
  
  // Form fields
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('applied')
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split('T')[0])
  const [followUpDate, setFollowUpDate] = useState('')
  const [notes, setNotes] = useState('')
  const [salary, setSalary] = useState('')
  const [location, setLocation] = useState('')

  // Drag State
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)

  // Fetch applications on mount
  useEffect(() => {
    async function loadApplications() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('internship_applications')
            .select('*')
            .eq('user_id', user.id)
            .order('applied_date', { ascending: false })

          if (error) {
            if (error.code === '42P01') {
              setDbError('Database table not initialized. Local session storage fallback activated.')
              loadLocalStorageFallback()
            } else {
              setDbError(error.message)
            }
          } else if (data) {
            setApplications(data as InternshipApplication[])
          }
        } else {
          loadLocalStorageFallback()
        }
      } catch (err: unknown) {
        console.error('Failed to load internship applications:', err)
        setDbError('Error connecting to backend services.')
        loadLocalStorageFallback()
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [supabase])

  // Fallback state from local storage if supabase is not initialized
  const loadLocalStorageFallback = () => {
    const saved = localStorage.getItem('campusos-internship-applications')
    if (saved) {
      try {
        setApplications(JSON.parse(saved))
      } catch {
        setApplications([])
      }
    } else {
      const mockApps: InternshipApplication[] = [
        {
          id: 'mock-1',
          company_name: 'Stripe',
          role: 'Software Engineer Intern',
          status: 'interviewing',
          applied_date: '2026-05-10',
          follow_up_date: '2026-06-01',
          notes: 'Finished technical screen. Next up: Virtual onsite scheduling.',
          salary: '$50/hr',
          location: 'San Francisco, CA',
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
          company_name: 'Vercel',
          role: 'Frontend Engineer Intern',
          status: 'offer',
          applied_date: '2026-05-02',
          follow_up_date: null,
          notes: 'Received written offer! Need to accept/negotiate by June 15.',
          salary: '$48/hr',
          location: 'Remote',
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-3',
          company_name: 'Google',
          role: 'SWE Intern',
          status: 'applied',
          applied_date: '2026-05-15',
          follow_up_date: '2026-05-30',
          notes: 'Completed OA (Online Assessment). Expecting recruiter follow up.',
          salary: '$45/hr',
          location: 'New York, NY',
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-4',
          company_name: 'Linear',
          role: 'Product Engineer Intern',
          status: 'wishlist',
          applied_date: '2026-05-20',
          follow_up_date: '2026-06-10',
          notes: 'Applications open next week. Keep resume optimized.',
          salary: '$60/hr',
          location: 'Remote',
          created_at: new Date().toISOString()
        }
      ]
      setApplications(mockApps)
      localStorage.setItem('campusos-internship-applications', JSON.stringify(mockApps))
    }
  }

  const syncToLocalStorage = (list: InternshipApplication[]) => {
    localStorage.setItem('campusos-internship-applications', JSON.stringify(list))
  }

  const handleOpenCreateDrawer = () => {
    setEditingApp(null)
    setCompanyName('')
    setRole('')
    setStatus('applied')
    setAppliedDate(new Date().toISOString().split('T')[0])
    setFollowUpDate('')
    setNotes('')
    setSalary('')
    setLocation('')
    setIsDrawerOpen(true)
  }

  const handleOpenEditDrawer = (app: InternshipApplication) => {
    setEditingApp(app)
    setCompanyName(app.company_name)
    setRole(app.role)
    setStatus(app.status)
    setAppliedDate(app.applied_date)
    setFollowUpDate(app.follow_up_date || '')
    setNotes(app.notes || '')
    setSalary(app.salary || '')
    setLocation(app.location || '')
    setIsDrawerOpen(true)
  }

  const handleSubmitApp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim() || !role.trim()) return

    startTransition(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        const appPayload = {
          company_name: companyName,
          role,
          status,
          applied_date: appliedDate,
          follow_up_date: followUpDate || null,
          notes: notes || null,
          salary: salary || null,
          location: location || null
        }

        if (user && !dbError) {
          if (editingApp) {
            const { data, error } = await supabase
              .from('internship_applications')
              .update(appPayload)
              .eq('id', editingApp.id)
              .select()
              .single()

            if (error) throw new Error(error.message)
            if (data) {
              setApplications(prev => prev.map(a => a.id === editingApp.id ? (data as InternshipApplication) : a))
            }
          } else {
            const { data, error } = await supabase
              .from('internship_applications')
              .insert({ ...appPayload, user_id: user.id })
              .select()
              .single()

            if (error) throw new Error(error.message)
            if (data) {
              setApplications(prev => [data as InternshipApplication, ...prev])
            }
          }
        } else {
          if (editingApp) {
            const updated = applications.map(a => 
              a.id === editingApp.id 
                ? { ...a, ...appPayload } 
                : a
            )
            setApplications(updated)
            syncToLocalStorage(updated)
          } else {
            const newApp: InternshipApplication = {
              id: `local-${Date.now()}`,
              ...appPayload,
              created_at: new Date().toISOString()
            }
            const updated = [newApp, ...applications]
            setApplications(updated)
            syncToLocalStorage(updated)
          }
        }
        setIsDrawerOpen(false)
      } catch (err: unknown) {
        console.error('Save application error:', err)
        alert('Failed to save application.')
      }
    })
  }

  const handleDeleteApp = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application record?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !dbError) {
        const { error } = await supabase
          .from('internship_applications')
          .delete()
          .eq('id', id)

        if (error) throw new Error(error.message)
      }
      
      const updated = applications.filter(a => a.id !== id)
      setApplications(updated)
      syncToLocalStorage(updated)
    } catch (err: unknown) {
      console.error('Delete application error:', err)
      alert('Failed to delete application.')
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: ApplicationStatus) => {
    e.preventDefault()
    const id = draggedCardId || e.dataTransfer.getData('text/plain')
    if (!id) return

    const matchedApp = applications.find(a => a.id === id)
    if (!matchedApp || matchedApp.status === targetStatus) return

    const updatedList = applications.map(a => a.id === id ? { ...a, status: targetStatus } : a)
    setApplications(updatedList)
    syncToLocalStorage(updatedList)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !dbError) {
        const { error } = await supabase
          .from('internship_applications')
          .update({ status: targetStatus })
          .eq('id', id)

        if (error) {
          console.error('Drag update DB failed, rolling back:', error.message)
          const rollbackList = applications.map(a => a.id === id ? { ...a, status: matchedApp.status } : a)
          setApplications(rollbackList)
          syncToLocalStorage(rollbackList)
        }
      }
    } catch (err: unknown) {
      console.error('Drag update error:', err)
    } {
      setDraggedCardId(null)
    }
  }

  const getAppsByStatus = (statusKey: ApplicationStatus) => {
    return applications.filter(a => a.status === statusKey)
  }

  const totalApps = applications.length
  const interviewsCount = applications.filter(a => a.status === 'interviewing').length
  const offersCount = applications.filter(a => a.status === 'offer').length
  
  const responseRate = totalApps > 0 
    ? Math.round(((interviewsCount + offersCount) / totalApps) * 100)
    : 0

  const followUpReminders = applications
    .filter(a => a.follow_up_date)
    .map(a => {
      const today = new Date().toISOString().split('T')[0]
      const isOverdue = a.follow_up_date! < today
      const isToday = a.follow_up_date! === today
      return {
        ...a,
        isOverdue,
        isToday
      }
    })
    .sort((a, b) => a.follow_up_date!.localeCompare(b.follow_up_date!))

  const overdueCount = followUpReminders.filter(r => r.isOverdue).length

  const columns: { key: ApplicationStatus; title: string; color: string; border: string; bg: string }[] = [
    { key: 'wishlist', title: 'Wishlist', color: 'text-gray-400', border: 'border-gray-500/20', bg: 'bg-gray-500/5' },
    { key: 'applied', title: 'Applied', color: 'text-[var(--accent-blue)]', border: 'border-[var(--accent-blue)]/20', bg: 'bg-[var(--accent-blue-glow)]' },
    { key: 'interviewing', title: 'Interviewing', color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/5' },
    { key: 'offer', title: 'Offers', color: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/5' },
    { key: 'rejected', title: 'Rejected', color: 'text-red-400', border: 'border-red-400/20', bg: 'bg-red-400/5' }
  ]

  const getStatusLabel = (statusKey: ApplicationStatus) => {
    switch (statusKey) {
      case 'wishlist': return 'Wishlist'
      case 'applied': return 'Applied'
      case 'interviewing': return 'Interview'
      case 'offer': return 'Offer'
      case 'rejected': return 'Rejected'
    }
  }

  const getStatusPillClasses = (statusKey: ApplicationStatus) => {
    switch (statusKey) {
      case 'wishlist': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'applied': return 'bg-[var(--accent-blue-glow)] text-[var(--accent-blue)] border-[var(--accent-blue)]/20'
      case 'interviewing': return 'bg-amber-400/10 text-amber-400 border-amber-400/20'
      case 'offer': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
      case 'rejected': return 'bg-red-400/10 text-red-400 border-red-400/20'
    }
  }

  const getDonutChartData = () => {
    const statuses: ApplicationStatus[] = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected']
    const colors = ['#6b7280', '#00d2ff', '#f59e0b', '#10b981', '#ef4444']
    
    const statusCounts = statuses.map(s => applications.filter(a => a.status === s).length)
    const total = statusCounts.reduce((a, b) => a + b, 0)
    
    if (total === 0) {
      return {
        segments: [{ percentage: 100, strokeDasharray: '188.5 188.5', strokeDashoffset: '0', color: 'rgba(255,255,255,0.05)' }],
        legend: statuses.map((s, i) => ({ status: s, count: 0, percentage: 0, color: colors[i] }))
      }
    }

    let cumulativeCircumference = 0
    const circumference = 2 * Math.PI * 30 // ~188.49

    const segments = statusCounts.map((count, index) => {
      const percentage = (count / total) * 100
      const segmentLength = (percentage / 100) * circumference
      const strokeDasharray = `${segmentLength} ${circumference}`
      const strokeDashoffset = -cumulativeCircumference
      cumulativeCircumference += segmentLength

      return {
        percentage,
        strokeDasharray,
        strokeDashoffset: strokeDashoffset.toString(),
        color: colors[index]
      }
    }).filter(s => s.percentage > 0)

    const legend = statuses.map((s, i) => ({
      status: s,
      count: statusCounts[i],
      percentage: total > 0 ? Math.round((statusCounts[i] / total) * 100) : 0,
      color: colors[i]
    }))

    return { segments, legend }
  }

  const getVelocityChartData = () => {
    if (applications.length === 0) return { points: [], labels: [] }

    const sortedAppsByDate = [...applications].sort((a, b) => a.applied_date.localeCompare(b.applied_date))
    
    const today = new Date()
    const weeks: { start: Date; end: Date; label: string }[] = []
    
    for (let i = 5; i >= 0; i--) {
      const start = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const end = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const label = `Wk ${6-i}`
      weeks.push({ start, end, label })
    }

    let cumulative = 0
    const pointsData = weeks.map(week => {
      const countInWeek = sortedAppsByDate.filter(a => {
        const appTime = new Date(a.applied_date).getTime()
        return appTime >= week.start.getTime() && appTime < week.end.getTime()
      }).length
      cumulative += countInWeek
      return cumulative
    })

    const maxVal = Math.max(...pointsData, 5)
    const width = 300
    const height = 100
    const xInterval = width / (pointsData.length - 1)
    
    const coordinates = pointsData.map((val, idx) => {
      const x = idx * xInterval
      const y = height - (val / maxVal) * height
      return { x, y, value: val }
    })

    return {
      points: coordinates,
      labels: weeks.map(w => w.label)
    }
  }

  const donutData = getDonutChartData()
  const velocityData = getVelocityChartData()

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
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* Metrics Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i} className="p-4 flex items-center gap-4 border-white/5 bg-[#12131A]/60">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex flex-col gap-1 w-2/3">
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-5 w-3/4 rounded" />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-2">
          {/* Board view skeleton */}
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-3.5 p-3 rounded-xl border border-white/5 bg-black/20 min-h-[50vh]">
                <Skeleton className="h-5 w-2/3 rounded" />
                <div className="flex flex-col gap-2 mt-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-3/4 rounded" />
                      <Skeleton className="h-2 w-1/2 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Follow-up Alerts sidebar skeleton */}
          <div className="xl:col-span-1">
            <GlassCard className="p-5 h-[50vh] flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
              <Skeleton className="h-5 w-2/3 rounded" />
              <div className="flex flex-col gap-2 mt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-1/2 rounded" />
                    <Skeleton className="h-2 w-3/4 rounded" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in-entry flex flex-col gap-6 select-none">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent flex items-center gap-2">
            <Briefcase className="text-[var(--accent-purple)] shrink-0" size={28} />
            Internship Tracker
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Organize recruitment milestones, track interviews, set check reminders, and view conversion analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Selection Toggle */}
          <div className="flex items-center bg-white/5 border border-[var(--border-glass)] rounded-lg p-0.5 select-none">
            <button
              onClick={() => setCurrentView('kanban')}
              className={`p-1.5 rounded-md cursor-pointer transition-all ${currentView === 'kanban' ? 'bg-white/10 text-[var(--accent-blue)] font-bold' : 'text-[var(--text-secondary)] hover:text-white'}`}
              title="Kanban Board"
            >
              <Kanban size={15} />
            </button>
            <button
              onClick={() => setCurrentView('list')}
              className={`p-1.5 rounded-md cursor-pointer transition-all ${currentView === 'list' ? 'bg-white/10 text-[var(--accent-blue)] font-bold' : 'text-[var(--text-secondary)] hover:text-white'}`}
              title="Data Table View"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`p-1.5 rounded-md cursor-pointer transition-all ${currentView === 'analytics' ? 'bg-white/10 text-[var(--accent-blue)] font-bold' : 'text-[var(--text-secondary)] hover:text-white'}`}
              title="Analytics Charts"
            >
              <BarChart3 size={15} />
            </button>
          </div>

          <Button
            onClick={handleOpenCreateDrawer}
            className="flex items-center gap-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 text-xs font-bold shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer rounded-xl"
          >
            <Plus size={14} />
            Add Application
          </Button>
        </div>
      </div>

      {dbError && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2 max-w-3xl leading-relaxed select-text">
          <AlertCircle size={15} className="shrink-0" />
          <span>{dbError}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-4 border-white/5 bg-[#12131A]/60">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[var(--text-secondary)] shrink-0">
            <FileText size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Filed</span>
            <span className="text-xl font-bold text-[var(--text-primary)]">{totalApps}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4 border-white/5 bg-[#12131A]/60">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
            <Clock size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Interviews</span>
            <span className="text-xl font-bold text-[var(--text-primary)]">{interviewsCount}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4 border-white/5 bg-[#12131A]/60">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Offers Received</span>
            <span className="text-xl font-bold text-[var(--text-primary)]">{offersCount}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4 border-white/5 bg-[#12131A]/60">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 flex items-center justify-center text-[var(--accent-blue)] shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Response Rate</span>
            <span className="text-xl font-bold text-[var(--text-primary)]">{responseRate}%</span>
          </div>
        </GlassCard>
      </div>

      {/* Main Panel Content Split */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Column Workspace - 3 xl-cols */}
        <div className="xl:col-span-3 min-h-[60vh]">
          {loading ? (
            <div className="w-full h-[50vh] flex items-center justify-center">
              <Loader2 className="animate-spin text-[var(--accent-blue)]" size={32} />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* VIEW 1: KANBAN BOARD */}
              {currentView === 'kanban' && (
                <motion.div
                  key="kanban"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4"
                >
                  {columns.map((col) => {
                    const colApps = getAppsByStatus(col.key)
                    const isDraggedOver = draggedCardId !== null
                    
                    return (
                      <div
                        key={col.key}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.key)}
                        className={`flex flex-col gap-3.5 p-3 rounded-xl border min-h-[50vh] transition-colors ${col.border} ${col.bg} ${isDraggedOver ? 'bg-white/[0.01]' : ''}`}
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-1 border-b border-white/5 select-none">
                          <span className={`text-xs font-bold ${col.color}`}>{col.title}</span>
                          <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded-full text-[var(--text-muted)]">
                            {colApps.length}
                          </span>
                        </div>

                        {/* Column Cards Container */}
                        <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[65vh] pr-1 custom-scrollbar">
                          {colApps.length === 0 ? (
                            <div className="h-full border border-dashed border-white/5 rounded-lg flex items-center justify-center text-center p-4 min-h-[100px]">
                              <span className="text-[10px] text-[var(--text-muted)] select-none">Drop here</span>
                            </div>
                          ) : (
                            colApps.map((app) => {
                              const hasLocation = !!app.location
                              const hasSalary = !!app.salary
                              
                              return (
                                <div
                                  key={app.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, app.id)}
                                  onClick={() => handleOpenEditDrawer(app)}
                                  className="p-3 bg-black/40 hover:bg-[#171821]/80 border border-white/5 hover:border-[var(--border-glass-active)] rounded-xl cursor-grab active:cursor-grabbing transition-all select-none group/card hover:-translate-y-0.5"
                                >
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[100px]" title={app.company_name}>
                                        {app.company_name}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteApp(app.id)
                                        }}
                                        className="text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover/card:opacity-100 transition-opacity p-0.5 cursor-pointer shrink-0"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold truncate leading-none">
                                      {app.role}
                                    </span>

                                    {/* Bottom details indicators */}
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {hasLocation && (
                                        <span className="text-[9px] font-semibold flex items-center gap-0.5 text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">
                                          <MapPin size={8} />
                                          {app.location!.split(',')[0]}
                                        </span>
                                      )}
                                      {hasSalary && (
                                        <span className="text-[9px] font-bold flex items-center gap-0.5 text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                          <DollarSign size={8} />
                                          {app.salary}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              )}

              {/* VIEW 2: DETAILED TABLE LIST */}
              {currentView === 'list' && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GlassCard className="overflow-hidden border-white/5 bg-[#12131A]/60">
                    {applications.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center gap-3">
                        <Briefcase size={28} className="text-[var(--text-muted)] animate-pulse" />
                        <span className="text-xs text-[var(--text-muted)]">No applications logged yet. Click Add Application to start tracking.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto select-text">
                        <table className="min-w-full divide-y divide-[var(--border-glass)] text-left text-xs">
                          <thead className="bg-white/5 font-semibold text-[var(--text-primary)]">
                            <tr>
                              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Company</th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Role</th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Date Applied</th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Salary</th>
                              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Location</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-glass)] text-[var(--text-secondary)]">
                            {applications.map((app) => (
                              <tr
                                key={app.id}
                                className="hover:bg-white/[0.01] transition-colors cursor-pointer group/row font-medium"
                                onClick={() => handleOpenEditDrawer(app)}
                              >
                                <td className="px-4 py-3.5 font-bold text-[var(--text-primary)]">{app.company_name}</td>
                                <td className="px-4 py-3.5">{app.role}</td>
                                <td className="px-4 py-3.5 select-none">
                                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getStatusPillClasses(app.status)}`}>
                                    {getStatusLabel(app.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-[10px]">{app.applied_date}</td>
                                <td className="px-4 py-3.5 font-mono text-[10px] text-emerald-400">{app.salary || '—'}</td>
                                <td className="px-4 py-3.5">{app.location || '—'}</td>
                                <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2.5">
                                    <button
                                      onClick={() => handleOpenEditDrawer(app)}
                                      className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors p-1 cursor-pointer"
                                      title="Edit details"
                                    >
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteApp(app.id)}
                                      className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 cursor-pointer"
                                      title="Delete record"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* VIEW 3: ANALYTICS & INSIGHTS */}
              {currentView === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Chart 1: Donut Chart Status Distribution */}
                  <GlassCard className="p-6 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
                    <div className="flex flex-col gap-0.5 select-none">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Status Distribution</span>
                      <p className="text-[10px] text-[var(--text-muted)]">Breakdown of applications across recruitment funnels.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                      {/* SVG Circle Rendering */}
                      <div className="relative w-32 h-32 shrink-0 select-none">
                        <svg viewBox="0 0 80 80" className="w-full h-full transform -rotate-90">
                          {donutData.segments.map((seg, idx) => (
                            <circle
                              key={idx}
                              cx="40"
                              cy="40"
                              r="30"
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="8"
                              strokeDasharray={seg.strokeDasharray}
                              strokeDashoffset={seg.strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold text-[var(--text-primary)] leading-none">{totalApps}</span>
                          <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase mt-0.5">Total</span>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="flex flex-col gap-2 select-text">
                        {donutData.legend.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-[10px]">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-[var(--text-secondary)] font-semibold capitalize w-20 truncate">{getStatusLabel(item.status)}</span>
                            <span className="text-[var(--text-primary)] font-bold w-4 text-right">{item.count}</span>
                            <span className="text-[var(--text-muted)] w-8 text-right">({item.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Chart 2: Cumulative Application Velocity */}
                  <GlassCard className="p-6 flex flex-col gap-4 border-white/5 bg-[#12131A]/60">
                    <div className="flex flex-col gap-0.5 select-none">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Application Velocity</span>
                      <p className="text-[10px] text-[var(--text-muted)]">Cumulative applications submitted over the last 6 weeks.</p>
                    </div>

                    <div className="relative h-44 mt-2">
                      {totalApps === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
                          No timeline velocity data.
                        </div>
                      ) : (
                        <svg className="w-full h-full select-none" viewBox="0 0 300 120" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(157, 78, 221, 0.4)" />
                              <stop offset="100%" stopColor="rgba(157, 78, 221, 0)" />
                            </linearGradient>
                          </defs>

                          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1="0" y1="110" x2="300" y2="110" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                          {velocityData.points.length > 1 && (
                            <path
                              d={`M ${velocityData.points[0].x} 110 L ${velocityData.points.map(p => `${p.x} ${p.y + 10}`).join(' L ')} L ${velocityData.points[velocityData.points.length - 1].x} 110 Z`}
                              fill="url(#glowGrad)"
                            />
                          )}

                          {velocityData.points.length > 1 && (
                            <path
                              d={velocityData.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y + 10}`).join(' ')}
                              fill="none"
                              stroke="#9D4EDD"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          )}

                          {velocityData.points.map((p, idx) => (
                            <g key={idx}>
                              <circle
                                cx={p.x}
                                cy={p.y + 10}
                                r="4"
                                fill="#0B0C10"
                                stroke="#00D2FF"
                                strokeWidth="1.5"
                              />
                              <text
                                x={p.x}
                                y={p.y - 1}
                                textAnchor="middle"
                                fill="#F3F4F6"
                                fontSize="7"
                                fontWeight="bold"
                              >
                                {p.value}
                              </text>
                            </g>
                          ))}
                        </svg>
                      )}
                    </div>
                    <div className="flex justify-between items-center px-1 text-[8px] font-mono text-[var(--text-muted)] select-none">
                      {velocityData.labels.map((lbl, idx) => (
                        <span key={idx}>{lbl}</span>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Right Column workspace: Follow-up reminders panel - 1 xl-col */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <GlassCard className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto border-white/5 bg-[#12131A]/60">
            <div className="pb-2 border-b border-[var(--border-glass)] flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[var(--text-secondary)]" />
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Follow-up Alerts</span>
              </div>
              {overdueCount > 0 && (
                <span className="text-[9px] bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full text-red-400 font-bold animate-pulse">
                  {overdueCount} Overdue
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-[var(--accent-blue)]" />
              </div>
            ) : followUpReminders.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-3 select-none">
                <CheckCircle2 size={24} className="text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)] select-none font-medium">All caught up! No follow-ups.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 select-text font-medium">
                {followUpReminders.map((rem) => (
                  <div
                    key={rem.id}
                    onClick={() => handleOpenEditDrawer(rem)}
                    className={`p-3 bg-black/25 hover:bg-white/[0.02] border rounded-lg cursor-pointer transition-all flex flex-col gap-1.5 ${
                      rem.isOverdue 
                        ? 'border-red-500/20 bg-red-950/5' 
                        : rem.isToday 
                        ? 'border-amber-400/20 bg-amber-400/5'
                        : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 leading-none">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[120px]">{rem.company_name}</span>
                      {rem.isOverdue ? (
                        <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Overdue</span>
                      ) : rem.isToday ? (
                        <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Today</span>
                      ) : null}
                    </div>

                    <span className="text-[10px] text-[var(--text-secondary)] leading-none truncate max-w-[150px]">{rem.role}</span>
                    
                    <div className="flex items-center gap-1.5 mt-1 select-none">
                      <Calendar size={11} className={rem.isOverdue ? 'text-red-400' : rem.isToday ? 'text-amber-400' : 'text-[var(--text-muted)]'} />
                      <span className={`text-[10px] font-mono leading-none ${rem.isOverdue ? 'text-red-400 font-bold' : rem.isToday ? 'text-amber-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                        {rem.follow_up_date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Drawer Overlay Modal Panel (for Add/Edit) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-[#0d0e12] border-l border-[var(--border-glass)] shadow-2xl p-6 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-glass)] select-none">
                <div className="flex items-center gap-2">
                  <Briefcase className="text-[var(--accent-purple)]" size={18} />
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {editingApp ? 'Edit Application Details' : 'Add Internship Application'}
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitApp} className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 select-text">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="companyName" className="text-xs font-bold text-[var(--text-primary)]">Company Name</label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="e.g. Stripe, Google, Linear..."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="role" className="text-xs font-bold text-[var(--text-primary)]">Internship Role Title</label>
                  <input
                    id="role"
                    type="text"
                    placeholder="e.g. Backend Developer Intern, UX Designer..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 select-none">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Recruitment Stage Status</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['wishlist', 'applied', 'interviewing', 'offer', 'rejected'] as ApplicationStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`py-2 rounded-xl text-[9px] font-bold border uppercase tracking-wider cursor-pointer transition-colors ${
                          status === st
                            ? getStatusPillClasses(st) + ' border-current'
                            : 'bg-black/25 border-white/5 text-[var(--text-secondary)] hover:border-white/10 hover:text-white'
                        }`}
                      >
                        {getStatusLabel(st)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="appliedDate" className="text-xs font-bold text-[var(--text-primary)]">Applied Date</label>
                    <input
                      id="appliedDate"
                      type="date"
                      value={appliedDate}
                      onChange={(e) => setAppliedDate(e.target.value)}
                      className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition-all font-mono"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="followUpDate" className="text-xs font-bold text-[var(--text-primary)]">Follow-up Reminder</label>
                    <input
                      id="followUpDate"
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="salary" className="text-xs font-bold text-[var(--text-primary)]">Salary / Rate (Optional)</label>
                    <div className="relative flex items-center">
                      <DollarSign size={13} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        id="salary"
                        type="text"
                        placeholder="e.g. $45/hr, $8000/mo"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-8 pr-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="location" className="text-xs font-bold text-[var(--text-primary)]">Location (Optional)</label>
                    <div className="relative flex items-center">
                      <MapPin size={13} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        id="location"
                        type="text"
                        placeholder="e.g. SF, Remote, NY..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl pl-8 pr-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="notes" className="text-xs font-bold text-[var(--text-primary)]">Application Notes & Links</label>
                  <textarea
                    id="notes"
                    placeholder="Provide details about technical interview links, contact emails, or offer deadlines..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="bg-black/45 border border-[var(--border-glass)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-glow)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 mt-auto pt-4 select-none">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 border-[var(--border-glass)] hover:border-white/10 text-xs py-2 h-9 cursor-pointer rounded-xl font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black hover:opacity-95 text-xs py-2 h-9 font-bold shadow-lg shadow-[var(--accent-blue-glow)] border-0 cursor-pointer rounded-xl"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : (
                      'Save Application'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

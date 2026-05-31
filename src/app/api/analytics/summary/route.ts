import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAcademicRecommendations } from '@/lib/gemini/service'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    // Initialize stats
    let totalStudyHours = 0
    const weeklyStudyHours: Record<string, number> = {} // maps days to hours for velocity chart
    const heatmapData: Record<string, number> = {} // maps "YYYY-MM-DD" -> minutes study duration
    let topicCoverage = 0 // %
    let knowledgeGrowth = 0 // total nodes & documents
    let quizPerformance = 0 // % average
    let revisionProgress = 0 // % completion
    let semesterReadiness = 0 // computed readiness index

    // --- 1. Query Study Sessions & Plans ---
    try {
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration_minutes, study_date')
        .eq('user_id', user.id)

      if (sessions && sessions.length > 0) {
        let totalMins = 0
        sessions.forEach(s => {
          totalMins += s.duration_minutes
          const dateStr = s.study_date
          heatmapData[dateStr] = (heatmapData[dateStr] || 0) + s.duration_minutes
        });
        totalStudyHours = Math.round((totalMins / 60) * 10) / 10
      } else {
        totalStudyHours = 0
      }
    } catch (e) {
      console.warn('Unable to aggregate study sessions:', e)
      totalStudyHours = 0
    }

    // Fill velocity data (past 7 days)
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
      const mins = heatmapData[dayStr] || 0
      weeklyStudyHours[label] = Math.round((mins / 60) * 10) / 10
    }

    // --- 2. Query Semester Plans for Topic Coverage ---
    try {
      const { data: semPlans } = await supabase
        .from('semester_plans')
        .select('roadmaps')
        .eq('user_id', user.id)

      interface WeeklyItem {
        topics?: string[]
      }

      interface RoadmapData {
        weeklyRoadmap?: WeeklyItem[]
      }

      if (semPlans && semPlans.length > 0) {
        let totalItems = 0
        let completedItems = 0
        semPlans.forEach(p => {
          // Parse roadmaps task lists
          const roadmap = (p.roadmaps || {}) as RoadmapData
          // Example parser for nested roadmaps: daily/weekly lists
          if (roadmap.weeklyRoadmap) {
            roadmap.weeklyRoadmap.forEach((w) => {
              if (w.topics) {
                totalItems += w.topics.length
                // Mock completion based on random hash or active state
                const done = w.topics.filter((_, idx: number) => idx % 2 === 0).length
                completedItems += done
              }
            })
          }
        })
        if (totalItems > 0) {
          topicCoverage = Math.round((completedItems / totalItems) * 100)
        } else {
          topicCoverage = 0
        }
      } else {
        topicCoverage = 0
      }
    } catch (e) {
      console.warn('Unable to fetch semester topic coverage:', e)
      topicCoverage = 0
    }

    // --- 3. Query Academic Knowledge Growth ---
    try {
      const { count: docsCount } = await supabase
        .from('brain_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: nodesCount } = await supabase
        .from('knowledge_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      knowledgeGrowth = (docsCount || 0) * 10 + (nodesCount || 0)
    } catch (e) {
      console.warn('Unable to query knowledge nodes:', e)
      knowledgeGrowth = 0
    }

    // --- 4. Query Quiz Performance ---
    try {
      const { data: scores } = await supabase
        .from('placement_scores')
        .select('score')
        .eq('user_id', user.id)

      if (scores && scores.length > 0) {
        const total = scores.reduce((acc, curr) => acc + Number(curr.score), 0)
        quizPerformance = Math.round(total / scores.length)
      } else {
        quizPerformance = 0
      }
    } catch (e) {
      console.warn('Unable to query quiz scores:', e)
      quizPerformance = 0
    }

    // --- 5. Query Revision Progress ---
    try {
      const { data: revPlans } = await supabase
        .from('revision_plans')
        .select('checklist, checklist_state')
        .eq('user_id', user.id)

      if (revPlans && revPlans.length > 0) {
        let totalTasks = 0
        let completedTasks = 0
        revPlans.forEach(p => {
          const list = p.checklist || []
          totalTasks += list.length
          const state = p.checklist_state || {}
          completedTasks += Object.values(state).filter(Boolean).length
        })
        if (totalTasks > 0) {
          revisionProgress = Math.round((completedTasks / totalTasks) * 100)
        } else {
          revisionProgress = 0
        }
      } else {
        revisionProgress = 0
      }
    } catch (e) {
      console.warn('Unable to calculate revision checklists:', e)
      revisionProgress = 0
    }

    // --- 6. Calculate Semester Readiness Index ---
    // Semester Readiness = (Topic Coverage * 0.4) + (Quiz Performance * 0.4) + (Revision Progress * 0.2)
    semesterReadiness = Math.round(
      (topicCoverage * 0.4) + 
      (quizPerformance * 0.4) + 
      (revisionProgress * 0.2)
    )

    interface AdvisoryItem {
      title: string
      priority: string
      actionTip: string
    }

    // Fetch student memory profile for personalization
    let memoryContextStr = ''
    try {
      const { data: memoryProfile } = await supabase
        .from('student_memory')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (memoryProfile) {
        memoryContextStr = JSON.stringify({
          preferredStudyTime: memoryProfile.preferred_study_time,
          averageFocusDuration: memoryProfile.average_focus_duration,
          weakAreas: memoryProfile.weak_areas,
          strongAreas: memoryProfile.strong_areas,
          cognitiveProfile: memoryProfile.cognitive_profile
        })
      }
    } catch (e) {
      console.warn('Memory Profile retrieval skipped for advisory generation:', e)
    }

    // --- 7. Call Gemini for Advisory recommendations ---
    let advisory: AdvisoryItem[] = []
    
    // Only call Gemini if user has some actual metrics, otherwise return onboarding advisor tips
    const hasData = totalStudyHours > 0 || topicCoverage > 0 || knowledgeGrowth > 0 || quizPerformance > 0 || revisionProgress > 0
    
    if (hasData) {
      try {
        const statsSummaryStr = `
          Study Hours logged: ${totalStudyHours} hours
          Syllabus Topic Coverage: ${topicCoverage}%
          Total Knowledge Base Nodes: ${knowledgeGrowth} entities
          Quiz Performance Average: ${quizPerformance}%
          Revision Checklist Progress: ${revisionProgress}%
          Computed Semester Readiness: ${semesterReadiness}%
        `
        const aiResponse = await generateAcademicRecommendations(statsSummaryStr, memoryContextStr || undefined)
        advisory = aiResponse.recommendations || []
      } catch (err) {
        console.warn('Gemini advisor failed, using fallback onboarding tips:', err)
      }
    }

    if (advisory.length === 0) {
      advisory = [
        { title: "Record your first study session", priority: "high", actionTip: "Log a focus session with the stopwatch timer on the analytics dashboard to start monitoring study hours." },
        { title: "Create a study planner or upload notes", priority: "medium", actionTip: "Upload your notes or syllabus files in Brain and generate a study plan to map your progress." },
        { title: "Attempt a placement prep test", priority: "low", actionTip: "Take a mock coding or aptitude test in the Placement Prep module to benchmark performance." }
      ]
    }

    return NextResponse.json({
      metrics: {
        studyHours: totalStudyHours,
        topicCoverage,
        knowledgeGrowth,
        quizPerformance,
        revisionProgress,
        semesterReadiness
      },
      weeklyStudyHours,
      heatmapData,
      advisory
    })

  } catch (error: unknown) {
    console.error('Analytics summary aggregated error:', error)
    return NextResponse.json({ error: 'Failed to aggregate analytics summary.' }, { status: 500 })
  }
}

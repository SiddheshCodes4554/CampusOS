import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTwinProjection } from '@/lib/gemini/service'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    // 1. Fetch cognitive student memory
    let memorySummary = 'Learning Style: Active Recall, average focus: 45 minutes.'
    let weakAreas: string[] = []
    let strongAreas: string[] = []
    
    try {
      const { data: memoryData } = await supabase
        .from('student_memory')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (memoryData) {
        weakAreas = memoryData.weak_areas || []
        strongAreas = memoryData.strong_areas || []
        memorySummary = `Learning Style: ${memoryData.cognitive_profile?.learningStyle || 'Active Recall'}, Focus Stamina: ${memoryData.average_focus_duration} mins. Preferred Study Time: ${memoryData.preferred_study_time}. Weak Areas: ${weakAreas.join(', ')}. Strong Areas: ${strongAreas.join(', ')}.`
      }
    } catch (e) {
      console.warn('Twin API: memory table not available, using default context.', e)
    }

    // 2. Fetch placement quiz scores
    let quizList: string[] = []
    try {
      const { data: scores } = await supabase
        .from('placement_scores')
        .select('topic, score, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (scores && scores.length > 0) {
        quizList = scores.map(s => `Quiz on "${s.topic}" (${s.type}): Score ${s.score}%`)
      }
    } catch (e) {
      console.warn('Twin API: placement_scores table not available.', e)
    }

    // 3. Fetch active student projects
    let projectList: string[] = []
    try {
      const { data: projects } = await supabase
        .from('student_projects')
        .select('title, target_role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (projects && projects.length > 0) {
        projectList = projects.map(p => `Building "${p.title}" for Role "${p.target_role}"`)
      }
    } catch (e) {
      console.warn('Twin API: student_projects table not available.', e)
    }

    // 4. Fetch notes count
    let notesCount = 0
    try {
      const { count } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      notesCount = count || 0
    } catch (e) {
      console.warn('Twin API: notes table not available.', e)
    }

    // If the student has zero notes and zero quizzes, render Academic Twin Offline
    if (notesCount === 0 && quizList.length === 0) {
      return NextResponse.json({
        monologue: "Academic Twin Offline: Ingest materials to initialize cognitive telemetry",
        decayAlerts: [],
        priorityAction: "Upload notes or take a quiz to activate telemetry.",
        projectRelevance: "",
        telemetry: {
          forgettingIndex: 0,
          focusBattery: 0,
          latencyMs: 0,
          density: 0
        },
        offline: true
      })
    }

    // 5. Generate projection from Gemini
    const projection = await generateTwinProjection(
      memorySummary,
      quizList,
      projectList,
      notesCount
    )

    return NextResponse.json({
      ...projection,
      telemetry: {
        forgettingIndex: Math.max(0, 82 - (strongAreas.length * 4) + (weakAreas.length * 5)),
        focusBattery: 100,
        latencyMs: 140 + (weakAreas.length * 20),
        density: Math.min(100, (notesCount * 5) + (strongAreas.length * 8))
      }
    })

  } catch (error: unknown) {
    console.error('Twin Projection API Error:', error instanceof Error ? error.message : error)
    
    return NextResponse.json({
      monologue: "Academic Twin Offline: Ingest materials to initialize cognitive telemetry",
      decayAlerts: [],
      priorityAction: "Upload notes or take a quiz to activate telemetry.",
      projectRelevance: "",
      telemetry: {
        forgettingIndex: 0,
        focusBattery: 0,
        latencyMs: 0,
        density: 0
      },
      offline: true
    })
  }
}

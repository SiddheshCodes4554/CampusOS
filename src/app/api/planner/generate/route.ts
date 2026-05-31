import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStudyPlan } from '@/lib/gemini/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { subject, examDate, dailyHours } = await request.json()

    if (!subject || !examDate || !dailyHours) {
      return NextResponse.json({ error: 'Subject, exam date, and daily hours are required.' }, { status: 400 })
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
      console.warn('Memory Profile retrieval skipped for study plan generation:', e)
    }

    // Call Centralized Study Planner Service to get structured plan JSON
    const parsedRoadmap = await generateStudyPlan(subject, examDate, dailyHours, memoryContextStr || undefined)

    // Store in Supabase study_plans table
    const { data: studyPlan, error: dbError } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        subject,
        exam_date: examDate,
        daily_hours: parseFloat(dailyHours),
        roadmap: parsedRoadmap
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json(studyPlan)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate study plan.'
    console.error('Study Planner Generation Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

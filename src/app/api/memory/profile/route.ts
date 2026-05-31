import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('student_memory')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }

    // Default cognitive settings if no profile synced yet
    const defaultProfile = {
      user_id: user.id,
      preferred_study_time: 'evening',
      weak_areas: [],
      strong_areas: [],
      average_focus_duration: 45,
      cognitive_profile: {
        learningStyle: 'Active Recall',
        repetitionScale: 'Medium'
      },
      recent_topics_studied: [],
      last_sync_at: new Date().toISOString()
    }

    return NextResponse.json(profile || defaultProfile)
  } catch (err: unknown) {
    console.warn('Memory profile DB GET failed, using mock settings:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      preferred_study_time: 'evening',
      weak_areas: ['Recursive Algorithms', 'Database Normalization'],
      strong_areas: ['HTTP Protocol', 'Lexical Analysis'],
      average_focus_duration: 50,
      cognitive_profile: {
        learningStyle: 'Spaced Repetition',
        repetitionScale: 'High'
      },
      recent_topics_studied: ['Automata Theory', 'Database Systems'],
      last_sync_at: new Date().toISOString()
    })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { preferredStudyTime, averageFocusDuration, cognitiveProfile } = await request.json()

    const updateFields: Record<string, unknown> = {}
    if (preferredStudyTime !== undefined) updateFields.preferred_study_time = preferredStudyTime
    if (averageFocusDuration !== undefined) updateFields.average_focus_duration = parseInt(averageFocusDuration, 10)
    if (cognitiveProfile !== undefined) updateFields.cognitive_profile = cognitiveProfile
    updateFields.last_sync_at = new Date().toISOString()

    const { data: updated, error } = await supabase
      .from('student_memory')
      .upsert({
        user_id: user.id,
        ...updateFields
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Database error.'
    console.error('Memory profile update error:', err)
    return NextResponse.json({ error: errMsg, isFallback: true }, { status: 200 })
  }
}

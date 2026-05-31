import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('*')
      .order('study_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(sessions || [])
  } catch (err: unknown) {
    console.warn('Sessions DB read failed, returning empty list:', err instanceof Error ? err.message : err)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { subject, durationMinutes, focusRating, studyDate } = await request.json()

    if (!subject || !durationMinutes || !focusRating) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 })
    }

    const dur = parseInt(durationMinutes, 10)
    const rating = parseInt(focusRating, 10)

    if (isNaN(dur) || dur <= 0) {
      return NextResponse.json({ error: 'Duration must be a positive number.' }, { status: 400 })
    }
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Focus rating must be between 1 and 5.' }, { status: 400 })
    }

    const { data: newSession, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        subject,
        duration_minutes: dur,
        focus_rating: rating,
        study_date: studyDate || new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(newSession)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Database error.'
    console.error('Session logging API error:', err)
    return NextResponse.json({ error: errMsg, isFallback: true }, { status: 200 })
  }
}

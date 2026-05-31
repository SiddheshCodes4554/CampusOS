import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const onboardingData = await request.json()

    // 1. Update public.profiles onboarding status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_data: onboardingData,
        // Sync university and major from onboarding if provided
        university: onboardingData.university || 'Unknown University',
        major: onboardingData.branch || 'Undeclared'
      })
      .eq('id', user.id)

    if (profileError) {
      throw new Error(`Profile onboarding save failed: ${profileError.message}`)
    }

    // 2. Synthesize cognitive memory parameters based on onboarding preferences
    const focusDuration = parseInt(onboardingData.studyHours, 10) * 15 || 45 // map hours to focus duration block
    const preferredTime = onboardingData.productiveTime || 'evening'
    const learningStyle = onboardingData.learningStyle || 'Active Recall'

    const { error: memoryError } = await supabase
      .from('student_memory')
      .upsert({
        user_id: user.id,
        preferred_study_time: preferredTime,
        average_focus_duration: focusDuration,
        cognitive_profile: {
          learningStyle: Array.isArray(learningStyle) ? learningStyle[0] : learningStyle,
          repetitionScale: 'Medium'
        },
        weak_areas: [],
        strong_areas: [],
        recent_topics_studied: onboardingData.currentSubjects ? onboardingData.currentSubjects.split(',').map((s: string) => s.trim()) : [],
        last_sync_at: new Date().toISOString()
      })

    if (memoryError) {
      console.warn('Student Memory onboarding upsert failed (non-blocking):', memoryError.message)
    }

    // 3. Log memory timeline audit event
    try {
      await supabase
        .from('memory_logs')
        .insert({
          user_id: user.id,
          event_type: 'onboarding_sync',
          details: {
            summary: `Completed initial onboarding journey. Set up Academic Twin for ${onboardingData.firstName || 'Student'}.`,
            cognitive_details: { focusDuration, preferredTime, learningStyle }
          }
        })
    } catch (logErr) {
      console.warn('Logging onboarding memory log failed:', logErr)
    }

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Save onboarding failed.'
    console.error('Save Onboarding API Error:', error)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { synthesizeStudentMemory } from '@/lib/gemini/service'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    // 1. Gather historical databases content
    let notesCount = 0
    let docsCount = 0
    let recentScores: string[] = []
    let recentSessions: string[] = []
    let completedGoals = 0

    // Fetch notes count
    try {
      const { count } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      notesCount = count || 0
    } catch (e) {
      console.warn('Sync warning: Cannot read notes count:', e)
    }

    // Fetch brain docs count
    try {
      const { count } = await supabase
        .from('brain_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      docsCount = count || 0
    } catch (e) {
      console.warn('Sync warning: Cannot read brain documents count:', e)
    }

    // Fetch placement quiz scores
    try {
      const { data: scores } = await supabase
        .from('placement_scores')
        .select('topic, score, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (scores && scores.length > 0) {
        recentScores = scores.map(s => `Quiz on "${s.topic}" (${s.type}): Score ${s.score}%`)
      }
    } catch (e) {
      console.warn('Sync warning: Cannot read placement scores:', e)
    }

    // Fetch logged study sessions
    try {
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('subject, duration_minutes, focus_rating')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (sessions && sessions.length > 0) {
        recentSessions = sessions.map(s => `Studied "${s.subject}" for ${s.duration_minutes} mins with Focus Rating ${s.focus_rating}/5`)
      }
    } catch (e) {
      console.warn('Sync warning: Cannot read study sessions:', e)
    }

    // Fetch completed goals
    try {
      const { count } = await supabase
        .from('academic_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)
      completedGoals = count || 0
    } catch (e) {
      console.warn('Sync warning: Cannot read goals count:', e)
    }

    // 2. Synthesize study timeline history block
    const historyText = `
      Student Knowledge Base Stats:
      - Uploaded Course Notes count: ${notesCount} files
      - Grounding Documents count: ${docsCount} docs
      - Completed Academic Goals: ${completedGoals} objectives

      Recent Quiz Performance:
      ${recentScores.length > 0 ? recentScores.join('\n') : 'No quiz attempts logged.'}

      Recent Study Sessions logged:
      ${recentSessions.length > 0 ? recentSessions.join('\n') : 'No study hours logged.'}
    `.trim()

    // 3. Trigger Gemini Cognitive Modeler
    const aiMemorySummary = await synthesizeStudentMemory(historyText)

    // 4. Update memory table database
    const { data: updatedMemory, error: memoryError } = await supabase
      .from('student_memory')
      .upsert({
        user_id: user.id,
        preferred_study_time: aiMemorySummary.preferredStudyTime || 'evening',
        weak_areas: aiMemorySummary.weakAreas || [],
        strong_areas: aiMemorySummary.strongAreas || [],
        average_focus_duration: aiMemorySummary.avgFocusDuration || 45,
        cognitive_profile: aiMemorySummary.cognitiveProfile || { learningStyle: 'Active Recall', repetitionScale: 'Medium' },
        recent_topics_studied: recentSessions.slice(0, 3).map(s => s.split('Studied "')[1]?.split('"')[0]).filter(Boolean),
        last_sync_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memoryError) {
      console.warn('Failed to persist student memory inside db:', memoryError.message)
      // fallback to returning dynamic synthesized memory context if table not migrated
      return NextResponse.json({
        user_id: user.id,
        preferred_study_time: aiMemorySummary.preferredStudyTime || 'evening',
        weak_areas: aiMemorySummary.weakAreas || [],
        strong_areas: aiMemorySummary.strongAreas || [],
        average_focus_duration: aiMemorySummary.avgFocusDuration || 45,
        cognitive_profile: aiMemorySummary.cognitiveProfile || { learningStyle: 'Active Recall', repetitionScale: 'Medium' },
        recent_topics_studied: [],
        last_sync_at: new Date().toISOString(),
        isFallback: true
      })
    }

    // 5. Append memory log audit entry
    try {
      await supabase
        .from('memory_logs')
        .insert({
          user_id: user.id,
          event_type: 'study_habit',
          details: {
            summary: 'System cognitive memory rebuild synchronized successfully.',
            topics_detected: recentSessions.length
          }
        })
    } catch (logErr) {
      console.warn('Logging memory audit event failed:', logErr)
    }

    return NextResponse.json(updatedMemory)

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Cognitive memory sync failed.'
    console.error('Memory Sync API Error:', error)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

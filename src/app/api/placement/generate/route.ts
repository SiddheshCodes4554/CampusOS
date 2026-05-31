import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateAptitudeQuestions,
  generateDsaProblems,
  generateHrQuestions,
  startMockInterview,
  respondMockInterview,
  evaluateMockInterviewFinal
} from '@/lib/gemini/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { action, topic, message, history, simulatorRole } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 })
    }

    let result: unknown

    switch (action) {
      case 'aptitude':
        if (!topic) {
          return NextResponse.json({ error: 'Topic is required for aptitude practice.' }, { status: 400 })
        }
        result = await generateAptitudeQuestions(topic)
        break

      case 'dsa':
        if (!topic) {
          return NextResponse.json({ error: 'Topic is required for DSA coding problems.' }, { status: 400 })
        }
        result = await generateDsaProblems(topic)
        break

      case 'hr':
        result = await generateHrQuestions()
        break

      case 'simulator_start':
        if (!simulatorRole) {
          return NextResponse.json({ error: 'Role is required to start mock interview simulation.' }, { status: 400 })
        }
        result = await startMockInterview(simulatorRole)
        break

      case 'simulator_respond':
        if (!message) {
          return NextResponse.json({ error: 'Message response is required.' }, { status: 400 })
        }
        result = await respondMockInterview(topic || 'Software Engineer', message, history || [])
        break

      case 'simulator_evaluate_final':
        result = await evaluateMockInterviewFinal(history || [])
        break

      default:
        return NextResponse.json({ error: 'Invalid action parameter specified.' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'AI generation failed.'
    console.error('Placement Prep API Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

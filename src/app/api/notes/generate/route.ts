import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  generateNoteSummary, 
  generateNoteQuiz, 
  generateNoteFlashcards, 
  queryNoteChat 
} from '@/lib/gemini/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { action, text, query, history } = await request.json()

    if (!action || !text) {
      return NextResponse.json({ error: 'Action and source text parameters are required.' }, { status: 400 })
    }

    let result: unknown

    switch (action) {
      case 'summarize':
        result = await generateNoteSummary(text)
        break

      case 'quiz':
        result = await generateNoteQuiz(text)
        break

      case 'flashcards':
        result = await generateNoteFlashcards(text)
        break

      case 'chat':
        if (!query) {
          return NextResponse.json({ error: 'Query prompt is required for chat action.' }, { status: 400 })
        }
        result = await queryNoteChat(text, query, history || [])
        break

      default:
        return NextResponse.json({ error: 'Invalid action parameter specified.' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'AI generation failed.'
    console.error('Smart Notes Generator Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

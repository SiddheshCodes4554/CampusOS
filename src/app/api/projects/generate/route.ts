import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProjectIdeas } from '@/lib/gemini/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { targetRole, skillLevel, interests } = await request.json()

    if (!targetRole || !skillLevel || !interests) {
      return NextResponse.json({ error: 'Target role, skill level, and interests are required.' }, { status: 400 })
    }

    // Call Centralized Project Service to get tailored project recommendations
    const parsedData = await generateProjectIdeas(targetRole, skillLevel, interests)
    return NextResponse.json(parsedData)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate projects.'
    console.error('Project Builder API Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

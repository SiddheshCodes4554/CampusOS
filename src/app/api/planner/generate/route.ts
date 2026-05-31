import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGemini } from '@/lib/gemini/client'

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

    // Call Gemini with Response Schema constraints to return structured plan JSON
    const systemInstruction = 
      'You are a premier college study coordinator. Based on the subject, exam date, and daily study hours constraint, you generate structured, sequential weekly milestones and revision schedules. Ensure output strictly matches the requested JSON schema structure.'

    const prompt = 
      `Create a detailed study roadmap for the subject: "${subject}". The exam is scheduled on: "${examDate}". The student can dedicate "${dailyHours}" hours per day. Generate weekly milestones up to the exam date, with realistic daily checklist tasks. Include specific dates for revision phases.`

    const responseSchema = {
      type: "object",
      properties: {
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              week: { type: "integer" },
              title: { type: "string" },
              focus: { type: "string" },
              tasks: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["week", "title", "focus", "tasks"]
          }
        },
        revision: {
          type: "array",
          items: {
            type: "object",
            properties: {
              phase: { type: "string" },
              date: { type: "string" },
              topic: { type: "string" }
            },
            required: ["phase", "date", "topic"]
          }
        }
      },
      required: ["milestones", "revision"]
    }

    const aiOutput = await callGemini(prompt, systemInstruction, responseSchema)
    const parsedRoadmap = JSON.parse(aiOutput)

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

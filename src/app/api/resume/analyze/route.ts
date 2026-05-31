import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'


export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    // Convert file to base64 buffer for Gemini
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')

    const systemInstruction = 
      'You are a premier college resume reviewer and ATS checker. You analyze resumes for formatting, content, keywords, and job matchings. Returns output strictly matching the JSON schema.'

    const promptText = 
      'Perform an ATS audit of the attached resume PDF. Grade the resume on a scale of 0 to 100. Identify missing technical keywords and soft skills, recommend specific improvement items, and suggest 3 matching career fields.'

    const responseSchema = {
      type: "object",
      properties: {
        score: { type: "integer" },
        missingSkills: {
          type: "array",
          items: { type: "string" }
        },
        improvements: {
          type: "array",
          items: { type: "string" }
        },
        careerSuggestions: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["score", "missingSkills", "improvements", "careerSuggestions"]
    }

    // Call standardized Gemini multimodal service client (handles rate limits & backoff retries)
    const { callGeminiMultimodal } = await import('@/lib/gemini/client')
    const aiOutput = await callGeminiMultimodal(
      base64Data,
      "application/pdf",
      promptText,
      systemInstruction,
      responseSchema,
      'resume_ats_audit'
    )
    const parsedReport = JSON.parse(aiOutput)

    // Store in Supabase resume_reports table
    const { data: report, error: dbError } = await supabase
      .from('resume_reports')
      .insert({
        user_id: user.id,
        file_name: file.name,
        score: parsedReport.score,
        report_data: {
          missingSkills: parsedReport.missingSkills,
          improvements: parsedReport.improvements,
          careerSuggestions: parsedReport.careerSuggestions
        }
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json(report)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze resume.'
    console.error('Resume Analyzer Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

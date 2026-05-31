import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface GeminiRequestBody {
  contents: Array<{
    parts: Array<{
      inlineData?: {
        mimeType: string
        data: string
      }
      text?: string
    }>
  }>
  systemInstruction?: {
    parts: Array<{ text: string }>
  }
  generationConfig?: {
    responseMimeType: string
    responseSchema: object
  }
}

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

    // Call Gemini API with direct base64 document attachment
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

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

    const requestBody: GeminiRequestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            },
            {
              text: promptText
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema
      }
    }

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text()
      throw new Error(`Gemini API Error: ${geminiRes.status} - ${errorText}`)
    }

    const data = await geminiRes.json()
    const aiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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

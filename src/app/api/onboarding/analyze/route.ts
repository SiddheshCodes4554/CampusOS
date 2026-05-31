import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGemini } from '@/lib/gemini/client'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    // 1. Fetch recently ingested documents (past 15 mins) for RAG context
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: docs, error: docsError } = await supabase
      .from('brain_documents')
      .select('id, file_name, category')
      .eq('user_id', user.id)
      .eq('processed', true)
      .gte('created_at', fifteenMinsAgo)

    if (docsError) {
      throw new Error(`Docs retrieval failed: ${docsError.message}`)
    }

    let compiledContext = ''
    if (docs && docs.length > 0) {
      const docIds = docs.map(d => d.id)
      
      const { data: chunks } = await supabase
        .from('brain_chunks')
        .select('content, document_id')
        .in('document_id', docIds)
        .order('chunk_index', { ascending: true })
        .limit(40) // Limit context token footprint

      if (chunks && chunks.length > 0) {
        chunks.forEach(c => {
          const doc = docs.find(d => d.id === c.document_id)
          const fname = doc?.file_name || 'Document'
          compiledContext += `File Name: "${fname}" | Content:\n${c.content}\n\n`
        })
      }
    }

    // If no context, output a generic default response to save time/prevent API errors
    if (!compiledContext.trim()) {
      return NextResponse.json({
        subjects: ['Your Uploaded Subjects'],
        units: ['Unit 1: Overview', 'Unit 2: Core Architectures'],
        topics: ['Basic Principles', 'Advanced Configurations'],
        strengths: ['Knowledge Import Activated'],
        weaknesses: ['Diagnostic Quiz Pending']
      })
    }

    // 2. Call Gemini to perform onboarding diagnostics
    const systemInstruction = 
      'You are an elite academic diagnostic parser. Analyze the uploaded course documents and syllabi. Extract all subjects covered, list major units/modules, summarize core topics, and diagnose potential weak and strong areas. Output must strictly match the JSON schema structure.'

    const prompt = `Ingest these course materials and syllabus details to construct my Academic Twin data mapping:\n\n${compiledContext}`

    const responseSchema = {
      type: "object",
      properties: {
        subjects: {
          type: "array",
          items: { type: "string" }
        },
        units: {
          type: "array",
          items: { type: "string" }
        },
        topics: {
          type: "array",
          items: { type: "string" }
        },
        strengths: {
          type: "array",
          items: { type: "string" }
        },
        weaknesses: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["subjects", "units", "topics", "strengths", "weaknesses"]
    }

    const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'onboarding_diagnostics')
    const twinSummary = JSON.parse(aiOutput)

    // 3. Update student memory with diagnosed strong/weak areas
    try {
      await supabase
        .from('student_memory')
        .update({
          weak_areas: twinSummary.weaknesses || [],
          strong_areas: twinSummary.strengths || [],
          recent_topics_studied: twinSummary.subjects || [],
          last_sync_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
    } catch (memErr) {
      console.warn('Student Memory update failed inside onboarding analysis:', memErr)
    }

    return NextResponse.json(twinSummary)

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Analysis failed.'
    console.error('Onboarding Analysis API Error:', error)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

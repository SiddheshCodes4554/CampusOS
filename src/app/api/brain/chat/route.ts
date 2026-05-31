import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryAcademicBrain } from '@/lib/gemini/retrieval'


export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { query: rawQuery, history } = await request.json()

    if (!rawQuery) {
      return NextResponse.json({ error: 'Query parameter is required.' }, { status: 400 })
    }

    const { sanitizeInput, callGemini } = await import('@/lib/gemini/client')
    const query = sanitizeInput(rawQuery)

    // 1. Fetch retrieval context from Academic Brain RAG Engine
    const brain = await queryAcademicBrain(user.id, query, 5)

    // 2. Define Response Schema for Cited Answer Output
    const responseSchema = {
      type: "object",
      properties: {
        answer: { type: "string" },
        confidenceScore: { type: "integer" },
        citations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              fileName: { type: "string" },
              pageNumber: { type: "integer" },
              contentSnippet: { type: "string" },
              confidence: { type: "integer" }
            },
            required: ["fileName", "contentSnippet", "confidence"]
          }
        }
      },
      required: ["answer", "confidenceScore", "citations"]
    }

    // 3. Formulate Prompt & Constraints
    const systemInstruction = 
      `You are the CampusOS Academic Brain Chat Copilot. Your goal is to answer student questions STRICKLY using the retrieved context from their uploaded notes, syllabus, assignments, and slides.

Rules:
1. Formulate your answer ONLY from the source segments provided in the RAG context block. Do not use external training knowledge.
2. Cite every fact. If multiple files are referenced, include them in the citations list. Estimate page numbers if page offsets are found in headers.
3. Provide an overall confidenceScore (0-100) on how comprehensively the context answered the query. If the context is empty or unrelated, set confidence to 0 and state that the information was not found in their Academic Brain library.`

    const historyText = history && Array.isArray(history)
      ? history.map((h: { role: string; content: string }) => `${h.role === 'user' ? 'Student' : 'Copilot'}: ${h.content}`).join('\n')
      : ''

    let prompt = ''
    if (brain.hasMemory) {
      prompt += `${brain.contextMarkdown}\n\n`
    } else {
      prompt += `WARNING: The student's Academic Brain vector store currently has NO relevant memory chunks matching this query.\n\n`
    }

    if (historyText) {
      prompt += `Conversation History:\n${historyText}\n\n`
    }

    prompt += `Student Query: ${query}`

    // Call standardized Gemini service client
    const rawChatText = await callGemini(prompt, systemInstruction, responseSchema, 'brain_chat')
    const parsedChat = JSON.parse(rawChatText)

    return NextResponse.json(parsedChat)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Academic Chat failed.'
    console.error('Academic Chat API Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

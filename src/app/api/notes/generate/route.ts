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

    const { action, text, query, history } = await request.json()

    if (!action || !text) {
      return NextResponse.json({ error: 'Action and source text parameters are required.' }, { status: 400 })
    }

    let systemInstruction = ''
    let prompt = ''
    let responseSchema: object | undefined = undefined

    switch (action) {
      case 'summarize':
        systemInstruction = 
          'You are an expert academic tutor. You summarize long study notes into concise, well-formatted Markdown bullet points. Include key takeaways, main definitions, and core concepts. Output should be returned in a clean JSON format matching the schema.'
        
        prompt = `Generate a detailed study summary for the following text:\n\n${text}`
        
        responseSchema = {
          type: "object",
          properties: {
            summary: { type: "string" }
          },
          required: ["summary"]
        }
        break

      case 'quiz':
        systemInstruction = 
          'You are an expert academic coordinator. Based on the provided study materials, you generate 5 realistic multiple-choice practice quiz questions. Ensure that questions range in difficulty, cover important concepts in the text, and contain detailed helpful explanations for the correct answers. Output must strictly match the JSON schema structure.'
        
        prompt = `Generate 5 multiple-choice practice quiz questions based on the following study materials:\n\n${text}`
        
        responseSchema = {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    items: { type: "string" }
                  },
                  correctIndex: { type: "integer" },
                  explanation: { type: "string" }
                },
                required: ["question", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
        break

      case 'flashcards':
        systemInstruction = 
          'You are a study coordinator specialized in active recall and spaced repetition. You convert the study text into 5-10 direct flashcards. Each card has a specific "front" (question, term, or prompt) and a concise "back" (answer, explanation, or definition). Output must strictly match the JSON schema structure.'
        
        prompt = `Generate 6-10 active recall flashcards based on the following study text:\n\n${text}`
        
        responseSchema = {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" }
                },
                required: ["front", "back"]
              }
            }
          },
          required: ["flashcards"]
        }
        break

      case 'chat':
        if (!query) {
          return NextResponse.json({ error: 'Query prompt is required for chat action.' }, { status: 400 })
        }
        
        systemInstruction = 
          'You are a smart note copilot RAG assistant. You answer questions strictly using the provided study sources as your primary context. If the answer cannot be found in the provided sources, answer using your general knowledge but clearly state that the information was not in the student\'s notes. Keep your answers brief, structured, and student-focused.'
        
        const historyText = history && Array.isArray(history)
          ? history.map((h: { role: string; content: string }) => `${h.role === 'user' ? 'Student' : 'Copilot'}: ${h.content}`).join('\n')
          : ''

        prompt = `Here are the student's study source notes:\n---START SOURCES---\n${text}\n---END SOURCES---\n\n`
        if (historyText) {
          prompt += `Conversation History:\n${historyText}\n\n`
        }
        prompt += `Student Question: ${query}`

        responseSchema = {
          type: "object",
          properties: {
            answer: { type: "string" }
          },
          required: ["answer"]
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action parameter specified.' }, { status: 400 })
    }

    const aiOutput = await callGemini(prompt, systemInstruction, responseSchema)
    const parsedData = JSON.parse(aiOutput)
    
    return NextResponse.json(parsedData)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'AI generation failed.'
    console.error('Smart Notes Generator Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

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

    const { action, topic, message, history, simulatorRole } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 })
    }

    let systemInstruction = ''
    let prompt = ''
    let responseSchema: object | undefined = undefined

    switch (action) {
      case 'aptitude':
        if (!topic) {
          return NextResponse.json({ error: 'Topic is required for aptitude practice.' }, { status: 400 })
        }
        systemInstruction = 
          'You are a quantitative and logical aptitude examiner. Based on the selected topic, you generate 3 multiple-choice practice questions. Ensure that questions range in difficulty, cover relevant formulas/patterns, and contain detailed step-by-step explanations. Output must strictly match the JSON schema structure.'
        
        prompt = `Generate 3 aptitude questions (MCQ) for the topic: "${topic}".`
        
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

      case 'dsa':
        if (!topic) {
          return NextResponse.json({ error: 'Topic is required for DSA coding problems.' }, { status: 400 })
        }
        systemInstruction = 
          'You are a technical coding interviewer. You generate 2 Leetcode-style coding challenges for the chosen DSA topic. Provide a professional title, difficulty label (Easy, Medium, Hard), complete description, constraints, sample inputs and outputs, optimal approach summary (using Big O), and code editor boilerplate template for JavaScript. Output must strictly match the JSON schema structure.'
        
        prompt = `Generate 2 DSA coding problems for the topic: "${topic}".`
        
        responseSchema = {
          type: "object",
          properties: {
            problems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  difficulty: { type: "string" },
                  description: { type: "string" },
                  inputOutput: { type: "string" },
                  approach: { type: "string" },
                  boilerplate: { type: "string" }
                },
                required: ["title", "difficulty", "description", "inputOutput", "approach", "boilerplate"]
              }
            }
          },
          required: ["problems"]
        }
        break

      case 'hr':
        systemInstruction = 
          'You are a corporate human resources manager conducting behavioral interviews. You generate 3 common behavioral questions (e.g. leadership, conflict, motivation). For each question, provide detailed guidelines on how to structure the response using the STAR method (Situation, Task, Action, Result) and outline a sample ideal answer. Output must strictly match the JSON schema structure.'
        
        prompt = 'Generate 3 common behavioral HR interview questions.'
        
        responseSchema = {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  starModel: {
                    type: "object",
                    properties: {
                      situation: { type: "string" },
                      task: { type: "string" },
                      action: { type: "string" },
                      result: { type: "string" }
                    },
                    required: ["situation", "task", "action", "result"]
                  },
                  idealOutline: { type: "string" }
                },
                required: ["question", "starModel", "idealOutline"]
              }
            }
          },
          required: ["questions"]
        }
        break

      case 'simulator_start':
        if (!simulatorRole) {
          return NextResponse.json({ error: 'Role is required to start mock interview simulation.' }, { status: 400 })
        }
        systemInstruction = 
          'You are an AI recruiter conducting a job interview. You start by greeting the student professionally, introducing yourself, and asking the first interview question tailored specifically for the chosen job role. Return your opening remarks and the first question in the JSON schema.'
        
        prompt = `Start a simulated professional interview for the role: "${simulatorRole}".`
        
        responseSchema = {
          type: "object",
          properties: {
            message: { type: "string" },
            question: { type: "string" }
          },
          required: ["message", "question"]
        }
        break

      case 'simulator_respond':
        if (!message) {
          return NextResponse.json({ error: 'Message response is required.' }, { status: 400 })
        }
        systemInstruction = 
          'You are an AI recruiter conducting a job interview. You evaluate the student\'s response to your previous question. Provide a score out of 100 assessing their correctness, tone, and delivery. Give brief constructive feedback on how they can improve, and ask the next interview question. Output strictly matching the JSON schema.'

        const historyText = history && Array.isArray(history)
          ? history.map((h: { role: string; content: string }) => `${h.role === 'user' ? 'Candidate' : 'Interviewer'}: ${h.content}`).join('\n')
          : ''

        prompt = `Selected Job Role: "${topic || 'Software Engineer'}"\n\n`
        if (historyText) {
          prompt += `Conversation History:\n${historyText}\n\n`
        }
        prompt += `Candidate Answer: ${message}`

        responseSchema = {
          type: "object",
          properties: {
            feedback: { type: "string" },
            score: { type: "integer" },
            nextQuestion: { type: "string" }
          },
          required: ["feedback", "score", "nextQuestion"]
        }
        break

      case 'simulator_evaluate_final':
        systemInstruction = 
          'You are an expert recruitment coordinator. Review the provided mock interview conversation logs. Grade their overall performance, return a final placement readiness score out of 100, outline 3 distinct strengths, 3 weaknesses/areas of improvement, and issue a professional summary. Output strictly matching the JSON schema.'

        prompt = `Mock Interview Transcript Logs:\n${
          Array.isArray(history) 
            ? history.map((h: { role: string; content: string }) => `${h.role === 'user' ? 'Candidate' : 'Interviewer'}: ${h.content}`).join('\n')
            : 'No transcripts logged.'
        }`

        responseSchema = {
          type: "object",
          properties: {
            overallScore: { type: "integer" },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            weaknesses: {
              type: "array",
              items: { type: "string" }
            },
            summary: { type: "string" }
          },
          required: ["overallScore", "strengths", "weaknesses", "summary"]
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
    console.error('Placement Prep API Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

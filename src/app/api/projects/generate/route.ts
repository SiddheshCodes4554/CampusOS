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

    const { targetRole, skillLevel, interests } = await request.json()

    if (!targetRole || !skillLevel || !interests) {
      return NextResponse.json({ error: 'Target role, skill level, and interests are required.' }, { status: 400 })
    }

    const systemInstruction = 
      'You are a premier career advisor and technical architect for software engineering students. Based on the target role, skill level, and interests, you generate 3 highly tailored, professional coding project ideas that would stand out on a resume. For each project, you generate a title, description, features, tech stack, a text-based ASCII directory architecture, a step-by-step checkable roadmap, and a complete, comprehensive Markdown Product Requirement Document (PRD). You must return output strictly matching the requested JSON schema structure.'

    const prompt = 
      `Generate 3 distinct, professional project ideas for a student with the following profile:
- Target Role: "${targetRole}"
- Skill Level: "${skillLevel}"
- Interests: "${interests}"

For each of the 3 projects, you must provide:
1. A professional title.
2. A detailed description.
3. 4-6 key features.
4. A list of technologies in the tech stack suitable for a student project.
5. An ASCII-based file system directory architecture layout representing a professional folder setup.
6. A detailed, chronological roadmap with 3-4 phases, each having 3-5 checkable implementation tasks.
7. A complete, professional, Markdown-formatted Product Requirement Document (PRD) containing:
   - Executive Summary
   - Target Audience & User Personas
   - Core Features & Detailed Functional Requirements
   - Tech Stack & System Architecture Overview
   - Out of Scope features for V1
   - Success Metrics & KPIs for evaluation

Ensure the PRD is comprehensive, rich in detail, and formatted beautifully in markdown. Do not include markdown code block backticks inside the JSON string other than escaping them properly if necessary; it is better to write normal markdown headings, lists, and tables without enclosing the whole text in backticks.`

    const responseSchema = {
      type: "object",
      properties: {
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              features: {
                type: "array",
                items: { type: "string" }
              },
              techStack: {
                type: "array",
                items: { type: "string" }
              },
              architecture: { type: "string" },
              roadmap: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    phase: { type: "string" },
                    tasks: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["phase", "tasks"]
                }
              },
              prd: { type: "string" }
            },
            required: ["title", "description", "features", "techStack", "architecture", "roadmap", "prd"]
          }
        }
      },
      required: ["projects"]
    }

    const aiOutput = await callGemini(prompt, systemInstruction, responseSchema)
    
    // Parse to ensure it is valid JSON, then return it
    const parsedData = JSON.parse(aiOutput)
    return NextResponse.json(parsedData)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate projects.'
    console.error('Project Builder API Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

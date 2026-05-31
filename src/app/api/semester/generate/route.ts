import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromDocx, extractTextFromPptx } from '@/lib/gemini/extractors'


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
      return NextResponse.json({ error: 'No syllabus file uploaded.' }, { status: 400 })
    }

    // Convert file to base64 buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')

    // Determine correct MIME type
    let mimeType = file.type
    if (!mimeType) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'pdf') mimeType = 'application/pdf'
      else if (ext === 'txt') mimeType = 'text/plain'
      else if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      else mimeType = 'application/octet-stream'
    }

    // 1. Upload to Supabase Storage with local mock fallback
    let fileUrl = `/mock-uploads/${file.name}`
    try {
      const bucketName = 'syllabi'
      const filePath = `${user.id}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: true })
      
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath)
        if (urlData?.publicUrl) {
          fileUrl = urlData.publicUrl
        }
      } else {
        console.warn('Storage upload warning for syllabus:', uploadError?.message)
      }
      console.log('Uploaded syllabus to storage:', fileUrl)
    } catch (err: unknown) {
      console.warn('Supabase Storage syllabus bucket upload failed, using fallback URL:', err)
    }

    // 2. Extract text/markdown from the document depending on extension
    let extractedSyllabusText = ''
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'docx') {
      extractedSyllabusText = await extractTextFromDocx(buffer)
    } else if (extension === 'pptx') {
      extractedSyllabusText = extractTextFromPptx(buffer)
    } else if (extension === 'txt') {
      extractedSyllabusText = buffer.toString('utf8')
    } else {
      // PDF or Image fallback: Call Gemini Multimodal parsing to extract clean text via service layer
      const { callGeminiMultimodal } = await import('@/lib/gemini/client')
      const extractPrompt = "Extract all structural units, module topics, grading distributions, and practical lab assignments from this syllabus file. Format the result as clean Markdown text."
      const extractSysInst = "You are a professional course syllabus text extraction assistant."
      
      extractedSyllabusText = await callGeminiMultimodal(
        base64Data,
        mimeType,
        extractPrompt,
        extractSysInst,
        undefined,
        'semester_syllabus_ocr'
      )
    }

    if (!extractedSyllabusText.trim()) {
      throw new Error("No syllabus content could be parsed.")
    }

    // 3. Define Response Schema for Copilot Output
    const responseSchema = {
      type: "object",
      properties: {
        subjectName: { type: "string" },
        subjectCode: { type: "string" },
        units: {
          type: "array",
          items: {
            type: "object",
            properties: {
              unitNumber: { type: "integer" },
              title: { type: "string" },
              topics: {
                type: "array",
                items: { type: "string" }
              },
              weightage: { type: "integer" }
            },
            required: ["unitNumber", "title", "topics", "weightage"]
          }
        },
        marksDistribution: {
          type: "object",
          properties: {
            finalExam: { type: "integer" },
            internalExams: { type: "integer" },
            projects: { type: "integer" },
            assignments: { type: "integer" },
            practicals: { type: "integer" }
          },
          required: ["finalExam", "internalExams", "projects", "assignments", "practicals"]
        },
        practicals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" }
            },
            required: ["name", "description"]
          }
        },
        roadmaps: {
          type: "object",
          properties: {
            semester: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string" },
                  milestones: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["month", "milestones"]
              }
            },
            weekly: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  week: { type: "integer" },
                  focus: { type: "string" },
                  tasks: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["week", "focus", "tasks"]
              }
            },
            daily: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string" },
                  tasks: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["day", "tasks"]
              }
            },
            revision: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  dates: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["topic", "dates"]
              }
            }
          },
          required: ["semester", "weekly", "daily", "revision"]
        },
        examPrep: {
          type: "object",
          properties: {
            internalPrep: {
              type: "array",
              items: { type: "string" }
            },
            finalPrep: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["internalPrep", "finalPrep"]
        }
      },
      required: [
        "subjectName",
        "subjectCode",
        "units",
        "marksDistribution",
        "practicals",
        "roadmaps",
        "examPrep"
      ]
    }

    // 4. Generate structured roadmaps and calendar prep from syllabus text via service layer
    const copilotPrompt = `Analyze the following syllabus text. Understand course topics, marks weightings, and practical labs. Generate a detailed semester schedule, weekly topics, daily study checklists, spaced repetition revision sessions, and internal/final exam test preparations. Return output strictly matching the JSON schema.\n\nSYLLABUS CONTENT:\n${extractedSyllabusText}`
    const copilotSysInst = "You are an expert college academic dean and curriculum planner. You design structured study roadmaps from syllabi."
    
    const { callGemini } = await import('@/lib/gemini/client')
    const rawCopilotText = await callGemini(
      copilotPrompt,
      copilotSysInst,
      responseSchema,
      'semester_plan_generate'
    )
    const parsedCopilot = JSON.parse(rawCopilotText)

    // 5. Store in Supabase semester_plans table
    const { data: plan, error: dbError } = await supabase
      .from('semester_plans')
      .insert({
        user_id: user.id,
        subject_name: parsedCopilot.subjectName,
        subject_code: parsedCopilot.subjectCode,
        units: parsedCopilot.units,
        marks_distribution: parsedCopilot.marksDistribution,
        practicals: parsedCopilot.practicals,
        roadmaps: parsedCopilot.roadmaps,
        exam_prep: parsedCopilot.examPrep
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: `Database saving failed: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json(plan)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Semester Copilot generation failed.'
    console.error('Semester Copilot API Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

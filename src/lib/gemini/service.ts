import { callGemini } from './client'
import { createClient } from '@/lib/supabase/server'
import { queryAcademicBrain } from './retrieval'

/**
 * Helper to fetch retrieval context from the Academic Brain.
 */
async function getBrainContext(query: string, limit: number = 3): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const brain = await queryAcademicBrain(user.id, query, limit)
      return brain.hasMemory ? brain.contextMarkdown : ''
    }
  } catch (err: unknown) {
    console.warn('Failed to retrieve Academic Brain context for query:', query, err)
  }
  return ''
}

// ----------------------------------------------------
// 1. STUDY PLANNER SERVICE
// ----------------------------------------------------
export async function generateStudyPlan(subject: string, examDate: string, dailyHours: string) {
  const brainContext = await getBrainContext(`${subject} syllabus coursework exam`)

  const systemInstruction = 
    'You are a premier college study coordinator. Based on the subject, exam date, daily study hours, and any uploaded materials in the Academic Brain, you generate structured, sequential weekly milestones and revision schedules. Ensure output strictly matches the requested JSON schema structure.'

  let prompt = `Create a detailed study roadmap for the subject: "${subject}". The exam is scheduled on: "${examDate}". The student can dedicate "${dailyHours}" hours per day. Generate weekly milestones up to the exam date, with realistic daily checklist tasks. Include specific dates for revision phases.`

  if (brainContext) {
    prompt += `\n\nUse the following extracted student study records and syllabus metrics as the primary source of truth for planning topic details, weights, and priorities:\n${brainContext}`
  }

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

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'generate_study_plan')
  return JSON.parse(aiOutput)
}

// ----------------------------------------------------
// 2. PROJECT BUILDER SERVICE
// ----------------------------------------------------
export async function generateProjectIdeas(targetRole: string, skillLevel: string, interests: string) {
  const brainContext = await getBrainContext(`${targetRole} ${interests} coursework projects`)

  const systemInstruction = 
    'You are a premier career advisor and technical architect for software engineering students. Based on the target role, skill level, interests, and uploaded course materials, you generate 3 highly tailored, professional coding project ideas that would stand out on a resume. For each project, you generate a title, description, features, tech stack, a text-based ASCII directory architecture, a step-by-step checkable roadmap, and a complete, comprehensive Markdown Product Requirement Document (PRD). You must return output strictly matching the requested JSON schema structure.'

  let prompt = 
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

Ensure the PRD is comprehensive, rich in detail, and formatted beautifully in markdown.`

  if (brainContext) {
    prompt += `\n\nEnsure these project ideas tie into the student's actual learning concepts, coursework files, or lecture notes retrieved from their Academic Brain:\n${brainContext}`
  }

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

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'generate_project_ideas')
  return JSON.parse(aiOutput)
}

// ----------------------------------------------------
// 3. SMART NOTES SERVICE
// ----------------------------------------------------
export async function generateGroundedSummary(text: string) {
  const systemInstruction = 
    'You are an expert academic tutor. You summarize long study notes and materials into concise, well-formatted Markdown bullet points. Include key takeaways, main definitions, and core concepts. You must base your output strictly on the provided text. You must also return a citations list matching specific facts to their document origins (use the file names provided in the text or state "Current Note" if not specified). Output must strictly match the JSON schema structure.'
  
  const prompt = `Generate a detailed study summary and source citations for the following text:\n\n${text}`
  
  const responseSchema = {
    type: "object",
    properties: {
      summary: { type: "string" },
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
    required: ["summary", "citations"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'notes_summarize')
  return JSON.parse(aiOutput)
}

export async function generateGroundedQuiz(text: string) {
  const systemInstruction = 
    'You are an expert academic coordinator. Based on the provided study materials, generate 5 realistic multiple-choice practice quiz questions. Ensure that questions range in difficulty, cover important concepts in the text, and contain detailed helpful explanations for the correct answers. You must base your output strictly on the provided text. You must also return a citations list matching the questions to their document origins. Output must strictly match the JSON schema structure.'
  
  const prompt = `Generate 5 multiple-choice practice quiz questions and source citations based on the following study materials:\n\n${text}`
  
  const responseSchema = {
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
      },
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
    required: ["questions", "citations"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'notes_quiz')
  return JSON.parse(aiOutput)
}

export async function generateGroundedFlashcards(text: string) {
  const systemInstruction = 
    'You are a study coordinator specialized in active recall and spaced repetition. You convert the study text into 5-10 direct flashcards. Each card has a specific "front" (question, term, or prompt) and a concise "back" (answer, explanation, or definition). You must base your output strictly on the provided text. You must also return a citations list matching the flashcards to their document origins. Output must strictly match the JSON schema structure.'
  
  const prompt = `Generate 6-10 active recall flashcards and source citations based on the following study text:\n\n${text}`
  
  const responseSchema = {
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
      },
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
    required: ["flashcards", "citations"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'notes_flashcards')
  return JSON.parse(aiOutput)
}

export async function generateGroundedMCQs(text: string) {
  const systemInstruction = 
    'You are an expert academic coordinator. Based on the provided study materials, generate 10 detailed multiple-choice questions (MCQs) for comprehensive coursework testing. Ensure that questions range in difficulty, cover important concepts, and contain detailed helpful explanations for the correct answers. You must base your output strictly on the provided text. You must also return a citations list matching the MCQs to their document origins. Output must strictly match the JSON schema structure.'
  
  const prompt = `Generate 10 multiple-choice questions (MCQs) and source citations based on the following study materials:\n\n${text}`
  
  const responseSchema = {
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
      },
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
    required: ["questions", "citations"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'notes_mcqs')
  return JSON.parse(aiOutput)
}

export async function generateGroundedViva(text: string) {
  const systemInstruction = 
    'You are an academic examiner conducting a viva voce (oral exam). Based on the provided study materials, generate 6 challenging verbal examination questions along with their ideal conceptual answers and brief explanations. You must base your output strictly on the provided text. You must also return a citations list matching the viva questions to their document origins. Output must strictly match the JSON schema structure.'
  
  const prompt = `Generate 6 viva examination questions, ideal answers, explanations, and source citations based on the following study materials:\n\n${text}`
  
  const responseSchema = {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
            explanation: { type: "string" }
          },
          required: ["question", "answer", "explanation"]
        }
      },
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
    required: ["questions", "citations"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'notes_viva')
  return JSON.parse(aiOutput)
}

export async function generateGroundedInterview(text: string) {
  const systemInstruction = 
    'You are a technical interviewer and career mentor. Based on the provided study materials, generate 6 job or internship interview preparation questions. The questions should include both technical concepts and behavioral scenarios. For each question, provide an ideal answer, specify the category (e.g., technical or behavioral), and indicate the difficulty level (e.g., easy, medium, or hard). You must base your output strictly on the provided text. You must also return a citations list matching the interview questions to their document origins. Output must strictly match the JSON schema structure.'
  
  const prompt = `Generate 6 interview preparation questions, ideal answers, categories, difficulties, and source citations based on the following study materials:\n\n${text}`
  
  const responseSchema = {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            idealAnswer: { type: "string" },
            category: { type: "string" },
            difficulty: { type: "string" }
          },
          required: ["question", "idealAnswer", "category", "difficulty"]
        }
      },
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
    required: ["questions", "citations"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'notes_interview')
  return JSON.parse(aiOutput)
}

export async function queryGroundedNoteChat(text: string, query: string, history: Array<{ role: string; content: string }>) {
  const systemInstruction = 
    'You are a smart note copilot RAG assistant. You answer questions strictly using the provided study sources as your primary context. If the answer cannot be found in the provided sources, state that the information is not in the study materials and refuse to answer (to keep grounded). Keep your answers brief, structured, and student-focused.'
  
  const historyText = history && Array.isArray(history)
    ? history.map(h => `${h.role === 'user' ? 'Student' : 'Copilot'}: ${h.content}`).join('\n')
    : ''

  let prompt = `Here are the student's study source notes:\n---START SOURCES---\n${text}\n---END SOURCES---\n\n`
  
  if (historyText) {
    prompt += `Conversation History:\n${historyText}\n\n`
  }
  prompt += `Student Question: ${query}`

  const responseSchema = {
    type: "object",
    properties: {
      answer: { type: "string" },
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
    required: ["answer", "citations"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'notes_chat')
  return JSON.parse(aiOutput)
}

// ----------------------------------------------------
// 4. PLACEMENT PREPARATION SERVICE
// ----------------------------------------------------
export async function generateAptitudeQuestions(topic: string) {
  const brainContext = await getBrainContext(`${topic} aptitude math exam`)

  const systemInstruction = 
    'You are a quantitative and logical aptitude examiner. Based on the selected topic and Academic Brain logs, you generate 3 multiple-choice practice questions. Ensure that questions range in difficulty, cover relevant formulas/patterns, and contain detailed step-by-step explanations. Output must strictly match the JSON schema structure.'
  
  let prompt = `Generate 3 aptitude questions (MCQ) for the topic: "${topic}".`
  if (brainContext) {
    prompt += `\n\nEnsure questions align with the student's actual level, syllabus, or lecture guidelines retrieved from their Academic Brain:\n${brainContext}`
  }
  
  const responseSchema = {
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

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'placement_aptitude')
  return JSON.parse(aiOutput)
}

export async function generateDsaProblems(topic: string) {
  const brainContext = await getBrainContext(`${topic} DSA algorithm coding`)

  const systemInstruction = 
    'You are a technical coding interviewer. You generate 2 Leetcode-style coding challenges for the chosen DSA topic. Provide a professional title, difficulty label (Easy, Medium, Hard), complete description, constraints, sample inputs and outputs, optimal approach summary (using Big O), and code editor boilerplate template for JavaScript. Output must strictly match the JSON schema structure.'
  
  let prompt = `Generate 2 DSA coding problems for the topic: "${topic}".`
  if (brainContext) {
    prompt += `\n\nTether problem topics to courses or concepts found in the student's Academic Brain:\n${brainContext}`
  }
  
  const responseSchema = {
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

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'placement_dsa')
  return JSON.parse(aiOutput)
}

export async function generateHrQuestions() {
  const brainContext = await getBrainContext("HR behavioral interview coursework skills")

  const systemInstruction = 
    'You are a corporate human resources manager conducting behavioral interviews. You generate 3 common behavioral questions (e.g. leadership, conflict, motivation). For each question, provide detailed guidelines on how to structure the response using the STAR method (Situation, Task, Action, Result) and outline a sample ideal answer. Output must strictly match the JSON schema structure.'
  
  let prompt = 'Generate 3 common behavioral HR interview questions.'
  if (brainContext) {
    prompt += `\n\nCustomize these questions or ideal outlines to draw from the student's actual project experiences or courses logged in their Academic Brain:\n${brainContext}`
  }
  
  const responseSchema = {
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

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'placement_hr')
  return JSON.parse(aiOutput)
}

export async function startMockInterview(jobRole: string) {
  const brainContext = await getBrainContext(`${jobRole} skills projects`)

  const systemInstruction = 
    'You are an AI recruiter conducting a job interview. You start by greeting the student professionally, introducing yourself, and asking the first interview question tailored specifically for the chosen job role. Return your opening remarks and the first question in the JSON schema.'
  
  let prompt = `Start a simulated professional interview for the role: "${jobRole}".`
  if (brainContext) {
    prompt += `\n\nExtract relevant projects, major concepts, and student skills from their Academic Brain to reference dynamically during the greeting and initial question:\n${brainContext}`
  }
  
  const responseSchema = {
    type: "object",
    properties: {
      message: { type: "string" },
      question: { type: "string" }
    },
    required: ["message", "question"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'simulator_start')
  return JSON.parse(aiOutput)
}

export async function respondMockInterview(jobRole: string, userMessage: string, history: Array<{ role: string; content: string }>) {
  const brainContext = await getBrainContext(`${jobRole} skills projects evaluation`)

  const systemInstruction = 
    'You are an AI recruiter conducting a job interview. You evaluate the student\'s response to your previous question. Provide a score out of 100 assessing their correctness, tone, and delivery. Give brief constructive feedback on how they can improve, and ask the next interview question. Output strictly matching the JSON schema.'

  const historyText = history && Array.isArray(history)
    ? history.map(h => `${h.role === 'user' ? 'Candidate' : 'Interviewer'}: ${h.content}`).join('\n')
    : ''

  let prompt = `Selected Job Role: "${jobRole}"\n\n`
  if (brainContext) {
    prompt += `Candidate Academic Context from Academic Brain:\n${brainContext}\n\n`
  }
  if (historyText) {
    prompt += `Conversation History:\n${historyText}\n\n`
  }
  prompt += `Candidate Answer: ${userMessage}`

  const responseSchema = {
    type: "object",
    properties: {
      feedback: { type: "string" },
      score: { type: "integer" },
      nextQuestion: { type: "string" }
    },
    required: ["feedback", "score", "nextQuestion"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'simulator_respond')
  return JSON.parse(aiOutput)
}

export async function evaluateMockInterviewFinal(history: Array<{ role: string; content: string }>) {
  const systemInstruction = 
    'You are an expert recruitment coordinator. Review the provided mock interview conversation logs. Grade their overall performance, return a final placement readiness score out of 100, outline 3 distinct strengths, 3 weaknesses/areas of improvement, and issue a professional summary. Output strictly matching the JSON schema.'

  const prompt = `Mock Interview Transcript Logs:\n${
    Array.isArray(history) 
      ? history.map(h => `${h.role === 'user' ? 'Candidate' : 'Interviewer'}: ${h.content}`).join('\n')
      : 'No transcripts logged.'
  }`

  const responseSchema = {
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

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'simulator_final_evaluation')
  return JSON.parse(aiOutput)
}

// ----------------------------------------------------
// 5. EXAM INTELLIGENCE ENGINE SERVICE
// ----------------------------------------------------
export async function generateExamAnalysis(subjectName: string, compiledText: string) {
  const systemInstruction = 
    'You are an elite academic diagnostic examiner. Based on the provided syllabus, notes, and previous year exam papers, analyze repeated patterns, estimate topic weightage, map high-priority chapters, and predict probable questions. Output must strictly match the JSON schema structure.'

  const prompt = `Perform an exam intelligence diagnostic analysis for the subject: "${subjectName}". Use the following source materials (syllabus, notes, past papers) as the primary context:\n\n${compiledText}`

  const responseSchema = {
    type: "object",
    properties: {
      subject: { type: "string" },
      highPriorityChapters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            chapterName: { type: "string" },
            importanceScore: { type: "integer" },
            reason: { type: "string" },
            frequencyInPYQs: { type: "integer" }
          },
          required: ["chapterName", "importanceScore", "reason", "frequencyInPYQs"]
        }
      },
      heatmapTopics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topicName: { type: "string" },
            chapterName: { type: "string" },
            importance: { type: "string" },
            pyqOccurrence: { type: "integer" },
            lectureNoteMention: { type: "string" },
            estimatedMarksWeightage: { type: "integer" }
          },
          required: ["topicName", "chapterName", "importance", "pyqOccurrence", "lectureNoteMention", "estimatedMarksWeightage"]
        }
      },
      probableQuestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            chapterName: { type: "string" },
            expectedMarks: { type: "integer" },
            answerOutline: { type: "string" }
          },
          required: ["question", "chapterName", "expectedMarks", "answerOutline"]
        }
      }
    },
    required: ["subject", "highPriorityChapters", "heatmapTopics", "probableQuestions"]
  }

  const aiOutput = await callGemini(prompt, systemInstruction, responseSchema, 'exam_intelligence_analyze')
  return JSON.parse(aiOutput)
}

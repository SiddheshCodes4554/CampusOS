import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  generateGroundedSummary, 
  generateGroundedQuiz, 
  generateGroundedFlashcards, 
  generateGroundedMCQs, 
  generateGroundedViva, 
  generateGroundedInterview, 
  queryGroundedNoteChat 
} from '@/lib/gemini/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { action, noteIds, docIds, currentNoteText, query, history } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 })
    }

    // 1. Resolve unified source context
    let compiledText = ''

    // Fallback: If no sources are checked, use the active workspace notes text (passed as currentNoteText)
    const hasNoteIds = Array.isArray(noteIds) && noteIds.length > 0
    const hasDocIds = Array.isArray(docIds) && docIds.length > 0

    if (currentNoteText && !hasNoteIds && !hasDocIds) {
      compiledText += `Source Study Material (Active Workspace Note):\n${currentNoteText}\n\n`
    }

    // Fetch note contents from Database
    if (hasNoteIds) {
      const { data: noteRecords } = await supabase
        .from('notes')
        .select('title, content')
        .in('id', noteIds)
      
      if (noteRecords) {
        noteRecords.forEach(n => {
          compiledText += `Source Note: "${n.title}"\nContent:\n${n.content}\n\n`
        })
      }
    }

    // Fetch document chunks from Database
    if (hasDocIds) {
      const { data: chunkRecords } = await supabase
        .from('brain_chunks')
        .select('content, brain_documents (file_name)')
        .in('document_id', docIds)
        .order('chunk_index', { ascending: true })

      interface ChunkRecord {
        content: string
        brain_documents: {
          file_name: string
        } | null
      }

      if (chunkRecords) {
        const fileChunks: Record<string, string[]> = {}
        const typedChunks = chunkRecords as unknown as ChunkRecord[]
        typedChunks.forEach((c) => {
          const fname = c.brain_documents?.file_name || 'Document'
          if (!fileChunks[fname]) fileChunks[fname] = []
          fileChunks[fname].push(c.content)
        })

        for (const [fname, contents] of Object.entries(fileChunks)) {
          // Retrieve up to top 15 chunks per document
          const docText = contents.slice(0, 15).join('\n')
          compiledText += `Source Study Material (Document "${fname}"):\nContent:\n${docText}\n\n`
        }
      }
    }

    if (!compiledText.trim()) {
      return NextResponse.json({ error: 'No source text or selected materials found to analyze.' }, { status: 400 })
    }

    let result: unknown

    switch (action) {
      case 'summarize':
        result = await generateGroundedSummary(compiledText)
        break

      case 'quiz':
        result = await generateGroundedQuiz(compiledText)
        break

      case 'flashcards':
        result = await generateGroundedFlashcards(compiledText)
        break

      case 'mcqs':
        result = await generateGroundedMCQs(compiledText)
        break

      case 'viva':
        result = await generateGroundedViva(compiledText)
        break

      case 'interview':
        result = await generateGroundedInterview(compiledText)
        break

      case 'chat':
        if (!query) {
          return NextResponse.json({ error: 'Query prompt is required for chat action.' }, { status: 400 })
        }
        result = await queryGroundedNoteChat(compiledText, query, history || [])
        break

      default:
        return NextResponse.json({ error: 'Invalid action parameter specified.' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'AI generation failed.'
    console.error('Smart Notes Generator Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}


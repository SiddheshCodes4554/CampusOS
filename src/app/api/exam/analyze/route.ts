import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateExamAnalysis } from '@/lib/gemini/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { subjectName, syllabusDocIds, noteDocIds, pyqDocIds } = await request.json()

    if (!subjectName) {
      return NextResponse.json({ error: 'Subject name parameter is required.' }, { status: 400 })
    }

    const sDocIds = Array.isArray(syllabusDocIds) ? syllabusDocIds : []
    const nDocIds = Array.isArray(noteDocIds) ? noteDocIds : []
    const pDocIds = Array.isArray(pyqDocIds) ? pyqDocIds : []

    const allDocIds = [...sDocIds, ...nDocIds, ...pDocIds]

    if (allDocIds.length === 0) {
      return NextResponse.json({ error: 'At least one syllabus, note, or past paper document must be selected.' }, { status: 400 })
    }

    // 1. Fetch chunks for all selected documents
    const { data: chunkRecords, error: chunkError } = await supabase
      .from('brain_chunks')
      .select('content, brain_documents (id, file_name, category)')
      .in('document_id', allDocIds)
      .order('chunk_index', { ascending: true })

    if (chunkError) {
      return NextResponse.json({ error: `Database chunk retrieval failed: ${chunkError.message}` }, { status: 500 })
    }

    // 2. Format grounding text context grouped by source category
    let compiledContext = ''
    
    interface SupabaseChunkRecord {
      content: string
      brain_documents: {
        id: string
        file_name: string
        category: string
      } | null
    }

    if (chunkRecords) {
      const typedRecords = chunkRecords as unknown as SupabaseChunkRecord[]
      const fileMap: Record<string, { category: string; chunks: string[] }> = {}

      typedRecords.forEach(c => {
        const docInfo = c.brain_documents
        const fname = docInfo?.file_name || 'Document'
        const category = docInfo?.category || 'notes'
        if (!fileMap[fname]) {
          fileMap[fname] = { category, chunks: [] }
        }
        fileMap[fname].chunks.push(c.content)
      })

      for (const [fname, meta] of Object.entries(fileMap)) {
        // limit to first 12 chunks to maintain safety boundary limits
        const text = meta.chunks.slice(0, 12).join('\n')
        compiledContext += `Source Document Category: [${meta.category.toUpperCase()}] | File Name: "${fname}"\nContent:\n${text}\n\n`
      }
    }

    if (!compiledContext.trim()) {
      return NextResponse.json({ error: 'Selected study documents contain no parsed textual content.' }, { status: 400 })
    }

    // Fetch student memory profile for personalization
    let memoryContextStr = ''
    try {
      const { data: memoryProfile } = await supabase
        .from('student_memory')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (memoryProfile) {
        memoryContextStr = JSON.stringify({
          preferredStudyTime: memoryProfile.preferred_study_time,
          averageFocusDuration: memoryProfile.average_focus_duration,
          weakAreas: memoryProfile.weak_areas,
          strongAreas: memoryProfile.strong_areas,
          cognitiveProfile: memoryProfile.cognitive_profile
        })
      }
    } catch (e) {
      console.warn('Memory Profile retrieval skipped for exam intelligence generation:', e)
    }

    // 3. Trigger Exam Predictor Analysis
    const aiReport = await generateExamAnalysis(subjectName, compiledContext, memoryContextStr || undefined)

    // 4. Save analysis results to Supabase Database
    const { data: savedPredict, error: saveError } = await supabase
      .from('exam_predictions')
      .insert({
        user_id: user.id,
        subject_name: subjectName,
        analysis: aiReport,
        readiness_checklist: {}
      })
      .select()
      .single()

    if (saveError) {
      console.warn('Failed to save prediction analysis to db:', saveError.message)
      // fallback to returning dynamic content if table is not yet migrated
      return NextResponse.json({
        id: `temp-${Date.now()}`,
        subject_name: subjectName,
        analysis: aiReport,
        readiness_checklist: {},
        created_at: new Date().toISOString()
      })
    }

    return NextResponse.json(savedPredict)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Exam pattern analysis failed.'
    console.error('Exam Pattern Analyzer API Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

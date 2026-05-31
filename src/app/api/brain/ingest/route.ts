import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEmbeddings } from '@/lib/gemini/embeddings'
import { extractTextFromDocx, extractTextFromPptx } from '@/lib/gemini/extractors'


/**
 * Helper to split text into overlapping semantic-aware chunks.
 */
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  if (text.length <= chunkSize) return [text]
  
  const chunks: string[] = []
  let start = 0
  
  while (start < text.length) {
    let end = start + chunkSize
    
    // Try to align chunk borders on sentence endings or paragraph break
    if (end < text.length) {
      const remainingSearch = text.substring(end - 100, end + 100)
      const lastPeriod = remainingSearch.lastIndexOf('.')
      const lastNewLine = remainingSearch.lastIndexOf('\n')
      
      const bestSplit = Math.max(lastPeriod, lastNewLine)
      if (bestSplit !== -1) {
        end = end - 100 + bestSplit + 1
      }
    }
    
    const chunk = text.substring(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }
    
    start = end - overlap
  }
  
  return chunks
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
    const category = formData.get('category') as string // enum doc_category

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required (e.g. syllabus, notes, assignment, pyq).' }, { status: 400 })
    }

    // Convert file to base64 buffer for Gemini multimodal processing
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
      const bucketName = 'academic_brain'
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
        console.warn('Storage upload warning, continuing with fallback URL:', uploadError?.message)
      }
    } catch (err: unknown) {
      console.warn('Supabase storage bucket upload failed, using fallback URL:', err)
    }

    // 2. Insert brain_documents row
    const { data: doc, error: docError } = await supabase
      .from('brain_documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        category: category,
        processed: false
      })
      .select()
      .single()

    if (docError) {
      return NextResponse.json({ error: `Failed to register document: ${docError.message}` }, { status: 500 })
    }

    // 3. Extract text/markdown from the document based on type
    let extractedMarkdown = ''
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'docx') {
      extractedMarkdown = await extractTextFromDocx(buffer)
    } else if (extension === 'pptx') {
      extractedMarkdown = extractTextFromPptx(buffer)
    } else if (extension === 'txt') {
      extractedMarkdown = buffer.toString('utf8')
    } else {
      // PDF or fallback: Call Gemini Multimodal parsing via service layer (handles OCR, rate-limiting & retries)
      const { callGeminiMultimodal } = await import('@/lib/gemini/client')
      const extractPrompt = "Extract all text, headers, checklists, equations, and tables from this academic file. Return the document content formatted as clean, structured Markdown. Do not wrap in extra markdown block formatting tags, just output clean text content."
      const extractSysInst = "You are an expert academic text extractor. You parse documents into structurally correct Markdown."
      
      extractedMarkdown = await callGeminiMultimodal(
        base64Data,
        mimeType,
        extractPrompt,
        extractSysInst,
        undefined,
        'brain_ingest_ocr'
      )
    }

    if (!extractedMarkdown.trim()) {
      throw new Error("No text content could be extracted from this document.")
    }

    // 4. Create chunks and generate vector embeddings
    const chunks = chunkText(extractedMarkdown)
    
    // Embedding Cache Lookup (Embedding Reuse Optimization from Case Study)
    const uniqueChunks = Array.from(new Set(chunks))
    const cachedEmbeddingMap = new Map<string, number[]>()

    if (uniqueChunks.length > 0) {
      try {
        const { data: cachedChunks, error: cacheErr } = await supabase
          .from('brain_chunks')
          .select('content, embedding')
          .in('content', uniqueChunks)

        if (!cacheErr && cachedChunks) {
          for (const cc of cachedChunks) {
            let embeddingVector: number[] = []
            if (typeof cc.embedding === 'string') {
              embeddingVector = cc.embedding.replace(/[\[\]]/g, '').split(',').map(Number)
            } else if (Array.isArray(cc.embedding)) {
              embeddingVector = cc.embedding
            }
            if (embeddingVector.length > 0) {
              cachedEmbeddingMap.set(cc.content, embeddingVector)
            }
          }
        }
      } catch (cacheFetchErr) {
        console.warn('Database embedding cache lookup failed, generating fresh embeddings:', cacheFetchErr)
      }
    }

    const chunksToEmbed = chunks.filter(c => !cachedEmbeddingMap.has(c))
    let newEmbeddings: number[][] = []
    if (chunksToEmbed.length > 0) {
      newEmbeddings = await getEmbeddings(chunksToEmbed)
    }

    let newEmbeddingsIdx = 0
    const embeddings = chunks.map(c => {
      if (cachedEmbeddingMap.has(c)) {
        return cachedEmbeddingMap.get(c)!
      } else {
        return newEmbeddings[newEmbeddingsIdx++]
      }
    })

    // 5. Save chunks to brain_chunks in batch
    const chunksToInsert = chunks.map((content, idx) => ({
      document_id: doc.id,
      user_id: user.id,
      content,
      chunk_index: idx,
      embedding: embeddings[idx]
    }))

    const { error: chunkInsertErr } = await supabase
      .from('brain_chunks')
      .insert(chunksToInsert)

    if (chunkInsertErr) {
      throw new Error(`Failed to store vector chunks: ${chunkInsertErr.message}`)
    }

    // 6. Extract Knowledge Graph entities and relations from document text
    const graphSchema = {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" }, // Concept, Equation, Event, Course, Topic
              description: { type: "string" }
            },
            required: ["name", "type", "description"]
          }
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              target: { type: "string" },
              relation: { type: "string" } // e.g. PREREQUISITE_OF, COVERS, TESTS_ON, EXPLAINED_BY
            },
            required: ["source", "target", "relation"]
          }
        }
      },
      required: ["nodes", "edges"]
    }

    const graphPrompt = `Analyze the following academic document contents and extract key concepts, courses, equations, and milestones as Graph Nodes. Map relationships between them (like 'prerequisite of' or 'covers') as Graph Edges. Return output strictly matching the JSON schema.\n\nDOCUMENT CONTENTS:\n${extractedMarkdown}`
    const graphSysInst = "You are a professional software architect mapping knowledge networks from study materials."
    
    try {
      const { callGemini } = await import('@/lib/gemini/client')
      const rawGraphText = await callGemini(
        graphPrompt,
        graphSysInst,
        graphSchema,
        'brain_ingest_graph'
      )
      const parsedGraph = JSON.parse(rawGraphText)

      if (parsedGraph.nodes && parsedGraph.nodes.length > 0) {
        // Upsert nodes in batch
        const nodesToUpsert = parsedGraph.nodes.map((n: { name: string; type: string; description: string }) => ({
          user_id: user.id,
          name: n.name,
          type: n.type,
          description: n.description
        }))

        const { data: insertedNodes, error: nodesErr } = await supabase
          .from('knowledge_nodes')
          .upsert(nodesToUpsert, { onConflict: 'user_id,name,type' })
          .select('id, name, type')

        if (!nodesErr && insertedNodes) {
          // Map node names to their database IDs for edge construction
          const nodeMap = new Map<string, string>()
          insertedNodes.forEach(n => {
            nodeMap.set(n.name.toLowerCase(), n.id)
          })

          // Build edges with correct foreign key mappings
          const edgesToUpsert = []
          for (const edge of parsedGraph.edges) {
            const sourceId = nodeMap.get(edge.source.toLowerCase())
            const targetId = nodeMap.get(edge.target.toLowerCase())
            
            if (sourceId && targetId) {
              edgesToUpsert.push({
                user_id: user.id,
                source_node_id: sourceId,
                target_node_id: targetId,
                relation_type: edge.relation
              })
            }
          }

          if (edgesToUpsert.length > 0) {
            await supabase
              .from('knowledge_edges')
              .upsert(edgesToUpsert, { onConflict: 'user_id,source_node_id,target_node_id,relation_type' })
          }
        }
      }
    } catch (graphErr: unknown) {
      console.warn('Knowledge Graph extraction skipped/failed, proceeding without graph nodes:', graphErr)
    }

    // 7. Update document processed status
    await supabase
      .from('brain_documents')
      .update({ processed: true })
      .eq('id', doc.id)

    return NextResponse.json({ 
      success: true, 
      document: { ...doc, processed: true },
      chunksCount: chunks.length 
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Ingestion failed.'
    console.error('Academic Brain Ingestion Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

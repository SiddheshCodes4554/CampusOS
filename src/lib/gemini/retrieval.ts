import { createClient } from '@/lib/supabase/server'
import { getEmbedding } from './embeddings'

interface BrainContext {
  contextMarkdown: string
  hasMemory: boolean
  matchedConcepts: string[]
}

/**
 * Queries the Academic Brain for a user's query.
 * Combines pgvector similarity search over chunks with 1-hop Knowledge Graph traversal.
 */
export async function queryAcademicBrain(
  userId: string,
  query: string,
  limit: number = 4
): Promise<BrainContext> {
  const supabase = await createClient()
  
  let queryVector: number[] = []
  try {
    queryVector = await getEmbedding(query)
  } catch (err: unknown) {
    console.warn('Failed to generate query embedding, falling back to database keyword-only search:', err)
  }

  let retrievedChunks: Array<{ content: string; file_name: string; category: string }> = []
  let matchedNodes: Array<{ id: string; name: string; type: string; description: string }> = []
  let relations: Array<{ sourceName: string; targetName: string; relationType: string }> = []

interface ChunkItem {
  id: string
  content: string
  file_name: string
  category: string
  similarity: number
}

interface TextChunkItem {
  content: string
  brain_documents: {
    file_name: string
    category: string
  } | null
}

interface EdgeItem {
  relation_type: string
  source: { name: string } | null
  target: { name: string } | null
}

  try {
    // 1. Vector Search using pgvector cosine similarity if vector generated successfully
    if (queryVector.length > 0) {
      // We use RPC (Remote Procedure Call) in Supabase or direct raw SQL.
      // Since supabase client doesn't support raw SQL directly, we can define a postgres RPC function.
      // But as a fallback/workaround if the RPC is not loaded, we can run a similarity lookup.
      // Wait, let's call a custom RPC: 'match_brain_chunks'
      // If that RPC is missing, we fall back to keyword search.
      const { data, error } = await supabase.rpc('match_brain_chunks', {
        query_embedding: queryVector,
        match_threshold: 0.2, // Cosine distance similarity threshold
        match_count: limit,
        p_user_id: userId
      })

      if (!error && data) {
        retrievedChunks = (data as ChunkItem[]).map((item) => ({
          content: item.content,
          file_name: item.file_name,
          category: item.category
        }))
      } else {
        // Fallback to text matching if RPC is not defined or errors
        const { data: textData } = await supabase
          .from('brain_chunks')
          .select('content, brain_documents (file_name, category)')
          .eq('user_id', userId)
          .like('content', `%${query.split(' ')[0]}%`)
          .limit(limit)

        if (textData) {
          retrievedChunks = (textData as unknown as TextChunkItem[]).map((item) => ({
            content: item.content,
            file_name: item.brain_documents?.file_name || 'Document',
            category: item.brain_documents?.category || 'study_material'
          }))
        }
      }
    } else {
      // Fallback keyword search if embedding fails
      const { data: textData } = await supabase
        .from('brain_chunks')
        .select('content, brain_documents (file_name, category)')
        .eq('user_id', userId)
        .like('content', `%${query}%`)
        .limit(limit)

      if (textData) {
        retrievedChunks = (textData as unknown as TextChunkItem[]).map((item) => ({
          content: item.content,
          file_name: item.brain_documents?.file_name || 'Document',
          category: item.brain_documents?.category || 'study_material'
        }))
      }
    }
  } catch (err: unknown) {
    console.warn('Academic Brain Vector search lookup skipped (tables or RPC missing):', err)
  }

  try {
    // 2. Identify Knowledge Graph entities matching keywords in query
    const keywords = query.split(/\s+/).filter(w => w.length > 3)
    if (keywords.length > 0) {
      const nodeQuery = supabase
        .from('knowledge_nodes')
        .select('id, name, type, description')
        .eq('user_id', userId)
      
      // Dynamic word match matching any keywords
      const filters = keywords.map(kw => `name.ilike.%${kw}%`).join(',')
      const { data: nodes } = await nodeQuery.or(filters).limit(5)
      
      if (nodes && nodes.length > 0) {
        matchedNodes = nodes
        
        // 3. 1-Hop Graph Edges matching the node IDs
        const nodeIds = nodes.map(n => n.id)
        const { data: edges } = await supabase
          .from('knowledge_edges')
          .select(`
            relation_type,
            source:knowledge_nodes!knowledge_edges_source_node_id_fkey(name),
            target:knowledge_nodes!knowledge_edges_target_node_id_fkey(name)
          `)
          .eq('user_id', userId)
          .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
          .limit(8)

        if (edges) {
          relations = (edges as unknown as EdgeItem[]).map((e) => ({
            sourceName: e.source?.name || 'Unknown',
            targetName: e.target?.name || 'Unknown',
            relationType: e.relation_type
          }))
        }
      }
    }
  } catch (err: unknown) {
    console.warn('Academic Brain Graph search lookup skipped (tables missing):', err)
  }

  // 4. Format RAG Context
  if (retrievedChunks.length === 0 && matchedNodes.length === 0) {
    return {
      contextMarkdown: '',
      hasMemory: false,
      matchedConcepts: []
    }
  }

  let contextMarkdown = '### Academic Memory Context\n'
  contextMarkdown += 'The following information has been retrieved from the student\'s personal Academic Brain storage:\n\n'

  if (retrievedChunks.length > 0) {
    contextMarkdown += '#### Source Study Text Segments:\n'
    retrievedChunks.forEach((c, idx) => {
      contextMarkdown += `**Source [${idx + 1}]:** File: \`${c.file_name}\` (Category: ${c.category})\n`
      contextMarkdown += `> ${c.content.replace(/\n/g, '\n> ')}\n\n`
    })
  }

  if (matchedNodes.length > 0) {
    contextMarkdown += '#### Semantic Knowledge Graph Mapping:\n'
    matchedNodes.forEach(n => {
      contextMarkdown += `- **${n.name}** (${n.type}): ${n.description || 'Concept definition'}\n`
    })
    
    if (relations.length > 0) {
      contextMarkdown += '\n**Key Concept Connections:**\n'
      relations.forEach(r => {
        contextMarkdown += `- Concept \`${r.sourceName}\` is linked via **${r.relationType}** to \`${r.targetName}\`\n`
      })
    }
    contextMarkdown += '\n'
  }

  return {
    contextMarkdown,
    hasMemory: true,
    matchedConcepts: matchedNodes.map(n => n.name)
  }
}

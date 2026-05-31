const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Generates a 768-dimension vector embedding for the given text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
  
  const body = {
    model: "models/text-embedding-004",
    content: {
      parts: [
        { text: text }
      ]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API Error: HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const values = data.embedding?.values;
  
  if (!values || !Array.isArray(values)) {
    throw new Error('Embedding API returned invalid vector values.');
  }

  return values;
}

/**
 * Generates embeddings in batch for an array of texts.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  // Gemini batch embed limits: typically max 100 requests per call
  // We can chunk our requests to make sure we don't violate limits.
  const batchSize = 50;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_API_KEY}`;
    
    const body = {
      requests: chunk.map(text => ({
        model: "models/text-embedding-004",
        content: {
          parts: [{ text }]
        }
      }))
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch Embedding API Error: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const embeddings = data.embeddings;

    if (!embeddings || !Array.isArray(embeddings)) {
      throw new Error('Batch Embedding API returned invalid response.');
    }

    for (const item of embeddings) {
      if (item.values && Array.isArray(item.values)) {
        results.push(item.values);
      } else {
        throw new Error('Batch Embedding API returned empty vector for a chunk.');
      }
    }
  }

  return results;
}

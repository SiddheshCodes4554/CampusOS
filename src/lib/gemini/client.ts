import { createClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  parts: GeminiContentPart[];
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
  generationConfig?: {
    responseMimeType?: string;
    responseSchema?: object;
  };
}

/**
 * Scrubs user queries for potential prompt injection attempts.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  const hijackPhrases = [
    /ignore\s+previous\s+instructions/gi,
    /you\s+must\s+now\s+act\s+as/gi,
    /system\s+override/gi,
    /forget\s+what\s+you/gi,
    /new\s+instruction/gi,
    /disregard\s+the\s+above/gi,
    /ignore\s+all\s+prior/gi,
    /bypass\s+restrictions/gi
  ];
  
  let sanitized = input;
  for (const rx of hijackPhrases) {
    sanitized = sanitized.replace(rx, '[REDACTED INJECTION ATTEMPT]');
  }
  return sanitized;
}

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  responseSchema?: object,
  actionName: string = 'general_ai'
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  // Create Supabase client to check and log rate limits
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      
      // Query the user_api_limits table to see requests within the past 60s
      const { count, error: countError } = await supabase
        .from('user_api_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', oneMinuteAgo)

      if (countError) {
        // Log warning if table is missing, but do not block request (fallback gracefully)
        if (countError.code !== '42P01') {
          console.warn('Rate limit lookup database warning:', countError.message)
        }
      } else if (count && count >= 10) {
        throw new Error('Rate limit exceeded. You are allowed a maximum of 10 AI operations per minute.')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        throw err
      }
      console.warn('Failed to evaluate rate limits, proceeding as fallback:', err)
    }
  }

  // Sanitize user prompt query for security
  const sanitizedPrompt = sanitizeInput(prompt);

  const contents: GeminiContent[] = [
    {
      parts: [{ text: sanitizedPrompt }]
    }
  ];

  const body: GeminiRequestBody = {
    contents,
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseSchema) {
    body.generationConfig = {
      responseMimeType: "application/json",
      responseSchema,
    };
  }

  // Implement automatic retries for transient HTTP errors
  let retries = 3;
  let responseText = '';
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      break; // Success, escape retry loop
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error('Unknown connection issue.');
      retries--;
      if (retries > 0) {
        // Linear backoff delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (lastError && !responseText) {
    throw new Error(`Gemini API connection error: ${lastError.message}`);
  }

  // Successful transaction -> Log into public.user_api_limits
  if (user) {
    try {
      await supabase
        .from('user_api_limits')
        .insert({
          user_id: user.id,
          action: actionName
        })
    } catch (err: unknown) {
      console.error('Failed to log rate limit transaction:', err)
    }
  }

  return responseText;
}

/**
 * Standardized AI Service call for multimodal requests (text + base64 file buffer inputs).
 */
export async function callGeminiMultimodal(
  base64Data: string,
  mimeType: string,
  prompt: string,
  systemInstruction?: string,
  responseSchema?: object,
  actionName: string = 'general_multimodal'
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      const { count, error: countError } = await supabase
        .from('user_api_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', oneMinuteAgo)

      if (countError) {
        if (countError.code !== '42P01') {
          console.warn('Rate limit lookup database warning:', countError.message)
        }
      } else if (count && count >= 10) {
        throw new Error('Rate limit exceeded. You are allowed a maximum of 10 AI operations per minute.')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        throw err
      }
      console.warn('Failed to evaluate rate limits, proceeding as fallback:', err)
    }
  }

  // Sanitize user prompt query for security
  const sanitizedPrompt = sanitizeInput(prompt);

  const contents: GeminiContent[] = [
    {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        { text: sanitizedPrompt }
      ]
    }
  ];

  const body: GeminiRequestBody = {
    contents,
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseSchema) {
    body.generationConfig = {
      responseMimeType: "application/json",
      responseSchema,
    };
  }

  let retries = 3;
  let responseText = '';
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      break;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error('Unknown connection issue.');
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (lastError && !responseText) {
    throw new Error(`Gemini API connection error: ${lastError.message}`);
  }

  if (user) {
    try {
      await supabase
        .from('user_api_limits')
        .insert({
          user_id: user.id,
          action: actionName
        })
    } catch (err: unknown) {
      console.error('Failed to log rate limit transaction:', err)
    }
  }

  return responseText;
}

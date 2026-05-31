const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

interface GeminiContentPart {
  text: string;
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

export async function callGemini(prompt: string, systemInstruction?: string, responseSchema?: object) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const contents: GeminiContent[] = [
    {
      parts: [{ text: prompt }]
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

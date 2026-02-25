import { generateText, generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

function isGlobalAiEnabled(): boolean {
  const raw = process.env.AI_GLOBAL_ENABLED;
  if (!raw) return true;
  const value = raw.toLowerCase();
  if (value === "false" || value === "0" || value === "off" || value === "no") {
    return false;
  }
  return true;
}

export type AiModel = "gemini-text" | "hyperbrowser-agent";

export type AiTextRequest = {
  prompt: string;
  imageUrl?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiTextResponse = {
  text: string;
  model: AiModel;
};

export async function callGeminiText(request: AiTextRequest): Promise<AiTextResponse> {
  if (!isGlobalAiEnabled()) {
    throw new AiUnavailableError("Global AI is disabled");
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError("Google API key is not configured");
  }

  const google = createGoogleGenerativeAI({
    apiKey: apiKey,
  });

  try {
    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: request.prompt },
          ...(request.imageUrl ? [{ type: "image", image: request.imageUrl }] : []),
        ],
      },
    ];

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      messages: messages,
      temperature: request.temperature ?? 0.3,
      maxOutputTokens: request.maxTokens,
    });

    return { text, model: "gemini-text" };
  } catch (error) {
    console.error("Vercel AI SDK error:", error);
    throw error;
  }
}

export async function callHyperbrowserAgent(taskDescription: string): Promise<AiTextResponse> {
  if (!isGlobalAiEnabled()) {
    throw new AiUnavailableError("Global AI is disabled");
  }

  try {
    // 1. Generate search query
    const queryPrompt = `Extract a short, highly effective search engine query (3-6 words) to solve this task: ${taskDescription}. Return ONLY the search query.`;
    const queryRes = await callGeminiText({ prompt: queryPrompt });
    const searchQuery = queryRes.text.replace(/["']/g, '').trim();

    // 2. Scrape DuckDuckGo HTML (Bypasses JS/Bot checks)
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    
    // Strip tags and whitespace to get raw text for Gemini
    const bodyText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') 
                         .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') 
                         .replace(/<[^>]+>/g, ' ') 
                         .replace(/\s+/g, ' ') 
                         .trim() 
                         .substring(0, 15000); 

    // 3. Extract JSON strictly from the text
    const finalPrompt = `
    TASK: ${taskDescription}
    
    Here is the raw text scraped from a search engine for the query "${searchQuery}":
    ---
    ${bodyText}
    ---
    Complete the TASK using ONLY the information provided above. Ensure you follow any formatting (like STRICT JSON) requested in the task. Do not include markdown formatting if strict JSON is requested.
    `;
    
    return await callGeminiText({ prompt: finalPrompt, maxTokens: 2000 });
  } catch (error) {
    console.error("Free Web Agent error:", error);
    throw error;
  }
}

export async function callAiText(request: AiTextRequest): Promise<AiTextResponse> {
  return callGeminiText(request);
}

export async function extractVoterIdData(contentType: string, base64Data: string) {
  if (!isGlobalAiEnabled()) {
    throw new AiUnavailableError("Global AI is disabled");
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError("Google API key is not configured");
  }

  const google = createGoogleGenerativeAI({
    apiKey: apiKey,
  });

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: z.object({
        valid: z.boolean(),
        reason: z.string().optional(),
        epic_no: z.string(),
        name: z.string().optional(),
        age: z.number().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract data from this Indian Voter ID card. If it is not a valid Voter ID, set valid to false and reason. If valid, extract the EPIC number (often labeled as EPIC No. or distinct alphanumeric code like XYZ1234567).",
            },
            {
              type: "image",
              image: `data:${contentType};base64,${base64Data}`,
            },
          ],
        },
      ],
    });

    return object;
  } catch (error) {
    console.error("Vercel AI SDK error (extractVoterIdData):", error);
    throw error;
  }
}

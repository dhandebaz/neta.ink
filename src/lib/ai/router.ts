import { GoogleGenerativeAI } from "@google/generative-ai";
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

export async function callHyperbrowserAgent(prompt: string): Promise<AiTextResponse> {
  if (!isGlobalAiEnabled()) {
    throw new AiUnavailableError("Global AI is disabled");
  }

  console.log("🚀 Firing Free DDG + Gemini Scraper...");

  // 1. Extract State Name for Search 
  const stateMatch = prompt.match(/MLAs for the (.*?) Legislative/i); 
  const stateName = stateMatch ? stateMatch[1].trim() : "Indian"; 
  const searchQuery = `"List of constituencies of the ${stateName} Legislative Assembly" Wikipedia`; 
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`; 

  // 2. Scrape DuckDuckGo (HTML version bypasses JS blocks) 
  let scrapedText = ""; 
  try { 
    const res = await fetch(ddgUrl, { 
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
      } 
    }); 
    const html = await res.text(); 
    // Strip HTML tags and compress whitespace to save LLM tokens 
    scrapedText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 20000); 
  } catch (e) { 
    console.warn("DDG Scrape failed, relying entirely on Gemini internal knowledge."); 
  } 

  // 3. Process with Gemini 
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || ""); 
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

  const finalPrompt = ` 
  ${prompt} 
  
  === SCRAPED WEB CONTEXT === 
  ${scrapedText} 
  =========================== 
  
  If the scraped context doesn't contain the exact data, use your highly trained internal knowledge base to generate the array of politicians. 
  Remember: Output ONLY a valid JSON array. No markdown, no \`\`\`json tags, no explanations. 
  `; 

  const result = await model.generateContent(finalPrompt); 
  let text = result.response.text(); 
  
  // Clean any residual markdown formatting 
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim(); 
  
  return { text, model: "gemini-text" }; 
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

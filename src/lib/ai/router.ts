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

  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError("HYPERBROWSER_API_KEY is not configured");
  }

  try {
    const response = await fetch("https://api.hyperbrowser.ai/v1/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ task: taskDescription }),
    });

    if (!response.ok) {
      throw new Error(`Hyperbrowser API error: ${response.status}`);
    }

    const data = await response.json();
    return { text: data.result || JSON.stringify(data), model: "hyperbrowser-agent" };
  } catch (error) {
    console.error("Hyperbrowser error:", error);
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

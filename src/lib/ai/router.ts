import { GoogleGenerativeAI } from "@google/generative-ai";

export type AiModel = "gemini-text" | "hyperbrowser-agent";

export type AiTextRequest = {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiTextResponse = {
  text: string;
  model: AiModel;
};

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

function isGlobalAiEnabled(): boolean {
  const raw = process.env.AI_GLOBAL_ENABLED;

  if (!raw) {
    return true;
  }

  const value = raw.toLowerCase();

  if (value === "false" || value === "0" || value === "off" || value === "no") {
    return false;
  }

  return true;
}

export async function callGeminiText(request: AiTextRequest): Promise<AiTextResponse> {
  if (!isGlobalAiEnabled()) {
    throw new AiUnavailableError("Global AI is disabled");
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new AiUnavailableError("Gemini API key is not configured");
  }

  const temperature = typeof request.temperature === "number" ? request.temperature : 0.3;
  const maxTokens = typeof request.maxTokens === "number" ? request.maxTokens : 4096;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  });

  const result = await model.generateContent(request.prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return {
    text,
    model: "gemini-text"
  };
}

export async function callHyperbrowserAgent(taskDescription: string): Promise<AiTextResponse> {
  if (!isGlobalAiEnabled()) {
    throw new AiUnavailableError("Global AI is disabled");
  }

  const apiKey = process.env.HYPERBROWSER_API_KEY;

  if (!apiKey) {
    throw new AiUnavailableError("HYPERBROWSER_API_KEY is not configured");
  }

  const response = await fetch("https://api.hyperbrowser.ai/v1/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      task: taskDescription
    })
  });

  if (!response.ok) {
    throw new Error("Hyperbrowser agent request failed");
  }

  const json = (await response.json()) as { result?: string };

  if (!json.result || typeof json.result !== "string") {
    throw new Error("Hyperbrowser agent did not return text result");
  }

  return {
    text: json.result,
    model: "hyperbrowser-agent"
  };
}

export async function callAiText(request: AiTextRequest): Promise<AiTextResponse> {
  return callGeminiText(request);
}

type VoterIdOcrResult =
  | {
      valid: false;
      reason: string;
    }
  | {
      valid: true;
      epic_no: string;
      name: string;
      age_or_dob: string;
      state: string;
    };

export async function extractVoterIdData(
  mimeType: string,
  base64Data: string
): Promise<VoterIdOcrResult> {
  if (!isGlobalAiEnabled()) {
    throw new AiUnavailableError("Global AI is disabled");
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new AiUnavailableError("Gemini API key is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024
    }
  });

  const prompt =
    "You are an expert KYC auditor for India. Analyze this image. " +
    "If it is NOT a valid Indian Voter ID (EPIC card), return JSON: " +
    '{ "valid": false, "reason": "..." }. ' +
    "If it IS valid, extract the details and return strict JSON: " +
    '{ "valid": true, "epic_no": "...", "name": "...", "age_or_dob": "...", "state": "..." }. ' +
    "Do not include markdown fences or any extra text.";

  const result = await model.generateContent([
    {
      text: prompt
    },
    {
      inlineData: {
        mimeType,
        data: base64Data
      }
    }
  ]);

  const response = result.response;
  let text = response.text() ?? "";
  text = text.trim();

  if (!text) {
    throw new Error("Empty response from Gemini vision model");
  }

  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) {
      text = text.slice(firstNewline + 1);
    }
    const lastFence = text.lastIndexOf("```");
    if (lastFence !== -1) {
      text = text.slice(0, lastFence);
    }
    text = text.trim();
  }

  let parsed: any;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Gemini voter ID JSON", { text, error });
    throw new Error("AI response invalid");
  }

  if (!parsed || typeof parsed.valid !== "boolean") {
    throw new Error("AI response missing required fields");
  }

  if (parsed.valid === false) {
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : "The document could not be verified as a valid Indian Voter ID.";
    return { valid: false, reason };
  }

  const epic_no = typeof parsed.epic_no === "string" ? parsed.epic_no.trim() : "";
  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  const age_or_dob =
    typeof parsed.age_or_dob === "string" ? parsed.age_or_dob.trim() : "";
  const state = typeof parsed.state === "string" ? parsed.state.trim() : "";

  if (!epic_no || !name || !age_or_dob || !state) {
    throw new Error("AI response missing voter ID fields");
  }

  return {
    valid: true,
    epic_no,
    name,
    age_or_dob,
    state
  };
}


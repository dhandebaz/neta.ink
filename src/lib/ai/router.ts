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

export async function callGeminiText(request: AiTextRequest): Promise<AiTextResponse> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
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
  const apiKey = process.env.HYPERBROWSER_API_KEY;

  if (!apiKey) {
    throw new Error("HYPERBROWSER_API_KEY is not configured");
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


import { GoogleGenerativeAI } from "@google/generative-ai";
import { Anthropic } from "@anthropic-ai/sdk";

export type AIProvider = "gemini" | "claude";

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return text;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const parts = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter((value) => value.length > 0);

  if (!parts.length) {
    throw new Error("Empty response from Claude");
  }

  return parts.join("\n\n");
}

export async function callAI(
  prompt: string,
  provider: AIProvider = "gemini"
): Promise<string> {
  if (provider === "claude") {
    return callClaude(prompt);
  }

  try {
    return await callGemini(prompt);
  } catch (error) {
    return callClaude(prompt);
  }
}

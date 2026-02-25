import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { politicians } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { callAiText } from "@/lib/ai/router";

type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

type ChatRequestBody = {
  message?: string;
  history?: ChatMessage[];
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user || user.api_limit === 0) {
    return NextResponse.json(
      { error: "Pro account required" },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as ChatRequestBody | null;

  if (!body || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const message = body.message.trim();
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  try {
    const politiciansList = await db
      .select({
        name: politicians.name,
        party: politicians.party,
        position: politicians.position,
        criminal_cases: politicians.criminal_cases,
        assets_worth: politicians.assets_worth,
        rating: politicians.rating
      })
      .from(politicians)
      .orderBy(desc(politicians.rating))
      .limit(50);

    const systemPromptLines: string[] = [];
    systemPromptLines.push(
      "You are Neta Brain, an exclusive AI assistant for Neta.ink Pro developers."
    );
    systemPromptLines.push(
      "Use the following live database extract to answer questions accurately:"
    );
    systemPromptLines.push(JSON.stringify(politiciansList));
    systemPromptLines.push(
      "Keep your answers concise, analytical, and strictly based on the provided data."
    );

    const promptLines: string[] = [];
    promptLines.push("SYSTEM PROMPT:");
    promptLines.push(...systemPromptLines);
    promptLines.push("");
    promptLines.push("CHAT HISTORY:");

    for (const item of history) {
      if (!item || typeof item.content !== "string") {
        continue;
      }
      const role =
        item.role === "ai"
          ? "AI"
          : "User";
      promptLines.push(`${role}: ${item.content}`);
    }

    promptLines.push("");
    promptLines.push("USER MESSAGE:");
    promptLines.push(message);

    const prompt = promptLines.join("\n");

    const aiResponse = await callAiText({
      prompt,
      maxTokens: 1024
    });

    return NextResponse.json({
      success: true,
      text: aiResponse.text
    });
  } catch (error) {
    console.error("Pro chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { callAiText } from "@/lib/ai/router";
import { db } from "@/db/client";
import { system_settings } from "@/db/schema";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user || !user.is_system_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { prompt } = await req.json();

    const systemPrompt = 
      "You are a coding assistant. Return code diffs or a plan based on the user's request. " +
      "Do not execute code, just generate the response.";

    const fullPrompt = `${systemPrompt}\n\nUser Request: ${prompt}`;

    const response = await callAiText({ prompt: fullPrompt });
    
    const key = `vibecode_${Date.now()}`;
    await db.insert(system_settings).values({
      key,
      value: response.text.slice(0, 10000),
      description: `Vibecode execution for: ${prompt.slice(0, 50)}...`
    });

    return NextResponse.json({ result: response.text });
  } catch (error) {
    console.error("Vibecode error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

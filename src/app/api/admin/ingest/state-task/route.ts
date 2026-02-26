import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { states, constituencies, politicians } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { callHyperbrowserAgent } from "@/lib/ai/router";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user || !user.is_system_admin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { stateCode } = body;

  if (!stateCode) {
    return NextResponse.json(
      { success: false, error: "Missing stateCode" },
      { status: 400 }
    );
  }

  const [state] = await db
    .select()
    .from(states)
    .where(eq(states.code, stateCode))
    .limit(1);

  if (!state) {
    return NextResponse.json(
      { success: false, error: "State not found" },
      { status: 404 }
    );
  }

  // Update status to running
  await db
    .update(states)
    .set({ ingestion_status: "running" })
    .where(eq(states.id, state.id));

  try {
    const task = `List all current sitting MLAs (Members of Legislative Assembly) for the Indian state of ${state.name}. Return ONLY a STRICT JSON array of objects. Keys: "name", "party", "constituency". No markdown formatting.`;

    const response = await callHyperbrowserAgent(task);

    // Clean the AI response string (remove ```json tags)
    let cleanedText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Sometimes the model might output text before or after the JSON array, 
    // we should try to extract the array if possible.
    const firstBracket = cleanedText.indexOf("[");
    const lastBracket = cleanedText.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
    }

    const mlaList = JSON.parse(cleanedText);

    if (!Array.isArray(mlaList)) {
      throw new Error("AI response is not an array");
    }

    let count = 0;

    for (const mla of mlaList) {
      if (!mla.name || !mla.constituency) continue;

      // Check if constituency exists
      let [constituency] = await db
        .select()
        .from(constituencies)
        .where(
          and(
            eq(constituencies.name, mla.constituency),
            eq(constituencies.state_id, state.id)
          )
        )
        .limit(1);

      if (!constituency) {
        const [inserted] = await db
          .insert(constituencies)
          .values({
            state_id: state.id,
            type: "assembly",
            name: mla.constituency,
          })
          .returning();
        constituency = inserted;
      }

      // Check if politician already exists
      const [existingPolitician] = await db
        .select()
        .from(politicians)
        .where(
          and(
            eq(politicians.name, mla.name),
            eq(politicians.state_id, state.id)
          )
        )
        .limit(1);

      if (!existingPolitician) {
        // Generate a simple slug
        const slugBase = `${mla.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${mla.party?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "ind"}`;
        // Ensure uniqueness with timestamp if needed, but for now simple slug
        const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-4)}`;

        await db.insert(politicians).values({
          state_id: state.id,
          name: mla.name,
          slug: uniqueSlug,
          position: "MLA",
          party: mla.party || "Independent",
          constituency_id: constituency.id,
        });
        count++;
      }
    }

    await db
      .update(states)
      .set({ ingestion_status: "completed" })
      .where(eq(states.id, state.id));

    return NextResponse.json({ success: true, count });

  } catch (error: any) {
    console.error("Ingestion failed:", error);
    
    await db
      .update(states)
      .set({ ingestion_status: "failed" })
      .where(eq(states.id, state.id));

    return NextResponse.json(
      { success: false, error: error.message || "Ingestion failed" },
      { status: 500 }
    );
  }
}

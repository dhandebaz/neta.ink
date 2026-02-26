import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { runAgenticPoliticianIngestion } from "@/lib/ingest/agent";

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
    .set({ ingestion_status: "ingesting" })
    .where(eq(states.id, state.id));

  try {
    const result = await runAgenticPoliticianIngestion(stateCode);

    await db
      .update(states)
      .set({ ingestion_status: "ready" })
      .where(eq(states.id, state.id));

    return NextResponse.json({ success: true, count: result.count });

  } catch (error: any) {
    console.error("Ingestion failed:", error);
    
    await db
      .update(states)
      .set({ ingestion_status: "error" })
      .where(eq(states.id, state.id));

    return NextResponse.json(
      { success: false, error: error.message || "Ingestion failed" },
      { status: 500 }
    );
  }
}

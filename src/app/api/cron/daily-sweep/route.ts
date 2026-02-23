import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { politicians } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { fetchLivePoliticianUpdates } from "@/lib/ai/hyperTasks";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const oldestPoliticians = await db
      .select()
      .from(politicians)
      .orderBy(asc(politicians.updated_at))
      .limit(5);

    for (const politician of oldestPoliticians) {
      try {
        await fetchLivePoliticianUpdates(politician.id);
      } catch (err) {
        console.error(`Failed to fetch updates for politician ${politician.id}`, err);
      }
      
      await db
        .update(politicians)
        .set({ updated_at: new Date() })
        .where(eq(politicians.id, politician.id));
    }

    return NextResponse.json({ success: true, processed: oldestPoliticians.length });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

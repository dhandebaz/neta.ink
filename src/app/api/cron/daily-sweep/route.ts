import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { politicians } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { fetchLivePoliticianUpdates } from "@/lib/ai/hyperTasks";

// Force Next.js to never cache this API route
export const dynamic = "force-dynamic";
// Extend Vercel Serverless timeout to 5 minutes (300 seconds)
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (
    authHeader !== `Bearer ${expectedSecret}` &&
    querySecret !== expectedSecret
  ) {
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

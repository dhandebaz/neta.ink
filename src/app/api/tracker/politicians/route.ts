import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { and, asc, count, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const stateCode = req.nextUrl.searchParams.get("state")?.toUpperCase() ?? "DL";

  try {
    const [stateRow] = await db
      .select()
      .from(states)
      .where(eq(states.code, stateCode))
      .limit(1);

    if (!stateRow) {
      return NextResponse.json({ success: false, error: "State not found" }, { status: 404 });
    }

    const rows = await db
      .select({
        id: politicians.id,
        name: politicians.name,
        slug: politicians.slug,
        position: politicians.position,
        party: politicians.party,
        photo_url: politicians.photo_url,
        criminal_cases: politicians.criminal_cases,
        assets_worth: politicians.assets_worth,
        liabilities: politicians.liabilities,
        education: politicians.education,
        age: politicians.age,
        rating: politicians.rating,
        votes_up: politicians.votes_up,
        votes_down: politicians.votes_down,
        myneta_url: politicians.myneta_url,
        constituency_name: constituencies.name,
        constituency_type: constituencies.type,
      })
      .from(politicians)
      .leftJoin(constituencies, eq(politicians.constituency_id, constituencies.id))
      .where(eq(politicians.state_id, stateRow.id))
      .orderBy(asc(politicians.name));

    // Compute stats
    const totalPoliticians = rows.length;
    const withCriminalCases = rows.filter((r) => (r.criminal_cases ?? 0) > 0).length;
    const totalCriminalCases = rows.reduce((sum, r) => sum + (r.criminal_cases ?? 0), 0);
    const avgAge = totalPoliticians > 0
      ? Math.round(rows.reduce((sum, r) => sum + (r.age ?? 0), 0) / rows.filter(r => r.age).length)
      : 0;

    // Party breakdown
    const partyMap = new Map<string, number>();
    for (const r of rows) {
      const party = r.party ?? "Independent";
      partyMap.set(party, (partyMap.get(party) ?? 0) + 1);
    }
    const partyBreakdown = Array.from(partyMap.entries())
      .map(([party, count]) => ({ party, count }))
      .sort((a, b) => b.count - a.count);

    // Serialize bigints
    const data = rows.map((r) => ({
      ...r,
      assets_worth: r.assets_worth?.toString() ?? "0",
      liabilities: r.liabilities?.toString() ?? "0",
      rating: Number(r.rating ?? 0),
    }));

    // Get all enabled states for the state selector
    const activeStates = await db
      .select({ code: states.code, name: states.name })
      .from(states)
      .where(eq(states.is_enabled, true));

    return NextResponse.json({
      success: true,
      state: { code: stateRow.code, name: stateRow.name },
      stats: {
        total: totalPoliticians,
        withCriminalCases,
        totalCriminalCases,
        avgAge,
        partyBreakdown,
      },
      availableStates: activeStates,
      data,
    });
  } catch (error) {
    console.error("Tracker API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load tracker data" },
      { status: 500 }
    );
  }
}

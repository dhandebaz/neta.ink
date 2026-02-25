import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRankingsByState } from "@/lib/rankings";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
) {
  const resolvedParams = await params;
  const stateCode = resolvedParams.stateCode.toUpperCase();
  const limitParam = req.nextUrl.searchParams.get("limit");

  let limit = 50;

  if (limitParam) {
    const parsed = Number(limitParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, 200);
    }
  }

  try {
    const [stateRow] = await db
      .select()
      .from(states)
      .where(eq(states.code, stateCode))
      .limit(1);

    if (!stateRow) {
      return NextResponse.json(
        { success: false, error: "State not found" },
        { status: 404 }
      );
    }

    const rows = await getRankingsByState(stateRow.id, limit);

    const data = rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      // Ensure bigints are serialized as strings for JSON
      assets_worth: row.assets_worth.toString()
    }));

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error(`Error fetching rankings for ${stateCode}:`, error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

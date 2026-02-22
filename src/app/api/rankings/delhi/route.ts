import { NextRequest, NextResponse } from "next/server";
import { getDelhiRankings } from "@/lib/rankings";

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");

  let limit = 50;

  if (limitParam) {
    const parsed = Number(limitParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, 200);
    }
  }

  const rows = await getDelhiRankings(limit);

  const data = rows.map((row, index) => ({
    ...row,
    rank: index + 1
  }));

  return NextResponse.json({
    success: true,
    data
  });
}


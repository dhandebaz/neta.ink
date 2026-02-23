import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, politicians } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("q") ?? "";
  const trimmed = search.trim();

  if (trimmed.length < 2) {
    return NextResponse.json({
      success: true,
      data: []
    });
  }

  const rows =
    (await db
      .select({
        id: politicians.id,
        name: politicians.name,
        slug: politicians.slug,
        party: politicians.party,
        position: politicians.position,
        photoUrl: politicians.photo_url,
        rating: politicians.rating,
        criminalCases: politicians.criminal_cases,
        assetsWorth: politicians.assets_worth,
        constituencyName: constituencies.name
      })
      .from(politicians)
      .leftJoin(
        constituencies,
        eq(constituencies.id, politicians.constituency_id)
      )
      .where(
        or(
          ilike(politicians.name, `%${trimmed}%`),
          ilike(politicians.party, `%${trimmed}%`)
        )
      )
      .limit(10)) ?? [];

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    slug: row.slug,
    party: row.party,
    position: row.position,
    photoUrl: row.photoUrl,
    rating: Number(row.rating ?? 0),
    criminalCases: row.criminalCases ?? 0,
    assetsWorth: row.assetsWorth ? row.assetsWorth.toString() : "0",
    constituencyName: row.constituencyName ?? null
  }));

  return NextResponse.json({
    success: true,
    data
  });
}


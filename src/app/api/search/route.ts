import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, politicians } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("q") ?? "";
  const trimmed = search.trim();

  if (trimmed.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const rows =
    (await db
      .select({
        id: politicians.id,
        slug: politicians.slug,
        name: politicians.name,
        party: politicians.party,
        photoUrl: politicians.photo_url,
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
          ilike(politicians.party, `%${trimmed}%`),
          ilike(constituencies.name, `%${trimmed}%`)
        )
      )
      .limit(10)) ?? [];

  const data = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name ?? "",
    party: row.party,
    photoUrl: row.photoUrl,
    constituencyName: row.constituencyName ?? null
  }));

  return NextResponse.json({ success: true, data });
}


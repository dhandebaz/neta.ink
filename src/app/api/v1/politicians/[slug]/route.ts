import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateAndConsumeApiKey } from "@/lib/api/auth";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await validateAndConsumeApiKey(req);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const resolvedParams = await context.params;
  const slug = resolvedParams.slug;

  if (!slug) {
    return NextResponse.json(
      { success: false, error: "Missing politician slug" },
      { status: 400 }
    );
  }

  try {
    const rows = await db
      .select({
        id: politicians.id,
        name: politicians.name,
        slug: politicians.slug,
        position: politicians.position,
        party: politicians.party,
        rating: politicians.rating,
        votes_up: politicians.votes_up,
        votes_down: politicians.votes_down,
        criminal_cases: politicians.criminal_cases,
        assets_worth: politicians.assets_worth,
        liabilities: politicians.liabilities,
        age: politicians.age,
        education: politicians.education,
        state_code: states.code,
        state_name: states.name,
        constituency_name: constituencies.name,
        myneta_url: politicians.myneta_url,
        wikipedia_url: politicians.wikipedia_url,
        photo_url: politicians.photo_url
      })
      .from(politicians)
      .leftJoin(
        constituencies,
        eq(politicians.constituency_id, constituencies.id)
      )
      .innerJoin(states, eq(politicians.state_id, states.id))
      .where(eq(politicians.slug, slug))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Politician not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: row
    });
  } catch (error) {
    console.error("Error loading politician detail API", error);
    return NextResponse.json(
      {
        success: false,
        error: "Politician data is temporarily unavailable"
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { validateAndConsumeApiKey } from "@/lib/api/auth";

export async function GET(req: NextRequest) {
  const auth = await validateAndConsumeApiKey(req);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const stateParam = searchParams.get("state");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  let limit = 50;

  if (limitParam) {
    const parsed = Number(limitParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100);
    }
  }

  let offset = 0;

  if (offsetParam) {
    const parsed = Number(offsetParam);
    if (Number.isFinite(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  const conditions = [];

  if (stateParam) {
    conditions.push(eq(states.code, stateParam));
  }

  try {
    const baseQuery = db
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
        constituency_name: constituencies.name
      })
      .from(politicians)
      .leftJoin(
        constituencies,
        eq(politicians.constituency_id, constituencies.id)
      )
      .innerJoin(states, eq(politicians.state_id, states.id));

    const whereCondition =
      conditions.length === 0 ? undefined : and(...conditions);

    const [totalRow] = await db
      .select({ value: count() })
      .from(politicians)
      .innerJoin(states, eq(politicians.state_id, states.id))
      .where(whereCondition as any)
      .limit(1);

    const total = totalRow?.value ?? 0;

    const rows = await baseQuery
      .where(whereCondition as any)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      meta: {
        total,
        limit,
        offset
      },
      data: rows
    });
  } catch (error) {
    console.error("Error loading politicians API list", error);
    return NextResponse.json(
      {
        success: false,
        error: "Politician data is temporarily unavailable"
      },
      { status: 500 }
    );
  }
}


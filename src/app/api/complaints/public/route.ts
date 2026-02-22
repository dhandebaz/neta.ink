import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { complaints, politicians, states } from "@/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const beforeParam = searchParams.get("before");

  const [delhi] = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  if (!delhi) {
    return NextResponse.json(
      { success: false, error: "Delhi state not configured", data: [] },
      { status: 500 }
    );
  }

  const pageSize = 20;

  const conditions = [
    eq(complaints.state_id, delhi.id),
    eq(complaints.is_public, true)
  ];

  if (beforeParam) {
    const before = new Date(beforeParam);
    if (!Number.isNaN(before.getTime())) {
      conditions.push(lt(complaints.created_at, before));
    }
  }

  const rows = await db
    .select({
      id: complaints.id,
      title: complaints.title,
      photo_url: complaints.photo_url,
      location_text: complaints.location_text,
      status: complaints.status,
      severity: complaints.severity,
      created_at: complaints.created_at,
      politician_id: complaints.politician_id,
      politician_name: politicians.name
    })
    .from(complaints)
    .leftJoin(politicians, eq(complaints.politician_id, politicians.id))
    .where(and(...conditions))
    .orderBy(desc(complaints.created_at))
    .limit(pageSize);

  return NextResponse.json({
    success: true,
    data: rows
  });
}

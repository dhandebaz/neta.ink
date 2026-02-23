import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, states, users, volunteers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!currentUser.voter_id_verified) {
    return NextResponse.json(
      { success: false, error: "You must verify your Voter ID to become a volunteer." },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        constituency_id?: number | null;
      }
    | null;

  const rawConstituencyId = body?.constituency_id;
  const constituencyId =
    typeof rawConstituencyId === "number" && Number.isFinite(rawConstituencyId)
      ? rawConstituencyId
      : null;

  if (constituencyId !== null) {
    const [existingConstituency] = await db
      .select({ id: constituencies.id })
      .from(constituencies)
      .where(eq(constituencies.id, constituencyId))
      .limit(1);

    if (!existingConstituency) {
      return NextResponse.json(
        { success: false, error: "Invalid constituency_id" },
        { status: 400 }
      );
    }
  }

  const [stateRow] = await db
    .select({ id: states.id })
    .from(states)
    .where(eq(states.code, currentUser.state_code))
    .limit(1);

  if (!stateRow) {
    return NextResponse.json(
      { success: false, error: "State not found for current user" },
      { status: 400 }
    );
  }

  const [existingVolunteer] = await db
    .select()
    .from(volunteers)
    .where(eq(volunteers.user_id, currentUser.id))
    .limit(1);

  if (existingVolunteer) {
    return NextResponse.json({ success: true });
  }

  await db.insert(volunteers).values({
    user_id: currentUser.id,
    state_id: stateRow.id,
    constituency_id: constituencyId
  });

  return NextResponse.json({ success: true });
}


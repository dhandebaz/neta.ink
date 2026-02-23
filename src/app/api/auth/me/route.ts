import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { states, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        user: null
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      phone_number: user.phone_number,
      state_code: user.state_code,
      is_system_admin: user.is_system_admin
    }
  });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        stateCode?: string;
      }
    | null;

  const rawCode = body?.stateCode;
  const trimmed = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";

  if (!trimmed || trimmed.length !== 2) {
    return NextResponse.json(
      { success: false, error: "stateCode must be a 2-letter code" },
      { status: 400 }
    );
  }

  const [stateRow] = await db
    .select()
    .from(states)
    .where(eq(states.code, trimmed))
    .limit(1);

  if (!stateRow) {
    return NextResponse.json(
      { success: false, error: "Unknown state code" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(users)
    .set({ state_code: trimmed })
    .where(eq(users.id, currentUser.id))
    .returning();

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      name: updated.name,
      phone_number: updated.phone_number,
      state_code: updated.state_code,
      is_system_admin: updated.is_system_admin
    }
  });
}

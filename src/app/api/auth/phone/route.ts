import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { setUserSession } from "@/lib/auth/session";

type Body = {
  firebaseUid: string;
  phoneNumber: string;
  displayName?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const firebaseUid = body.firebaseUid?.trim();
  const phoneNumber = body.phoneNumber?.trim();
  const displayName = body.displayName?.trim();

  if (!firebaseUid || !phoneNumber) {
    return NextResponse.json(
      { success: false, error: "firebaseUid and phoneNumber are required" },
      { status: 400 }
    );
  }

  const rows = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.firebase_uid, firebaseUid),
        eq(users.phone_number, phoneNumber)
      )
    )
    .limit(1);

  const existing = rows[0] ?? null;
  let user;

  if (existing) {
    const updatedName = existing.name ?? displayName ?? null;

    const [updated] = await db
      .update(users)
      .set({
        firebase_uid: firebaseUid,
        phone_number: phoneNumber,
        name: updatedName ?? undefined
      })
      .where(eq(users.id, existing.id))
      .returning();

    user = updated;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        firebase_uid: firebaseUid,
        phone_number: phoneNumber,
        name: displayName ?? null,
        state_code: "DL"
      })
      .returning();

    user = created;
  }

  const res = NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      state_code: user.state_code,
      is_system_admin: user.is_system_admin
    }
  });

  setUserSession(res, user.id);

  return res;
}

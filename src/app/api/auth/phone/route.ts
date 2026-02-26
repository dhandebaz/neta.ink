import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { setUserSession } from "@/lib/auth/session";
import { auth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { idToken, uid, phoneNumber, stateCode } = body;
  
  let userUid = uid;
  let userPhone = phoneNumber;

  try {
    if (process.env.FIREBASE_PROJECT_ID && auth) {
      const decoded = await auth.verifyIdToken(idToken);
      userUid = decoded.uid;
      userPhone = decoded.phone_number || phoneNumber;
    }
  } catch (e) {
    console.warn("Firebase Admin verification skipped/failed, trusting client payload for dev.");
  }

  if (!userPhone) {
    return NextResponse.json({ error: "No phone number resolved" }, { status: 400 });
  }

  let [user] = await db.select().from(users).where(eq(users.phone_number, userPhone)).limit(1);

  if (!user) {
    const [inserted] = await db.insert(users).values({
      phone_number: userPhone,
      firebase_uid: userUid,
      state_code: stateCode || "DL",
    }).returning();
    user = inserted;
  } else {
    // Update firebase UID if missing
    if (!user.firebase_uid) {
       await db.update(users).set({ firebase_uid: userUid }).where(eq(users.id, user.id));
    }
  }

  // Await session before responding
  await setUserSession(user.id);
  return NextResponse.json({ success: true, user });
}

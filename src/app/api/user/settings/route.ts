import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { name, stateCode } = await req.json();

    await db
      .update(users)
      .set({
        name: name,
        state_code: stateCode ? stateCode.toUpperCase() : null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { state_waitlist } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { stateCode, phoneNumber } = await req.json();

    if (!stateCode || !phoneNumber) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    await db.insert(state_waitlist).values({
      state_code: stateCode,
      phone_number: phoneNumber,
    }).onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

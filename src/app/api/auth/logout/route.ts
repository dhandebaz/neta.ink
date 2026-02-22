import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearUserSession(res);
  return res;
}

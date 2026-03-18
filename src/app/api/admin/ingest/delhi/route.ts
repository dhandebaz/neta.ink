import { NextRequest, NextResponse } from "next/server";
import { runDelhiIngestion } from "@/lib/ingest/delhi";
import { ensureDelhiState } from "@/lib/states";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.is_system_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await runDelhiIngestion();
  const delhi = await ensureDelhiState();

  return NextResponse.json({ success: true, state: delhi });
}

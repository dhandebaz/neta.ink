import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setAiComplaintsEnabled, setAiRtiEnabled } from "@/lib/ai/flags";

type Body = {
  key: "ai_rti_enabled_global" | "ai_complaints_enabled_global";
  enabled: boolean;
};

export async function POST(req: NextRequest) {
  const adminIdHeader = req.headers.get("x-admin-user-id");

  if (!adminIdHeader) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const adminId = Number(adminIdHeader);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid admin id" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!user || !user.is_system_admin) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body || typeof body.key !== "string" || typeof body.enabled !== "boolean") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  if (body.key === "ai_rti_enabled_global") {
    await setAiRtiEnabled(body.enabled);
  } else if (body.key === "ai_complaints_enabled_global") {
    await setAiComplaintsEnabled(body.enabled);
  } else {
    return NextResponse.json({ success: false, error: "Unsupported key" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      key: body.key,
      enabled: body.enabled
    }
  });
}


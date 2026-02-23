import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedMaharashtraCore } from "@/lib/seed/maharashtraCore";

export async function POST(req: NextRequest) {
  const adminIdHeader = req.headers.get("x-admin-user-id");
  if (!adminIdHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = Number(adminIdHeader);
  if (Number.isNaN(adminId)) {
    return NextResponse.json({ error: "Invalid admin id" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  const user = rows[0];

  if (!user || !user.is_system_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await seedMaharashtraCore();

  return NextResponse.json({ success: true });
}


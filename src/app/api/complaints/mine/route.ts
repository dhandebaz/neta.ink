import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { complaints } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required", data: [] },
      { status: 401 }
    );
  }

  const userId = currentUser.id;

  const rows = await db
    .select({
      id: complaints.id,
      title: complaints.title,
      photo_url: complaints.photo_url,
      location_text: complaints.location_text,
      status: complaints.status,
      severity: complaints.severity,
      created_at: complaints.created_at,
      politician_id: complaints.politician_id,
      description: complaints.description,
      department_name: complaints.department_name
    })
    .from(complaints)
    .where(eq(complaints.user_id, userId))
    .orderBy(desc(complaints.created_at))
    .limit(50);

  return NextResponse.json({
    success: true,
    data: rows
  });
}

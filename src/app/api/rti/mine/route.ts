import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rti_requests } from "@/db/schema";
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
      id: rti_requests.id,
      question: rti_requests.question,
      status: rti_requests.status,
      created_at: rti_requests.created_at,
      portal_url: rti_requests.portal_url,
      pio_name: rti_requests.pio_name,
      rti_text: rti_requests.rti_text,
      pio_address: rti_requests.pio_address
    })
    .from(rti_requests)
    .where(eq(rti_requests.user_id, userId))
    .orderBy(desc(rti_requests.created_at))
    .limit(50);

  return NextResponse.json({
    success: true,
    data: rows
  });
}

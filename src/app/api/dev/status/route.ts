import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { complaints, rti_requests, system_settings } from "@/db/schema";
import { and, count, eq, inArray } from "drizzle-orm";

const FLAG_KEYS = [
  "complaints_enabled_global",
  "complaints_enabled_DL",
  "rti_enabled_global",
  "rti_enabled_DL",
  "rankings_enabled_global"
];

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const [complaintsCountRow, rtiCountRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(complaints),
    db
      .select({ value: count() })
      .from(rti_requests)
  ]);

  const settingsRows = await db
    .select({
      key: system_settings.key,
      value: system_settings.value
    })
    .from(system_settings)
    .where(and(inArray(system_settings.key, FLAG_KEYS)));

  const flags: Record<string, string | null> = {};

  for (const key of FLAG_KEYS) {
    const row = settingsRows.find((r) => r.key === key) ?? null;
    flags[key] = row ? row.value : null;
  }

  return NextResponse.json({
    success: true,
    data: {
      stateCodeDefault: "DL",
      flags,
      counts: {
        complaints: complaintsCountRow[0]?.value ?? 0,
        rtiRequests: rtiCountRow[0]?.value ?? 0
      }
    }
  });
}


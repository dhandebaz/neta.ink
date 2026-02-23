import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { state_settings, states, users } from "@/db/schema";

const ALLOWED_BASE_KEYS = [
  "complaints_enabled",
  "rti_enabled",
  "ai_complaints_enabled",
  "ai_rti_enabled"
] as const;

type BaseKey = (typeof ALLOWED_BASE_KEYS)[number];

type GetParams = {
  stateCode?: string;
};

type PostBody = {
  stateCode?: string;
  baseKey?: BaseKey;
  enabled?: boolean;
};

async function requireAdmin(req: NextRequest) {
  const adminIdHeader = req.headers.get("x-admin-user-id");

  if (!adminIdHeader) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const adminId = Number(adminIdHeader);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return {
      error: NextResponse.json({ success: false, error: "Invalid admin id" }, { status: 400 })
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!user || !user.is_system_admin) {
    return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }

  return { adminId };
}

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin(req);

  if ("error" in adminCheck) {
    return adminCheck.error;
  }

  const url = new URL(req.url);
  const stateCodeParam = url.searchParams.get("stateCode");

  if (!stateCodeParam) {
    return NextResponse.json({ success: false, error: "Missing stateCode" }, { status: 400 });
  }

  const code = stateCodeParam.toUpperCase().trim();

  const [stateRow] = await db
    .select()
    .from(states)
    .where(eq(states.code, code))
    .limit(1);

  if (!stateRow) {
    return NextResponse.json({ success: false, error: "State not found" }, { status: 404 });
  }

  const settingRows = await db
    .select()
    .from(state_settings)
    .where(eq(state_settings.state_code, code));

  const flags: Record<BaseKey, boolean | null> = {
    complaints_enabled: null,
    rti_enabled: null,
    ai_complaints_enabled: null,
    ai_rti_enabled: null
  };

  for (const baseKey of ALLOWED_BASE_KEYS) {
    const keyWithCode = `${baseKey}_${code}`;
    const row = settingRows.find((s) => s.key === keyWithCode);

    if (!row) continue;

    const raw = row.value.toLowerCase();
    if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
      flags[baseKey] = true;
    } else if (raw === "false" || raw === "0" || raw === "no" || raw === "off") {
      flags[baseKey] = false;
    }
  }

  return NextResponse.json({
    success: true,
    state: {
      code: stateRow.code,
      name: stateRow.name
    },
    flags
  });
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req);

  if ("error" in adminCheck) {
    return adminCheck.error;
  }

  const body = (await req.json().catch(() => null)) as PostBody | null;

  if (
    !body ||
    typeof body.stateCode !== "string" ||
    typeof body.baseKey !== "string" ||
    typeof body.enabled !== "boolean"
  ) {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  const code = body.stateCode.toUpperCase().trim();

  if (!ALLOWED_BASE_KEYS.includes(body.baseKey)) {
    return NextResponse.json({ success: false, error: "Unsupported flag key" }, { status: 400 });
  }

  const [stateRow] = await db
    .select()
    .from(states)
    .where(eq(states.code, code))
    .limit(1);

  if (!stateRow) {
    return NextResponse.json({ success: false, error: "State not found" }, { status: 404 });
  }

  const baseKey: BaseKey = body.baseKey;
  const keyWithCode = `${baseKey}_${code}`;
  const value = body.enabled ? "true" : "false";

  const existingRows = await db
    .select()
    .from(state_settings)
    .where(and(eq(state_settings.state_code, code), eq(state_settings.key, keyWithCode)))
    .limit(1);

  if (existingRows.length === 0) {
    await db.insert(state_settings).values({
      state_code: code,
      key: keyWithCode,
      value,
      description: null
    });
  } else {
    await db
      .update(state_settings)
      .set({
        value
      })
      .where(eq(state_settings.id, existingRows[0].id));
  }

  return NextResponse.json({
    success: true,
    data: {
      stateCode: code,
      baseKey,
      enabled: body.enabled
    }
  });
}


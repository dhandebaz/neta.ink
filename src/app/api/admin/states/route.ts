import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { states, users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin(req: NextRequest) {
  const adminIdHeader = req.headers.get("x-admin-user-id");

  if (!adminIdHeader) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const adminId = Number(adminIdHeader);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return { error: NextResponse.json({ error: "Invalid admin id" }, { status: 400 }) };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!user || !user.is_system_admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { adminId };
}

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin(req);

  if ("error" in adminCheck) {
    return adminCheck.error;
  }

  const rows = await db.select().from(states);

  return NextResponse.json({
    success: true,
    states: rows
  });
}

type AddBody = {
  action: "add";
  stateCode?: string;
  stateName?: string;
  primaryCityLabel?: string | null;
};

type ToggleBody = {
  action: "toggle";
  stateCode?: string;
  isEnabled?: boolean;
};

type Body = AddBody | ToggleBody;

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req);

  if ("error" in adminCheck) {
    return adminCheck.error;
  }

  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "add") {
    if (typeof body.stateCode !== "string" || typeof body.stateName !== "string") {
      return NextResponse.json({ error: "Missing stateCode or stateName" }, { status: 400 });
    }

    const code = body.stateCode.toUpperCase().trim();
    const name = body.stateName.trim();
    const primaryCityLabel =
      typeof body.primaryCityLabel === "string" && body.primaryCityLabel.trim().length > 0
        ? body.primaryCityLabel.trim()
        : null;

    if (!code || code.length !== 2 || !name) {
      return NextResponse.json({ error: "Invalid stateCode or stateName" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(states)
      .where(eq(states.code, code))
      .limit(1);

    if (!existing) {
      const [inserted] = await db
        .insert(states)
        .values({
          code,
          name,
          primary_city_label: primaryCityLabel,
          is_enabled: false,
          ingestion_status: "idle"
        })
        .returning();

      return NextResponse.json({
        success: true,
        state: inserted
      });
    }

    const [updated] = await db
      .update(states)
      .set({
        name,
        primary_city_label: primaryCityLabel
      })
      .where(eq(states.id, existing.id))
      .returning();

    return NextResponse.json({
      success: true,
      state: updated
    });
  }

  if (body.action === "toggle") {
    if (typeof body.stateCode !== "string" || typeof body.isEnabled !== "boolean") {
      return NextResponse.json({ error: "Missing stateCode or isEnabled" }, { status: 400 });
    }

    const code = body.stateCode.toUpperCase().trim();

    const [existing] = await db
      .select()
      .from(states)
      .where(eq(states.code, code))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(states)
      .set({ is_enabled: body.isEnabled })
      .where(eq(states.id, existing.id))
      .returning();

    return NextResponse.json({
      success: true,
      state: updated
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}


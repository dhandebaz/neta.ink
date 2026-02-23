import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { state_ingestion_tasks, states, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { runAgenticPoliticianIngestion } from "@/lib/ingest/agent";

type TaskType = "politicians";

type PostBody = {
  stateCode?: string;
  taskType?: TaskType;
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

  const [user] =
    (await db
      .select()
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1)) ?? [];

  if (!user || !user.is_system_admin) {
    return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }

  return { adminId };
}

async function ensureState(code: string) {
  const normalized = code.toUpperCase().trim();

  const [state] =
    (await db
      .select()
      .from(states)
      .where(eq(states.code, normalized))
      .limit(1)) ?? [];

  if (!state) {
    return { state: null, code: normalized };
  }

  return { state, code: normalized };
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req);

  if ("error" in adminCheck) {
    return adminCheck.error;
  }

  const body = (await req.json().catch(() => null)) as PostBody | null;

  if (!body || typeof body.stateCode !== "string" || typeof body.taskType !== "string") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  if (body.taskType !== "politicians") {
    return NextResponse.json({ success: false, error: "Unsupported taskType" }, { status: 400 });
  }

  const { state, code } = await ensureState(body.stateCode);

  if (!state) {
    return NextResponse.json({ success: false, error: "State not found" }, { status: 404 });
  }

  const taskType: TaskType = "politicians";

  const existing =
    (await db
      .select({ id: state_ingestion_tasks.id })
      .from(state_ingestion_tasks)
      .where(
        and(
          eq(state_ingestion_tasks.state_code, code),
          eq(state_ingestion_tasks.task_type, taskType)
        )
      )
      .limit(1)) ?? [];

  let taskId: number;

  if (existing.length === 0) {
    const inserted = await db
      .insert(state_ingestion_tasks)
      .values({
        state_code: code,
        task_type: taskType,
        status: "running",
        last_error: null
      })
      .returning({ id: state_ingestion_tasks.id });

    taskId = inserted[0].id;
  } else {
    taskId = existing[0].id;

    await db
      .update(state_ingestion_tasks)
      .set({
        status: "running",
        last_error: null
      })
      .where(eq(state_ingestion_tasks.id, taskId));
  }

  await db
    .update(states)
    .set({ ingestion_status: "ingesting" })
    .where(eq(states.id, state.id));

  let errorMessage: string | null = null;
  let count = 0;

  try {
    const result = await runAgenticPoliticianIngestion(code);
    count = result.count;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while running agent ingestion task";
    errorMessage = message;
    console.error("Agentic politician ingestion failed", error);
  }

  if (errorMessage) {
    await db
      .update(state_ingestion_tasks)
      .set({
        status: "error",
        last_error: errorMessage
      })
      .where(eq(state_ingestion_tasks.id, taskId));
  } else {
    await db
      .update(state_ingestion_tasks)
      .set({
        status: "success",
        last_error: null
      })
      .where(eq(state_ingestion_tasks.id, taskId));
  }

  const taskStatusRows =
    (await db
      .select({ status: state_ingestion_tasks.status })
      .from(state_ingestion_tasks)
      .where(eq(state_ingestion_tasks.state_code, code))) ?? [];

  let nextIngestionStatus = "idle";

  if (taskStatusRows.some((row) => row.status === "error")) {
    nextIngestionStatus = "error";
  } else if (taskStatusRows.every((row) => row.status === "success")) {
    nextIngestionStatus = "ready";
  } else if (taskStatusRows.some((row) => row.status === "running")) {
    nextIngestionStatus = "ingesting";
  }

  await db
    .update(states)
    .set({ ingestion_status: nextIngestionStatus })
    .where(eq(states.id, state.id));

  const [task] =
    (await db
      .select()
      .from(state_ingestion_tasks)
      .where(eq(state_ingestion_tasks.id, taskId))
      .limit(1)) ?? [];

  if (!task) {
    return NextResponse.json(
      { success: false, error: "Task not found after ingestion" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: !errorMessage,
    stateCode: code,
    count,
    task
  });
}


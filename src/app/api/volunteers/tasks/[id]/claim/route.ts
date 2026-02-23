import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { civic_tasks, volunteers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const [volunteer] = await db
    .select()
    .from(volunteers)
    .where(eq(volunteers.user_id, currentUser.id))
    .limit(1);

  if (!volunteer) {
    return NextResponse.json(
      { success: false, error: "Volunteer profile not found" },
      { status: 403 }
    );
  }

  const resolvedParams = await context.params;
  const rawId = resolvedParams.id;
  const taskId = Number(rawId);

  if (!Number.isFinite(taskId) || taskId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid task id" },
      { status: 400 }
    );
  }

  const [task] = await db
    .select()
    .from(civic_tasks)
    .where(eq(civic_tasks.id, taskId))
    .limit(1);

  if (!task) {
    return NextResponse.json(
      { success: false, error: "Task not found" },
      { status: 404 }
    );
  }

  if (task.status !== "open") {
    return NextResponse.json(
      { success: false, error: "Task is not open for claiming" },
      { status: 400 }
    );
  }

  await db
    .update(civic_tasks)
    .set({
      assigned_to: volunteer.id,
      status: "in_progress"
    })
    .where(and(eq(civic_tasks.id, taskId), eq(civic_tasks.status, "open")));

  return NextResponse.json({ success: true });
}


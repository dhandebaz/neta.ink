import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  complaints,
  payments,
  states,
  usage_events,
  users
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createOrder } from "@/lib/razorpay";
import { getUserKey, rateLimit } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/auth/session";

type CreateComplaintBody = {
  photoUrl: string;
  locationText: string;
  title: string;
  description: string;
  departmentName: string;
  severity: string;
  politicianId?: number;
};

const COMPLAINT_CREATE_ENDPOINT = "/api/complaints/create";
const COMPLAINT_CREATE_TASK_TYPE = "complaint_create";

async function logUsage(options: {
  userId?: number;
  stateCode?: string;
  success: boolean;
  statusCode: number;
  errorCode?: string;
}) {
  const userIdValue =
    typeof options.userId === "number" && Number.isFinite(options.userId)
      ? options.userId
      : null;

  await db.insert(usage_events).values({
    user_id: userIdValue,
    task_type: COMPLAINT_CREATE_TASK_TYPE,
    state_code: options.stateCode ?? null,
    endpoint: COMPLAINT_CREATE_ENDPOINT,
    success: options.success,
    status_code: options.statusCode,
    error_code: options.errorCode ?? null
  });
}

async function sendComplaintEmail(
  subject: string,
  description: string,
  locationText: string,
  userId: number
) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to =
    process.env.COMPLAINTS_FALLBACK_EMAIL && process.env.COMPLAINTS_FALLBACK_EMAIL.length > 0
      ? process.env.COMPLAINTS_FALLBACK_EMAIL
      : user;

  if (!host || !port || !user || !pass || !to) {
    console.warn("SMTP not fully configured; skipping complaint email send");
    return;
  }

  const body = [
    description,
    "",
    `Location: ${locationText}`,
    `User ID: ${userId}`
  ].join("\n");

  console.log("Complaint email would be sent", {
    to,
    subject,
    body
  });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required", data: null },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as CreateComplaintBody | null;

  if (!body) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", data: null },
      { status: 400 }
    );
  }

  const { photoUrl, locationText, title, description, departmentName, severity, politicianId } =
    body;

  const trimmedPhotoUrl = typeof photoUrl === "string" ? photoUrl.trim() : "";
  const trimmedLocation = typeof locationText === "string" ? locationText.trim() : "";
  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  const trimmedDescription = typeof description === "string" ? description.trim() : "";
  const trimmedDepartment = typeof departmentName === "string" ? departmentName.trim() : "";

  if (!trimmedPhotoUrl || !trimmedLocation || !trimmedTitle || !trimmedDescription || !trimmedDepartment) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Photo, location, title, department, and description are required to file a complaint.",
        data: null
      },
      { status: 400 }
    );
  }

  const userId = currentUser.id;

  const userKey = getUserKey(userId, "complaints_create");
  const userLimit = await rateLimit(userKey, 10, 86400);

  if (!userLimit.allowed) {
    await logUsage({
      userId,
      success: false,
      statusCode: 429,
      errorCode: "RATE_LIMIT_USER"
    });

    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        data: null
      },
      { status: 429 }
    );
  }

  const user = currentUser;

  if (user.state_code !== "DL") {
    return NextResponse.json(
      { success: false, error: "Only Delhi users can file complaints", data: null },
      { status: 400 }
    );
  }

  const [delhiState] = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  if (!delhiState) {
    return NextResponse.json(
      { success: false, error: "Delhi state not configured", data: null },
      { status: 500 }
    );
  }

  let order;

  try {
    order = await createOrder(1100, {
      task_type: "complaint_filing",
      user_id: String(userId)
    });
  } catch (error) {
    console.error("Error creating Razorpay order", error);
    return NextResponse.json(
      { success: false, error: "Payment order creation failed", data: null },
      { status: 502 }
    );
  }

  const orderId = order.id as string;

  const [payment] = await db
    .insert(payments)
    .values({
      user_id: userId,
      payment_type: "task_single",
      task_type: "complaint_filing",
      amount: 1100,
      razorpay_order_id: orderId,
      status: "pending"
    })
    .returning();

  const normalizedSeverity =
    severity === "low" || severity === "high" || severity === "medium"
      ? severity
      : "medium";

  const departmentEmail =
    process.env.COMPLAINTS_FALLBACK_EMAIL && process.env.COMPLAINTS_FALLBACK_EMAIL.length > 0
      ? process.env.COMPLAINTS_FALLBACK_EMAIL
      : "";

  const [complaint] = await db
    .insert(complaints)
    .values({
      user_id: userId,
      state_id: delhiState.id,
      politician_id:
        typeof politicianId === "number" && Number.isFinite(politicianId) && politicianId > 0
          ? politicianId
          : null,
      title: trimmedTitle,
      description: trimmedDescription,
      photo_url: trimmedPhotoUrl,
      location_text: trimmedLocation,
      department_name: trimmedDepartment,
      department_email: departmentEmail,
      severity: normalizedSeverity,
      status: "pending",
      is_public: true,
      email_thread_id: orderId
    })
    .returning();

  try {
    await sendComplaintEmail(title, description, locationText, userId);
  } catch (error) {
    console.warn("Failed to send complaint email", error);
  }

  await logUsage({
    userId,
    stateCode: user.state_code,
    success: true,
    statusCode: 200
  });

  return NextResponse.json({
    success: true,
    data: {
      complaint_id: complaint.id,
      payment_id: payment.id,
      razorpay_order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    }
  });
}

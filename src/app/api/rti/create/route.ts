import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { payments, rti_requests, states, usage_events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createOrder } from "@/lib/razorpay";
import { getUserKey, rateLimit } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/auth/session";

type CreateBody = {
  politicianId?: number;
  question: string;
  rtiText?: string;
  manual_rti_text?: string;
  pioName?: string;
  pioAddress?: string;
};

const RTI_CREATE_ENDPOINT = "/api/rti/create";
const RTI_CREATE_TASK_TYPE = "rti_create";

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
    task_type: RTI_CREATE_TASK_TYPE,
    state_code: options.stateCode ?? null,
    endpoint: RTI_CREATE_ENDPOINT,
    success: options.success,
    status_code: options.statusCode,
    error_code: options.errorCode ?? null
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

  const body = (await req.json().catch(() => null)) as CreateBody | null;

  if (!body || typeof body.question !== "string") {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", data: null },
      { status: 400 }
    );
  }

  const { politicianId, question, rtiText, manual_rti_text, pioName, pioAddress } = body;

  const trimmedQuestion = question.trim();
  const rtiDraftText = typeof rtiText === "string" ? rtiText.trim() : "";
  const manualText = typeof manual_rti_text === "string" ? manual_rti_text.trim() : "";
  const finalRtiText = rtiDraftText || manualText;

  if (!trimmedQuestion || !finalRtiText) {
    return NextResponse.json(
      {
        success: false,
        error:
          "RTI question and text are required. Write the RTI body manually if drafting helper is unavailable.",
        data: null
      },
      { status: 400 }
    );
  }

  const userId = currentUser.id;
  const stateCode = currentUser.state_code;

  const userKey = getUserKey(userId, "rti_create");
  const userLimit = await rateLimit(userKey, 10, 86400);

  if (!userLimit.allowed) {
    await logUsage({
      userId,
      stateCode,
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

  if (stateCode !== "DL") {
    return NextResponse.json(
      { success: false, error: "RTI drafting is only enabled for Delhi (DL)", data: null },
      { status: 400 }
    );
  }

  const [state] = await db
    .select()
    .from(states)
    .where(eq(states.code, stateCode))
    .limit(1);

  if (!state) {
    return NextResponse.json(
      { success: false, error: "State not configured", data: null },
      { status: 500 }
    );
  }

  let order;

  try {
    order = await createOrder(1100, {
      task_type: "rti_drafting",
      user_id: String(userId)
    });
  } catch (error) {
    console.error("Error creating Razorpay order for RTI", error);
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
      task_type: "rti_drafting",
      amount: 1100,
      razorpay_order_id: orderId,
      status: "pending"
    })
    .returning();

  const [rti] = await db
    .insert(rti_requests)
    .values({
      user_id: userId,
      state_id: state.id,
      politician_id: politicianId ?? null,
      question: trimmedQuestion,
      rti_text: finalRtiText,
      portal_url: "https://rtionline.gov.in",
      pio_name: pioName ?? null,
      pio_address: pioAddress ?? null,
      status: "draft"
    })
    .returning();

  await logUsage({
    userId,
    stateCode,
    success: true,
    statusCode: 200
  });

  return NextResponse.json({
    success: true,
    data: {
      rti_request_id: rti.id,
      payment_id: payment.id,
      razorpay_order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    }
  });
}

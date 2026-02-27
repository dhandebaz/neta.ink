import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { complaints, payments, rti_requests, users } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { fulfillComplaint } from "@/lib/fulfillment/complaint";
import { fulfillRti } from "@/lib/fulfillment/rti";
import crypto from "crypto";

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as VerifyBody | null;

  if (
    !body ||
    typeof body.razorpay_order_id !== "string" ||
    typeof body.razorpay_payment_id !== "string" ||
    typeof body.razorpay_signature !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const razorpayOrderId = body.razorpay_order_id.trim();
  const razorpayPaymentId = body.razorpay_payment_id.trim();
  const razorpaySignature = body.razorpay_signature.trim();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json(
      { error: "Missing payment verification fields" },
      { status: 400 }
    );
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.razorpay_order_id, razorpayOrderId))
    .limit(1);

  if (!payment) {
    return NextResponse.json(
      { error: "Payment not found" },
      { status: 404 }
    );
  }

  if (payment.user_id !== currentUser.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  if (payment.status === "success") {
    return NextResponse.json({
      success: true,
      message: "Payment verified successfully"
    });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Payment verification is not configured" },
      { status: 500 }
    );
  }

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return NextResponse.json(
      { error: "Invalid payment signature" },
      { status: 400 }
    );
  }

  await db
    .update(payments)
    .set({
      status: "success",
      razorpay_payment_id: razorpayPaymentId
    })
    .where(eq(payments.id, payment.id));

  const taskType = payment.task_type;

  if (taskType === "complaint_filing") {
    let complaintId: number | null = null;

    const complaintRows = await db
      .select()
      .from(complaints)
      .where(
        and(
          eq(complaints.user_id, currentUser.id),
          eq(complaints.email_thread_id, payment.razorpay_order_id as string)
        )
      )
      .orderBy(desc(complaints.created_at))
      .limit(1);

    if (complaintRows[0]) {
      complaintId = complaintRows[0].id;
    }

    if (complaintId) {
      try {
        await fulfillComplaint(complaintId);
      } catch (error) {
        console.error("Error fulfilling complaint after payment verification", {
          complaintId,
          error
        });
      }
    }
  } else if (taskType === "rti_drafting") {
    const candidates = await db
      .select()
      .from(rti_requests)
      .where(
        and(
          eq(rti_requests.user_id, currentUser.id),
          eq(rti_requests.status, "draft"),
          gte(rti_requests.created_at, payment.created_at)
        )
      )
      .orderBy(desc(rti_requests.created_at))
      .limit(1);

    const rti = candidates[0] ?? null;

    if (rti) {
      await db
        .update(rti_requests)
        .set({ status: "paid", pdf_url: `/api/rti/${rti.id}/pdf` })
        .where(eq(rti_requests.id, rti.id));

      await fulfillRti(rti.id);
    }
  } else if (taskType === "developer_api_pro") {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (user) {
      const cryptoModule = await import("crypto");
      const apiKey =
        typeof cryptoModule.randomUUID === "function"
          ? cryptoModule.randomUUID()
          : cryptoModule.randomBytes(32).toString("hex");

      await db
        .update(users)
        .set({
          api_key: apiKey,
          api_limit: 100000,
          api_calls_this_month: 0
        })
        .where(eq(users.id, user.id));
    }
  }

  return NextResponse.json({
    success: true,
    message: "Payment verified successfully"
  });
}

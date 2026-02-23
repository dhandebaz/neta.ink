import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { complaints, payments, rti_requests } from "@/db/schema";
import { and, desc, eq, gte, or } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { fulfillComplaint } from "@/lib/fulfillment/complaint";

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const valid = verifyWebhookSignature(rawBody, signature, secret);

  if (!valid) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  let event: any;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload" },
      { status: 400 }
    );
  }

  const eventType = typeof event?.event === "string" ? event.event : "";

  if (eventType !== "payment.captured" && eventType !== "order.paid") {
    return NextResponse.json({ received: true });
  }

  let razorpayOrderId: string | null = null;
  let razorpayPaymentId: string | null = null;
  let notes: any = null;

  if (eventType === "payment.captured") {
    const paymentEntity = event?.payload?.payment?.entity;
    razorpayOrderId = typeof paymentEntity?.order_id === "string" ? paymentEntity.order_id : null;
    razorpayPaymentId = typeof paymentEntity?.id === "string" ? paymentEntity.id : null;
    notes = paymentEntity?.notes ?? null;
  } else if (eventType === "order.paid") {
    const orderEntity = event?.payload?.order?.entity;
    razorpayOrderId = typeof orderEntity?.id === "string" ? orderEntity.id : null;
    notes = orderEntity?.notes ?? null;
  }

  if (!razorpayOrderId && !razorpayPaymentId) {
    return NextResponse.json({ received: true });
  }

  const conditions = [];

  if (razorpayOrderId) {
    conditions.push(eq(payments.razorpay_order_id, razorpayOrderId));
  }

  if (razorpayPaymentId) {
    conditions.push(eq(payments.razorpay_payment_id, razorpayPaymentId));
  }

  if (conditions.length === 0) {
    return NextResponse.json({ received: true });
  }

  const whereCondition =
    conditions.length === 1 ? conditions[0] : or(conditions[0] as any, conditions[1] as any);

  const rows = await db
    .select()
    .from(payments)
    .where(whereCondition)
    .limit(1);

  const payment = rows[0] ?? null;

  if (!payment) {
    return NextResponse.json({ received: true });
  }

  if (payment.status === "pending") {
    await db
      .update(payments)
      .set({
        status: "success",
        razorpay_payment_id: razorpayPaymentId ?? payment.razorpay_payment_id
      })
      .where(eq(payments.id, payment.id));

    const taskType = payment.task_type;

    let explicitComplaintId: number | undefined;
    let explicitRtiRequestId: number | undefined;

    if (notes && typeof notes === "object") {
      const rawComplaintId =
        (notes as any).complaint_id ??
        (notes as any).complaintId ??
        (notes as any).complaint;
      const rawRtiId =
        (notes as any).rti_request_id ??
        (notes as any).rtiId ??
        (notes as any).rti_request;

      if (typeof rawComplaintId === "string" || typeof rawComplaintId === "number") {
        const parsed = Number(rawComplaintId);
        if (Number.isFinite(parsed) && parsed > 0) {
          explicitComplaintId = parsed;
        }
      }

      if (typeof rawRtiId === "string" || typeof rawRtiId === "number") {
        const parsed = Number(rawRtiId);
        if (Number.isFinite(parsed) && parsed > 0) {
          explicitRtiRequestId = parsed;
        }
      }
    }

    if (taskType === "complaint_filing") {
      let complaintId: number | null = null;

      if (explicitComplaintId) {
        complaintId = explicitComplaintId;
      } else if (payment.razorpay_order_id) {
        const complaintRows = await db
          .select()
          .from(complaints)
          .where(
            and(
              eq(complaints.user_id, payment.user_id),
              eq(complaints.email_thread_id, payment.razorpay_order_id)
            )
          )
          .orderBy(desc(complaints.created_at))
          .limit(1);

        if (complaintRows[0]) {
          complaintId = complaintRows[0].id;
        }
      }

      if (complaintId) {
        try {
          await fulfillComplaint(complaintId);
        } catch (error) {
          console.error("Error fulfilling complaint from webhook", {
            complaintId,
            error
          });
        }
      }
    } else if (taskType === "rti_drafting") {
      if (explicitRtiRequestId) {
        await db
          .update(rti_requests)
          .set({ status: "paid" })
          .where(
            and(
              eq(rti_requests.id, explicitRtiRequestId),
              eq(rti_requests.user_id, payment.user_id)
            )
          );
      } else {
        const candidates = await db
          .select()
          .from(rti_requests)
          .where(
            and(
              eq(rti_requests.user_id, payment.user_id),
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
            .set({ status: "paid" })
            .where(eq(rti_requests.id, rti.id));
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

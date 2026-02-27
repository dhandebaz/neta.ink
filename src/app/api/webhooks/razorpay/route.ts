import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db/client";
import { payments, complaints, rti_requests, task_usage } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fulfillComplaint } from "@/lib/fulfillment/complaint";
import { fulfillRti } from "@/lib/fulfillment/rti";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature);
    const receivedBuf = Buffer.from(signature);
    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (!orderId) {
        return NextResponse.json({ received: true });
      }

      // Find payment by razorpay_order_id
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.razorpay_order_id, orderId))
        .limit(1);

      if (payment) {
        if (payment.status === "success") {
          return NextResponse.json({ received: true });
        }

        // Update payment status
        await db
          .update(payments)
          .set({
            status: "success",
            razorpay_payment_id: typeof paymentId === "string" ? paymentId : null
          })
          .where(eq(payments.id, payment.id));

        // Fulfillment logic
        if (payment.task_type === "complaint_filing") {
          // Find matching complaint by email_thread_id = order_id
          const [complaint] = await db
            .select()
            .from(complaints)
            .where(eq(complaints.email_thread_id, orderId))
            .limit(1);

          if (complaint) {
            // Trigger fulfillment (email, etc.)
            await fulfillComplaint(complaint.id).catch((err) => {
              console.error("Error fulfilling complaint:", err);
            });
          }
        } else if (payment.task_type === "rti_drafting") {
          // Find the task usage record to get the RTI ID
          const [usage] = await db
            .select()
            .from(task_usage)
            .where(eq(task_usage.payment_id, payment.id))
            .limit(1);

          if (usage && usage.metadata && typeof usage.metadata === "object" && "rti_id" in usage.metadata) {
            const rtiId = (usage.metadata as { rti_id: number }).rti_id;
            await db
              .update(rti_requests)
              .set({ status: "paid", pdf_url: `/api/rti/${rtiId}/pdf` })
              .where(eq(rti_requests.id, rtiId));

            await fulfillRti(rtiId);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

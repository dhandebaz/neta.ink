import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { createOrder } from "@/lib/razorpay";

export async function POST(_req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const userId = currentUser.id;

  let order;

  try {
    order = await createOrder(1000000, {
      task_type: "developer_api_pro",
      user_id: String(userId)
    });
  } catch (error) {
    console.error("Error creating Razorpay order for Developer API", error);
    return NextResponse.json(
      {
        success: false,
        error: "Payment order creation failed",
        data: null
      },
      { status: 502 }
    );
  }

  const orderId = order.id as string;

  const [payment] = await db
    .insert(payments)
    .values({
      user_id: userId,
      payment_type: "subscription",
      task_type: "developer_api_pro",
      amount: 1000000,
      razorpay_order_id: orderId,
      status: "pending"
    })
    .returning();

  return NextResponse.json({
    success: true,
    data: {
      payment_id: payment.id,
      razorpay_order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    }
  });
}


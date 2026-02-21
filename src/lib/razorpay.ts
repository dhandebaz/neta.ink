import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error("Razorpay credentials are not configured");
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

export async function createOrder(amountPaise: number, notes?: any) {
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    notes
  });

  return order;
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  return Razorpay.validateWebhookSignature(body, signature, secret);
}
